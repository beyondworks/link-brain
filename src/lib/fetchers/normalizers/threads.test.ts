/**
 * TDD tests for Threads normalization pipeline
 *
 * Issue 1: Double normalization corrupts [[[COMMENTS_SECTION]]] markers
 * Issue 3: Garbage images from feed/comments
 * Issue 4: Thumbnail resolution — low-res image detection
 */
import { describe, it, expect } from 'vitest';
import { normalizeThreads, detectAndSplitComments } from './threads';

// ============================================================================
// Issue 1: Double normalization
// ============================================================================

describe('normalizeThreads — double invocation', () => {
  const rawThreadsContent = [
    'The science writer delves into consciousness in his new book.',
    '',
    'Comments (3)',
    '',
    'user1 · 2d',
    'Amazing insights!',
    '',
    'user2 · 1d',
    'Must read this book',
    '',
    'user3 · 5h',
    'Fascinating topic',
  ].join('\n');

  it('should produce [[[COMMENTS_SECTION]]] marker on first call', () => {
    const result = normalizeThreads(rawThreadsContent, { authorHandle: 'testauthor' });
    expect(result).toContain('[[[COMMENTS_SECTION]]]');
  });

  it('should NOT corrupt markers when called twice (current bug)', () => {
    const first = normalizeThreads(rawThreadsContent, { authorHandle: 'testauthor' });
    expect(first).toContain('[[[COMMENTS_SECTION]]]');

    // Second normalization (simulating applyThreadsNormalization)
    const second = normalizeThreads(first, { authorHandle: 'testauthor' });

    // The markers should survive — this CURRENTLY FAILS
    expect(second).toContain('[[[COMMENTS_SECTION]]]');
  });

  it('should preserve body content through double normalization', () => {
    const first = normalizeThreads(rawThreadsContent, { authorHandle: 'testauthor' });
    const second = normalizeThreads(first, { authorHandle: 'testauthor' });

    // Body text should remain intact
    expect(second).toContain('science writer');
    expect(second).toContain('consciousness');
  });
});

describe('normalizeThreads — pattern-based comment detection', () => {
  const contentWithPatternComments = [
    'designnas_official posted about design fundamentals and the rule of 8px grid.',
    '',
    'All dimensions should be multiples of 8 for consistent spacing.',
    '',
    'user_a · 2025-12-03',
    'This is so helpful!',
    '',
    'user_b · 3d',
    'Great design tip',
    '',
    'random_user · 1w',
    'Thanks for sharing',
  ].join('\n');

  it('should detect comments from non-author signatures', () => {
    const result = normalizeThreads(contentWithPatternComments, {
      authorHandle: 'designnas_official',
    });
    expect(result).toContain('[[[COMMENTS_SECTION]]]');
    // Body should contain the design content
    expect(result).toContain('design fundamentals');
    expect(result).toContain('multiples of 8');
  });

  it('should NOT include comment text in body', () => {
    const result = normalizeThreads(contentWithPatternComments, {
      authorHandle: 'designnas_official',
    });
    const [body] = result.split('[[[COMMENTS_SECTION]]]');
    expect(body).not.toContain('This is so helpful');
    expect(body).not.toContain('Great design tip');
  });
});

// ============================================================================
// Issue 1b: idempotency — normalizeThreads should be safe to call once
// ============================================================================

describe('normalizeThreads — idempotency for already-normalized text', () => {
  it('should preserve markers in already-normalized text', () => {
    // Simulates text that was already normalized (has markers)
    const alreadyNormalized = [
      'This is the main body content about design.',
      '',
      '[[[COMMENTS_SECTION]]]',
      '',
      'Nice post!',
      '',
      '[[[COMMENT_SPLIT]]]',
      '',
      'Thanks for sharing',
    ].join('\n');

    const result = normalizeThreads(alreadyNormalized, { authorHandle: 'someone' });

    // Should still have the body content
    expect(result).toContain('main body content');
    // Markers should not be destroyed
    expect(result).toContain('[[[COMMENTS_SECTION]]]');
  });
});

// ============================================================================
// detectAndSplitComments
// ============================================================================

describe('detectAndSplitComments', () => {
  it('should detect comments with "username · timestamp" signatures', () => {
    const text = [
      'Main post about consciousness and the nature of reality.',
      'This is a long paragraph that serves as the body of the post.',
      '',
      'commenter1 · 2d',
      'Great article!',
      '',
      'commenter2 · 1w',
      'Very insightful',
    ].join('\n');

    const result = detectAndSplitComments(text, 'original_author');
    expect(result.commentsRaw).toBeTruthy();
    expect(result.body).toContain('consciousness');
    expect(result.body).not.toContain('Great article');
  });

  it('should NOT split when author handle matches commenter', () => {
    const text = [
      'Main post content that is long enough to be considered body text.',
      '',
      'myhandle · 2d',
      'My own reply to my post',
      '',
      'myhandle · 1d',
      'Another self-reply',
    ].join('\n');

    const result = detectAndSplitComments(text, 'myhandle');
    // All signatures belong to author, so no split
    expect(result.commentsRaw).toBe('');
  });

  it('should require body >= 50 chars to split', () => {
    const text = [
      'Short body.',
      '',
      'user1 · 2d',
      'Comment 1',
      '',
      'user2 · 1d',
      'Comment 2',
    ].join('\n');

    const result = detectAndSplitComments(text, 'author');
    // Body too short, should not split
    expect(result.commentsRaw).toBe('');
  });
});
