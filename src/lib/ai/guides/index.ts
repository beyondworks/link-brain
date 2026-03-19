import { readFileSync } from 'fs';
import { join } from 'path';

const GUIDE_DIR = join(process.cwd(), 'src/lib/ai/guides');
const cache = new Map<string, string>();

const TYPE_TO_FILE: Record<string, string> = {
  blog_post: 'blog-post.md',
  threads_post: 'threads-post.md',
  instagram_feed: 'instagram-feed.md',
  newsletter: 'newsletter.md',
  executive_summary: 'executive-summary.md',
  key_concepts: 'key-concepts.md',
  presentation_text: 'presentation-text.md',
  youtube_script: 'youtube-script.md',
};

export function loadGuide(type: string): string {
  const fileName = TYPE_TO_FILE[type];
  if (!fileName) return '';

  if (cache.has(type)) return cache.get(type)!;

  try {
    const content = readFileSync(join(GUIDE_DIR, fileName), 'utf-8');
    cache.set(type, content);
    return content;
  } catch {
    return '';
  }
}
