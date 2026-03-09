/**
 * Tests for Instagram content cleaning pipeline
 *
 * Verifies that cleanInstagramContent removes all noise
 * (UI elements, comments, metadata) while preserving caption text.
 */
import { describe, it, expect } from 'vitest';
import { cleanInstagramContent, removeInstagramComments, extractCaptionFromMeta, extractAuthorFromMeta } from './instagram-fetcher';

// ─── User's exact sample (from bug report) ─────────────────────────────────

const NOISY_SAMPLE = `Log In

Sign Up

username_here

![](https://scontent.cdninstagram.com/image.jpg)

username_here•Follow

진짜 영업비밀 7가지 절대법칙

저와 기획/제작 을 함께하고 싶다면

댓글에 '떡상공식' 이라고 남겨주세요!

Original audio

15w

user1
좋은 정보 감사합니다
View all 3 replies

user2
대박이네요
View all 2 replies

42 likes

Log in to like or comment.

More posts from username_here
some_user1 some_user2 some_user3`;

const EXPECTED_CAPTION = `진짜 영업비밀 7가지 절대법칙

저와 기획/제작 을 함께하고 싶다면

댓글에 '떡상공식' 이라고 남겨주세요!`;

describe('cleanInstagramContent', () => {
  it('should extract only caption from noisy Jina output', () => {
    const result = cleanInstagramContent(NOISY_SAMPLE);
    expect(result).toBe(EXPECTED_CAPTION);
  });

  it('should remove "Log in" and "Sign up" lines', () => {
    const input = 'Log In\nSign Up\n안녕하세요 여러분';
    const result = cleanInstagramContent(input);
    expect(result).toBe('안녕하세요 여러분');
  });

  it('should remove "More posts from" and everything after', () => {
    const input = '이것은 캡션 텍스트입니다\n\nMore posts from someuser\nrelated post 1\nrelated post 2';
    const result = cleanInstagramContent(input);
    expect(result).toBe('이것은 캡션 텍스트입니다');
  });

  it('should remove "Log in to like or comment" and everything after', () => {
    const input = '캡션 텍스트 여기\n\nLog in to like or comment.\nfooter stuff';
    const result = cleanInstagramContent(input);
    expect(result).toBe('캡션 텍스트 여기');
  });

  it('should remove markdown images', () => {
    const input = '![alt](https://example.com/img.jpg)\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove bare URLs', () => {
    const input = 'https://example.com/some/path\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove standalone usernames', () => {
    const input = 'some_user123\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove username•Follow pattern', () => {
    const input = 'creator_name•Follow\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove "Original audio" and reel UI', () => {
    const input = '좋은 내용입니다\nOriginal audio\nReels';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove date lines (English and Korean)', () => {
    const input = 'January 15, 2026\n좋은 내용입니다\n2026년 1월 15일';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove engagement counts', () => {
    const input = '42 likes\n10 comments\n1,234 views\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove time-ago lines (Korean and English)', () => {
    const input = '15w\n3일 전\n2 hours ago\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove Instagram UI action words', () => {
    const input = 'Like\nComment\nShare\nSave\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove Korean UI action words', () => {
    const input = '좋아요\n댓글\n공유\n저장\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove separator lines', () => {
    const input = '===\n---\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove username lists', () => {
    const input = 'miro_kang tans_kr haeso_seongsu\n좋은 내용입니다';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove Edited metadata', () => {
    const input = '캡션 Edited•15w 텍스트';
    const result = cleanInstagramContent(input);
    expect(result).toBe('캡션  텍스트');
  });

  it('should preserve long multi-line captions', () => {
    const longCaption = '이것은 긴 캡션입니다. 여러 줄에 걸쳐서 작성되었고,\n충분히 긴 내용을 담고 있습니다.\n\n두 번째 단락도 있습니다.';
    const input = `Log In\nSign Up\n${longCaption}\nMore posts from user`;
    const result = cleanInstagramContent(input);
    expect(result).toBe(longCaption);
  });

  it('should handle empty input', () => {
    expect(cleanInstagramContent('')).toBe('');
  });

  it('should handle caption-only input (no noise)', () => {
    const caption = '깨끗한 캡션 텍스트입니다';
    expect(cleanInstagramContent(caption)).toBe(caption);
  });

  it('should remove footer links (About, Help, etc.)', () => {
    const input = '좋은 내용입니다\nAbout\nHelp\nPress\nAPI\nJobs\nPrivacy\nTerms';
    const result = cleanInstagramContent(input);
    expect(result).toBe('좋은 내용입니다');
  });

  it('should remove "View all N comments" lines and preceding comment lines', () => {
    const longCaption = '이것은 긴 캡션입니다. 여러 줄에 걸쳐 작성되었고 충분히 긴 내용을 담고 있어서 80자를 넘깁니다. 댓글이 아닌 실제 본문입니다.';
    const input = `${longCaption}\nuser1\n짧은 댓글\nView all 42 comments`;
    const result = cleanInstagramContent(input);
    expect(result).toBe(longCaption);
  });
});

describe('extractCaptionFromMeta', () => {
  it('should extract caption from Instagram title with quotes', () => {
    const title = '윤치상ㅣ퍼스널&비즈니스 성장 기획 on Instagram: "진짜 영업비밀🤫 7가지 절대법칙\n\n저와 기획/제작 을 함께하고 싶다면\n댓글에 \'떡상공식\' 이라고 남겨주세요!"';
    const result = extractCaptionFromMeta(title);
    expect(result).toContain('진짜 영업비밀');
    expect(result).toContain('떡상공식');
  });

  it('should extract caption from description when title has no caption', () => {
    const description = '2,387 likes, 4,316 comments - pm_yoonchisang on November 23, 2025: "진짜 영업비밀🤫 7가지 절대법칙"';
    const result = extractCaptionFromMeta(undefined, description);
    expect(result).toContain('진짜 영업비밀');
  });

  it('should return empty string when no caption found', () => {
    expect(extractCaptionFromMeta(undefined, undefined)).toBe('');
    expect(extractCaptionFromMeta('Short', 'Short')).toBe('');
  });
});

describe('extractAuthorFromMeta', () => {
  it('should extract author from description pattern', () => {
    const description = '2,387 likes, 4,316 comments - pm_yoonchisang on November 23, 2025: "caption"';
    const result = extractAuthorFromMeta(description);
    expect(result.author).toBe('pm_yoonchisang');
    expect(result.authorHandle).toBe('@pm_yoonchisang');
  });

  it('should extract author from title with (@handle) pattern', () => {
    const title = '윤치상 (@pm_yoonchisang) • Instagram reel';
    const result = extractAuthorFromMeta(undefined, title);
    expect(result.author).toBe('pm_yoonchisang');
    expect(result.authorHandle).toBe('@pm_yoonchisang');
  });

  it('should extract author from Korean title pattern (Instagram의 username님)', () => {
    const title = 'Instagram의 pm_yoonchisang님';
    const result = extractAuthorFromMeta(undefined, title);
    expect(result.author).toBe('pm_yoonchisang');
    expect(result.authorHandle).toBe('@pm_yoonchisang');
  });

  it('should extract author from English title pattern (username on Instagram)', () => {
    const title = '윤치상ㅣ퍼스널&비즈니스 성장 기획 on Instagram: "캡션"';
    const result = extractAuthorFromMeta(undefined, title);
    expect(result.author).toBe('윤치상ㅣ퍼스널&비즈니스 성장 기획');
  });

  it('should extract author from URL path', () => {
    const result = extractAuthorFromMeta(undefined, undefined, 'https://www.instagram.com/pm_yoonchisang/reel/DRZyxOrEslp/');
    expect(result.author).toBe('pm_yoonchisang');
    expect(result.authorHandle).toBe('@pm_yoonchisang');
  });

  it('should extract author from /p/ URL path', () => {
    const result = extractAuthorFromMeta(undefined, undefined, 'https://www.instagram.com/some_user/p/ABC123/');
    expect(result.author).toBe('some_user');
    expect(result.authorHandle).toBe('@some_user');
  });

  it('should return empty when no author found', () => {
    const result = extractAuthorFromMeta(undefined, undefined);
    expect(result.author).toBeUndefined();
    expect(result.authorHandle).toBeUndefined();
  });
});

describe('removeInstagramComments', () => {
  it('should remove comment blocks (username + text + "View all" marker)', () => {
    const input = [
      '캡션 텍스트',
      'user1',
      'Nice post!',
      'View all 3 replies',
      'user2',
      'Great content',
      'View all 5 replies',
    ].join('\n');
    const result = removeInstagramComments(input);
    expect(result.trim()).toBe('캡션 텍스트');
  });

  it('should not remove long lines before "View all" (likely caption)', () => {
    const longLine = '이것은 매우 긴 캡션으로, 80자를 초과하는 텍스트입니다. 댓글이 아닌 실제 본문 내용이므로 삭제되면 안 됩니다. 이렇게 길어야 합니다.';
    const input = [
      longLine,
      'user1',
      'comment text',
      'View all 2 replies',
    ].join('\n');
    const result = removeInstagramComments(input);
    expect(result).toContain(longLine);
  });

  it('should handle Korean comment markers', () => {
    const input = [
      '캡션 텍스트입니다',
      'user1',
      '좋은 글이네요',
      '댓글 5개 모두 보기',
    ].join('\n');
    const result = removeInstagramComments(input);
    expect(result.trim()).toBe('캡션 텍스트입니다');
  });

  it('should return unchanged text if no comment markers found', () => {
    const input = '그냥 캡션\n여러 줄로 된 내용';
    expect(removeInstagramComments(input)).toBe(input);
  });
});
