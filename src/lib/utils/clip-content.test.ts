/**
 * TDD tests for clip content utilities
 *
 * Issue 1: splitContentSections consistency
 * Issue 3: Garbage image filtering
 * Issue 4: Thumbnail image quality
 */
import { describe, it, expect } from 'vitest';
import {
  splitContentSections,
  extractImagesFromContent,
  cleanDisplayContent,
} from './clip-content';
import type { ClipContent } from '@/types/database';

// ============================================================================
// Issue 1: splitContentSections consistency
// ============================================================================

describe('splitContentSections', () => {
  it('should split on [[[COMMENTS_SECTION]]] marker', () => {
    const text = [
      'Main body about design.',
      '',
      '[[[COMMENTS_SECTION]]]',
      '',
      'Nice post!',
      '',
      '[[[COMMENT_SPLIT]]]',
      '',
      'Thanks!',
    ].join('\n');

    const result = splitContentSections(text);
    expect(result.body).toContain('Main body about design');
    expect(result.subContent).toBeTruthy();
    expect(result.subContent).toContain('Nice post!');
    expect(result.subContent).toContain('Thanks!');
    // Comments should be separated by horizontal rules
    expect(result.subContent).toContain('---');
  });

  it('should handle text with ONLY body (no comments)', () => {
    const text = 'Just a simple post about design fundamentals and spacing grids.';
    const result = splitContentSections(text);
    expect(result.body).toContain('design fundamentals');
    expect(result.subContent).toBeNull();
  });

  it('should handle Jina === separator with dedup detection', () => {
    const bodyText = 'The science writer explores consciousness in his new book and draws surprising conclusions.';
    const text = `${bodyText}\n\n===\n\n${bodyText}`;
    const result = splitContentSections(text);
    // Should detect duplicate and return single body
    expect(result.body).toContain('science writer');
    expect(result.subContent).toBeNull();
  });

  it('should split on === separator when content is different', () => {
    const text = [
      'Main post about 8px grid system.',
      '',
      '===',
      '',
      'Additional context about design tokens.',
    ].join('\n');
    const result = splitContentSections(text);
    expect(result.body).toContain('8px grid');
    expect(result.subContent).toContain('design tokens');
  });

  it('should split on social comment signatures (Strategy 5)', () => {
    const text = [
      'Main post body with enough content to be meaningful.',
      'This post discusses the importance of design systems.',
      '',
      'user_alpha · 2d',
      'Love this post!',
      '',
      'beta_user · 5h',
      'Super helpful, thanks!',
    ].join('\n');
    const result = splitContentSections(text);
    expect(result.body).toContain('design systems');
    expect(result.subContent).toBeTruthy();
    expect(result.subContent).toContain('Love this post');
  });

  it('should handle trailing short paragraphs (Strategy 6)', () => {
    const text = [
      'This is a comprehensive post about the importance of typography in web design. It covers various aspects including font selection, line height, and spacing.',
      '',
      'Great tip!',
      '',
      'Thanks!',
      '',
      'Bookmarked',
    ].join('\n');
    const result = splitContentSections(text);
    expect(result.body).toContain('typography');
    expect(result.subContent).toBeTruthy();
  });
});

// ============================================================================
// Issue 3: Garbage image filtering
// ============================================================================

describe('extractImagesFromContent — garbage filtering', () => {
  it('should extract images from CLIP_GALLERY comment', () => {
    const content: ClipContent[] = [{
      id: '1',
      clip_id: 'c1',
      content_markdown: 'Some text\n\n<!-- CLIP_GALLERY:https://scontent.cdninstagram.com/img1.jpg|https://scontent.cdninstagram.com/img2.jpg -->',
      raw_markdown: null,
      html_content: null,
      created_at: '',
      updated_at: '',
    }];
    const images = extractImagesFromContent(content);
    expect(images).toHaveLength(2);
    expect(images[0]).toContain('img1.jpg');
    expect(images[1]).toContain('img2.jpg');
  });

  it('should include mainImage at index 0', () => {
    const content: ClipContent[] = [{
      id: '1',
      clip_id: 'c1',
      content_markdown: '<!-- CLIP_GALLERY:https://example.com/img2.jpg -->',
      raw_markdown: null,
      html_content: null,
      created_at: '',
      updated_at: '',
    }];
    const images = extractImagesFromContent(content, 'https://example.com/main.jpg');
    expect(images[0]).toBe('https://example.com/main.jpg');
    expect(images).toHaveLength(2);
  });

  it('should deduplicate images', () => {
    const content: ClipContent[] = [{
      id: '1',
      clip_id: 'c1',
      content_markdown: '![img](https://example.com/a.jpg)\n\n<!-- CLIP_GALLERY:https://example.com/a.jpg|https://example.com/b.jpg -->',
      raw_markdown: null,
      html_content: null,
      created_at: '',
      updated_at: '',
    }];
    const images = extractImagesFromContent(content);
    // a.jpg should appear only once
    expect(images.filter(i => i.includes('a.jpg'))).toHaveLength(1);
  });
});

// ============================================================================
// Issue 4: cleanDisplayContent
// ============================================================================

describe('cleanDisplayContent', () => {
  it('should remove CLIP_GALLERY comments', () => {
    const text = 'Hello world\n\n<!-- CLIP_GALLERY:img1|img2 -->';
    expect(cleanDisplayContent(text)).toBe('Hello world');
  });

  it('should remove markdown images', () => {
    const text = 'Text before\n\n![alt](https://example.com/img.jpg)\n\nText after';
    const result = cleanDisplayContent(text);
    expect(result).not.toContain('![');
    expect(result).toContain('Text before');
    expect(result).toContain('Text after');
  });

  it('should remove standalone Author lines', () => {
    const text = 'Content\nAuthor\nMore content';
    const result = cleanDisplayContent(text);
    expect(result).not.toMatch(/^Author$/m);
  });

  it('should collapse excessive blank lines', () => {
    const text = 'Line 1\n\n\n\n\nLine 2';
    const result = cleanDisplayContent(text);
    expect(result).toBe('Line 1\n\nLine 2');
  });
});
