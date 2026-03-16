/**
 * Phase 4: Import transformed data into Supabase
 *
 * FK order: categories → clips → clip_contents → collections → clip_collections → tags → clip_tags
 *
 * Upsert pattern for idempotency. Batch size configurable.
 * Run with DRY_RUN=true first.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase-admin';
import { log } from './lib/logger';
import { loadReport, saveReport } from './lib/id-mapping';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

async function upsertBatch<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
  label: string
): Promise<number> {
  if (rows.length === 0) {
    log.info(`${label}: 0 rows, skipping`);
    return 0;
  }

  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    log.progress(Math.min(i + BATCH_SIZE, rows.length), rows.length, label);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from(table)
        .upsert(batch as never[], {
          onConflict,
          ignoreDuplicates: false,
        });

      if (error) {
        log.error(`${label} batch ${i / BATCH_SIZE + 1} failed`, error);
        throw error;
      }
    }

    inserted += batch.length;
  }

  return inserted;
}

async function insertBatchIgnoreDuplicates<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  label: string
): Promise<number> {
  if (rows.length === 0) {
    log.info(`${label}: 0 rows, skipping`);
    return 0;
  }

  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    log.progress(Math.min(i + BATCH_SIZE, rows.length), rows.length, label);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from(table)
        .upsert(batch as never[], {
          ignoreDuplicates: true,
        });

      if (error) {
        log.error(`${label} batch ${i / BATCH_SIZE + 1} failed: ${error.message} [${error.code}] ${error.details || ''} ${error.hint || ''}`);
        throw error;
      }
    }

    inserted += batch.length;
  }

  return inserted;
}

async function main(): Promise<void> {
  log.divider(`Phase 4: Import to Supabase ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

  const transformedPath = path.resolve(__dirname, 'data', 'transformed.json');
  if (!fs.existsSync(transformedPath)) {
    log.error('transformed.json not found. Run 02-transform.ts first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(transformedPath, 'utf-8'));

  // 1. Categories (FK: user_id → users)
  log.info('Importing categories...');
  const catCount = await upsertBatch(
    'categories',
    data.categories,
    'id',
    'Categories'
  );
  log.success(`Categories: ${catCount}`);

  // 2. Clips (FK: user_id → users, category_id → categories)
  log.info('Importing clips...');
  const clipCount = await upsertBatch(
    'clips',
    data.clips,
    'id',
    'Clips'
  );
  log.success(`Clips: ${clipCount}`);

  // 3. Clip contents (FK: clip_id → clips)
  log.info('Importing clip contents...');
  const contentCount = await upsertBatch(
    'clip_contents',
    data.clipContents,
    'clip_id',
    'Clip contents'
  );
  log.success(`Clip contents: ${contentCount}`);

  // 4. Collections (FK: user_id → users)
  log.info('Importing collections...');
  const colCount = await upsertBatch(
    'collections',
    data.collections,
    'id',
    'Collections'
  );
  log.success(`Collections: ${colCount}`);

  // 5. Clip-collection junction
  log.info('Importing clip-collection links...');
  const ccCount = await insertBatchIgnoreDuplicates(
    'clip_collections',
    data.clipCollections,
    'Clip-collections'
  );
  log.success(`Clip-collection links: ${ccCount}`);

  // 6. Tags — insert by name only (let DB assign IDs), then resolve
  log.info('Importing tags...');
  const tagNames: string[] = data.tags.map((t: { name: string }) => t.name);
  let tagCount = tagNames.length;

  if (!DRY_RUN) {
    // Insert tags with only name, ON CONFLICT (name) DO NOTHING
    for (let i = 0; i < tagNames.length; i += BATCH_SIZE) {
      const batch = tagNames.slice(i, i + BATCH_SIZE);
      log.progress(Math.min(i + BATCH_SIZE, tagNames.length), tagNames.length, 'Tags insert');

      const rows = batch.map((name) => ({ name }));
      const { error } = await supabase
        .from('tags')
        .upsert(rows as never[], { onConflict: 'name', ignoreDuplicates: true });

      if (error) {
        log.error(`Tags batch failed: ${error.message}`, error);
        throw error;
      }
    }

    // Query ALL tags from DB to build name → actual ID mapping
    // Use small batches (50) to avoid URL length limits with Korean text
    log.info('Resolving tag IDs from DB...');
    const tagNameToDbId = new Map<string, string>();
    const TAG_RESOLVE_BATCH = 50;

    for (let i = 0; i < tagNames.length; i += TAG_RESOLVE_BATCH) {
      const batch = tagNames.slice(i, i + TAG_RESOLVE_BATCH);
      log.progress(Math.min(i + TAG_RESOLVE_BATCH, tagNames.length), tagNames.length, 'Tag resolve');

      const { data: dbTags, error: tagErr } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', batch);

      if (tagErr) {
        log.warn(`Tag resolve batch failed: ${tagErr.message}`);
        continue;
      }

      if (dbTags) {
        for (const t of dbTags) {
          tagNameToDbId.set(t.name, t.id);
        }
      }
    }
    log.info(`Resolved ${tagNameToDbId.size} tag IDs from DB`);

    // Build generated-id → db-id mapping
    const generatedIdToDbId = new Map<string, string>();
    for (const tag of data.tags as Array<{ id: string; name: string }>) {
      const dbId = tagNameToDbId.get(tag.name);
      if (dbId) {
        generatedIdToDbId.set(tag.id, dbId);
      }
    }

    // Remap ALL clip_tags to use actual DB tag IDs
    log.info(`Remapping clip_tags to actual DB tag IDs...`);
    for (const ct of data.clipTags as Array<{ clip_id: string; tag_id: string }>) {
      const dbId = generatedIdToDbId.get(ct.tag_id);
      if (dbId) ct.tag_id = dbId;
    }
  } else {
    log.progress(tagCount, tagCount, 'Tags');
  }
  log.success(`Tags: ${tagCount}`);

  // 7. Clip-tag junction
  log.info('Importing clip-tag links...');
  const ctCount = await insertBatchIgnoreDuplicates(
    'clip_tags',
    data.clipTags,
    'Clip-tags'
  );
  log.success(`Clip-tag links: ${ctCount}`);

  // Update report
  const report = loadReport();
  report.importedAt = new Date().toISOString();
  report.counts.supabaseClips = clipCount;
  report.counts.supabaseCollections = colCount;
  report.counts.supabaseCategories = catCount;
  report.migratedClipIds = data.clips.map((c: { id: string }) => c.id);
  report.migratedCollectionIds = data.collections.map((c: { id: string }) => c.id);
  report.migratedCategoryIds = data.categories.map((c: { id: string }) => c.id);
  saveReport(report);

  log.divider('Import Summary');
  log.info(`Categories:          ${catCount}`);
  log.info(`Clips:               ${clipCount}`);
  log.info(`Clip contents:       ${contentCount}`);
  log.info(`Collections:         ${colCount}`);
  log.info(`Clip-collection:     ${ccCount}`);
  log.info(`Tags:                ${tagCount}`);
  log.info(`Clip-tag:            ${ctCount}`);

  if (DRY_RUN) {
    log.warn('DRY RUN complete. Run with DRY_RUN=false to apply changes.');
  }

  log.success('Phase 4 complete.');
}

main().catch((err) => {
  log.error('Import failed', err);
  process.exit(1);
});
