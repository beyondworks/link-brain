/**
 * Phase 2: Transform Firebase data to Supabase schema
 *
 * Input:  data/firebase-export.json + data/user-id-map.json
 * Output: data/transformed.json
 *
 * Run AFTER 03-migrate-users.ts (needs user-id-map.json).
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { firebaseIdToUuid, loadUserIdMap, loadReport, saveReport } from './lib/id-mapping';
import { log } from './lib/logger';

// --- Firebase types (from export) ---
interface FirebaseClip {
  id: string;
  url: string;
  platform: string;
  title: string;
  summary: string;
  keywords: string[];
  category: string;
  sentiment: string;
  type: string;
  image: string | null;
  author: string;
  authorProfile?: { handle?: string; avatar?: string };
  template?: string;
  notes?: string;
  htmlContent?: string;
  rawMarkdown?: string;
  contentMarkdown?: string;
  contentHtml?: string;
  images?: string[];
  collectionIds?: string[];
  viewCount?: number;
  likeCount?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
  isPrivate?: boolean;
  publishDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

interface FirebaseCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  clipIds?: string[];
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

interface FirebaseCategory {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

// --- Supabase target types ---
interface SupabaseClip {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  summary: string | null;
  image: string | null;
  platform: string;
  author: string | null;
  author_handle: string | null;
  author_avatar: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_public: boolean;
  category_id: string | null;
  views: number;
  likes_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseClipContent {
  clip_id: string;
  html_content: string | null;
  content_markdown: string | null;
  raw_markdown: string | null;
}

interface SupabaseCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseCategory {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SupabaseClipCollection {
  clip_id: string;
  collection_id: string;
}

interface SupabaseTag {
  id: string;
  name: string;
}

interface SupabaseClipTag {
  clip_id: string;
  tag_id: string;
}

// Normalized platform mapping
const PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  instagram: 'instagram',
  threads: 'web', // v2 doesn't have 'threads' in CHECK constraint; map to 'web'
  web: 'web',
  twitter: 'twitter',
  github: 'github',
  medium: 'medium',
  substack: 'substack',
  reddit: 'reddit',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
};

function normalizePlatform(p: string): string {
  return PLATFORM_MAP[p?.toLowerCase()] || 'other';
}

async function main(): Promise<void> {
  log.divider('Phase 2: Transform Data');

  // Load inputs
  const exportPath = path.resolve(__dirname, 'data', 'firebase-export.json');
  if (!fs.existsSync(exportPath)) {
    log.error('firebase-export.json not found. Run 01-export-firebase.ts first.');
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  const userIdMap = loadUserIdMap();

  const firebaseClips: FirebaseClip[] = exportData.clips;
  const firebaseCollections: FirebaseCollection[] = exportData.collections;
  const firebaseCategories: FirebaseCategory[] = exportData.categories;

  // Build category name → UUID map per user
  // Key: `${firebaseUid}::${categoryName}` → supabase category UUID
  const categoryLookup = new Map<string, string>();

  // --- Transform Categories ---
  log.info('Transforming categories...');
  const categories: SupabaseCategory[] = [];
  let catSortOrder = 0;

  for (const fc of firebaseCategories) {
    if (!fc.userId || !userIdMap[fc.userId]) {
      log.warn(`Category "${fc.name}" skipped: unknown userId ${fc.userId}`);
      continue;
    }

    const catId = firebaseIdToUuid(fc.id);
    const publicUserId = userIdMap[fc.userId].publicUserId;

    categories.push({
      id: catId,
      user_id: publicUserId,
      name: fc.name,
      color: fc.color || null,
      sort_order: catSortOrder++,
      created_at: fc.createdAt || new Date().toISOString(),
      updated_at: fc.updatedAt || new Date().toISOString(),
    });

    categoryLookup.set(`${fc.userId}::${fc.name}`, catId);
  }
  log.success(`Categories: ${categories.length} transformed`);

  // --- Transform Collections ---
  log.info('Transforming collections...');
  const collections: SupabaseCollection[] = [];
  // Firebase collection ID → Supabase collection UUID
  const collectionIdMap = new Map<string, string>();

  for (const fcol of firebaseCollections) {
    if (!fcol.userId || !userIdMap[fcol.userId]) {
      log.warn(`Collection "${fcol.name}" skipped: unknown userId ${fcol.userId}`);
      continue;
    }

    const colId = firebaseIdToUuid(fcol.id);
    const publicUserId = userIdMap[fcol.userId].publicUserId;

    collections.push({
      id: colId,
      user_id: publicUserId,
      name: fcol.name,
      description: fcol.description || null,
      color: fcol.color || null,
      is_public: fcol.isPublic ?? false,
      created_at: fcol.createdAt || new Date().toISOString(),
      updated_at: fcol.updatedAt || new Date().toISOString(),
    });

    collectionIdMap.set(fcol.id, colId);
  }
  log.success(`Collections: ${collections.length} transformed`);

  // --- Transform Clips ---
  log.info('Transforming clips...');
  const clips: SupabaseClip[] = [];
  const clipContents: SupabaseClipContent[] = [];
  const clipCollections: SupabaseClipCollection[] = [];
  const tagRegistry = new Map<string, string>(); // tag name → UUID
  const clipTags: SupabaseClipTag[] = [];
  let skippedClips = 0;

  for (const fc of firebaseClips) {
    if (!fc.userId || !userIdMap[fc.userId]) {
      skippedClips++;
      continue;
    }

    const clipId = firebaseIdToUuid(fc.id);
    const publicUserId = userIdMap[fc.userId].publicUserId;

    // Resolve category
    let categoryId: string | null = null;
    if (fc.category) {
      categoryId = categoryLookup.get(`${fc.userId}::${fc.category}`) || null;
    }

    clips.push({
      id: clipId,
      user_id: publicUserId,
      url: fc.url,
      title: fc.title || null,
      summary: fc.summary || null,
      image: fc.image || null,
      platform: normalizePlatform(fc.platform),
      author: fc.author || null,
      author_handle: fc.authorProfile?.handle || null,
      author_avatar: fc.authorProfile?.avatar || null,
      is_favorite: fc.isFavorite ?? false,
      is_archived: fc.isArchived ?? false,
      is_public: fc.isPrivate !== undefined ? !fc.isPrivate : false,
      category_id: categoryId,
      views: fc.viewCount ?? 0,
      likes_count: fc.likeCount ?? 0,
      notes: fc.notes || null,
      created_at: fc.createdAt || new Date().toISOString(),
      updated_at: fc.updatedAt || new Date().toISOString(),
    });

    // Clip contents
    const hasContent = fc.htmlContent || fc.contentMarkdown || fc.rawMarkdown || fc.contentHtml;
    if (hasContent) {
      clipContents.push({
        clip_id: clipId,
        html_content: fc.htmlContent || fc.contentHtml || null,
        content_markdown: fc.contentMarkdown || null,
        raw_markdown: fc.rawMarkdown || null,
      });
    }

    // Collection junction
    if (fc.collectionIds?.length) {
      for (const fireColId of fc.collectionIds) {
        const supaColId = collectionIdMap.get(fireColId);
        if (supaColId) {
          clipCollections.push({ clip_id: clipId, collection_id: supaColId });
        }
      }
    }

    // Tags from keywords
    if (fc.keywords?.length) {
      for (const keyword of fc.keywords) {
        const normalizedTag = keyword.trim().toLowerCase();
        if (!normalizedTag) continue;

        if (!tagRegistry.has(normalizedTag)) {
          tagRegistry.set(normalizedTag, firebaseIdToUuid(`tag::${normalizedTag}`));
        }
        clipTags.push({
          clip_id: clipId,
          tag_id: tagRegistry.get(normalizedTag)!,
        });
      }
    }
  }

  if (skippedClips > 0) {
    log.warn(`Skipped ${skippedClips} clips with unknown userId`);
  }
  log.success(`Clips: ${clips.length} transformed`);
  log.info(`  Clip contents: ${clipContents.length}`);
  log.info(`  Clip-collection links: ${clipCollections.length}`);
  log.info(`  Tags: ${tagRegistry.size}, clip-tag links: ${clipTags.length}`);

  // Build tags array
  const tags: SupabaseTag[] = Array.from(tagRegistry.entries()).map(([name, id]) => ({
    id,
    name,
  }));

  // --- Write output ---
  const transformed = {
    transformedAt: new Date().toISOString(),
    categories,
    collections,
    clips,
    clipContents,
    clipCollections,
    tags,
    clipTags,
  };

  const outPath = path.resolve(__dirname, 'data', 'transformed.json');
  fs.writeFileSync(outPath, JSON.stringify(transformed, null, 2), 'utf-8');

  log.success(`Transformed data written to ${outPath}`);

  // Update report
  const report = loadReport();
  report.transformedAt = new Date().toISOString();
  saveReport(report);

  log.success('Phase 2 complete.');
}

main().catch((err) => {
  log.error('Transform failed', err);
  process.exit(1);
});
