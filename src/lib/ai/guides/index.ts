import { readFileSync } from 'fs';
import { join } from 'path';

const GUIDE_DIR = join(process.cwd(), 'src/lib/ai/guides');
const cache = new Map<string, string>();

const TYPE_TO_FILE: Record<string, string> = {
  blog_post: 'blog-post.md',
  sns_post: 'sns-post.md',
  newsletter: 'newsletter.md',
  executive_summary: 'executive-summary.md',
  key_concepts: 'key-concepts.md',
  comparison: 'comparison.md',
  teach_back: 'comparison.md',
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
