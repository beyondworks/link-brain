/**
 * TDD tests for image filtering and thumbnail selection
 *
 * Issue 3: Garbage images from feed/comments
 * Issue 4: Thumbnail resolution
 */
import { describe, it, expect } from 'vitest';
import { extractImagesFromHtml, extractImagesFromMarkdown } from './utils';

// ============================================================================
// Issue 3: extractImagesFromHtml — profile/small image filtering
// ============================================================================

describe('extractImagesFromHtml', () => {
  it('should extract scontent CDN URLs from HTML', () => {
    const html = `
      <img src="https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-15/image1.jpg" />
      <img src="https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-15/image2.jpg" />
    `;
    const images = extractImagesFromHtml(html);
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter out profile pictures (s150x150 pattern)', () => {
    const html = `
      <img src="https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-19/s150x150/profile.jpg" />
      <img src="https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-15/content.jpg" />
    `;
    const images = extractImagesFromHtml(html);
    expect(images.every(i => !i.includes('s150x150'))).toBe(true);
  });

  it('should filter out p-prefixed small thumbnails (p150x150 pattern)', () => {
    const html = `
      <img src="https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-19/p150x150/small.jpg" />
      <img src="https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-15/large.jpg" />
    `;
    const images = extractImagesFromHtml(html);
    expect(images.every(i => !i.includes('p150x150'))).toBe(true);
  });

  it('should deduplicate identical URLs', () => {
    const url = 'https://scontent-nrt1-1.cdninstagram.com/v/t51.2885-15/same.jpg';
    const html = `<img src="${url}" /><img src="${url}" />`;
    const images = extractImagesFromHtml(html);
    expect(images).toHaveLength(1);
  });
});

// ============================================================================
// Issue 3: extractImagesFromMarkdown — no filtering yet
// ============================================================================

describe('extractImagesFromMarkdown', () => {
  it('should extract markdown image URLs', () => {
    const md = '![alt1](https://example.com/img1.jpg)\n![alt2](https://example.com/img2.jpg)';
    const images = extractImagesFromMarkdown(md);
    expect(images).toHaveLength(2);
  });

  it('should handle mixed content with non-image markdown', () => {
    const md = 'Some text\n\n![img](https://example.com/pic.jpg)\n\nMore text';
    const images = extractImagesFromMarkdown(md);
    expect(images).toHaveLength(1);
    expect(images[0]).toBe('https://example.com/pic.jpg');
  });
});

// ============================================================================
// Issue 4: Thumbnail selection helpers
// ============================================================================

describe('thumbnail selection — isLikelyProfile patterns', () => {
  // These test the patterns used in clip-service.ts for thumbnail selection
  const isLikelyProfile = (u: string) =>
    /s\d{2,3}x\d{2,3}/.test(u) || /t51\.2885-19/.test(u);

  // Extended version that also catches p-prefix patterns
  const isLowQualityThumbnail = (u: string) =>
    /[/]s\d{2,3}x\d{2,3}[/]/.test(u) ||
    /[/]p\d{2,3}x\d{2,3}[/]/.test(u) ||
    /t51\.2885-19/.test(u);

  it('should detect s150x150 profile pattern', () => {
    const url = 'https://scontent.cdninstagram.com/v/t51.2885-19/s150x150/profile.jpg';
    expect(isLikelyProfile(url)).toBe(true);
  });

  it('should detect t51.2885-19 profile path', () => {
    const url = 'https://scontent.cdninstagram.com/v/t51.2885-19/12345_profile.jpg';
    expect(isLikelyProfile(url)).toBe(true);
  });

  it('should NOT flag content images (t51.2885-15)', () => {
    const url = 'https://scontent.cdninstagram.com/v/t51.2885-15/content_image.jpg';
    expect(isLikelyProfile(url)).toBe(false);
  });

  it('current isLikelyProfile MISSES p150x150 on content path (bug)', () => {
    // p-prefix small thumbnail on a NON-profile path (t51.2885-15, not -19)
    const url = 'https://scontent.cdninstagram.com/v/t51.2885-15/p150x150/small_thumb.jpg';
    // Current implementation: s-prefix only → misses p-prefix
    expect(isLikelyProfile(url)).toBe(false); // This is the bug!
    // Extended version catches it
    expect(isLowQualityThumbnail(url)).toBe(true);
  });

  it('extended filter should NOT flag large content images', () => {
    const url = 'https://scontent.cdninstagram.com/v/t51.2885-15/e35/large_content.jpg';
    expect(isLowQualityThumbnail(url)).toBe(false);
  });

  it('should prefer high-res when selecting thumbnail', () => {
    const images = [
      'https://scontent.cdninstagram.com/v/t51.2885-19/s150x150/profile.jpg',
      'https://scontent.cdninstagram.com/v/t51.2885-15/content1.jpg',
      'https://scontent.cdninstagram.com/v/t51.2885-15/content2.jpg',
    ];

    // Simulate thumbnail selection — skip low quality
    const thumbnail = images.find(u => !isLowQualityThumbnail(u)) ?? images[0];
    expect(thumbnail).toContain('content1.jpg');
  });
});
