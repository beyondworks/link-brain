import { describe, it, expect } from 'vitest';
import {
  toMobileUrl,
  toAmpUrl,
  dropWww,
  toOldRedditUrl,
  toNaverMobileUrl,
  extractTweetId,
  extractRedditPost,
} from './url-transforms';

describe('extractTweetId', () => {
  it('extracts id from x.com status URL', () => {
    expect(extractTweetId('https://x.com/jack/status/20')).toBe('20');
  });

  it('extracts id from twitter.com status URL', () => {
    expect(extractTweetId('https://twitter.com/user/status/1234567890123456789')).toBe('1234567890123456789');
  });

  it('extracts id from URL with query string', () => {
    expect(extractTweetId('https://x.com/user/status/999?s=20&t=abc')).toBe('999');
  });

  it('returns null for non-status URLs', () => {
    expect(extractTweetId('https://x.com/user')).toBeNull();
    expect(extractTweetId('https://example.com/status/123')).toBeNull();
  });
});

describe('extractRedditPost', () => {
  it('extracts subreddit and postId from a comments permalink', () => {
    const ref = extractRedditPost('https://www.reddit.com/r/programming/comments/abc123/some_title/');
    expect(ref).toEqual({ subreddit: 'programming', postId: 'abc123' });
  });

  it('works on old.reddit.com', () => {
    const ref = extractRedditPost('https://old.reddit.com/r/rust/comments/xyz789/');
    expect(ref).toEqual({ subreddit: 'rust', postId: 'xyz789' });
  });

  it('returns null for non-comments URLs', () => {
    expect(extractRedditPost('https://www.reddit.com/r/programming/')).toBeNull();
    expect(extractRedditPost('https://example.com/r/x/comments/y/')).not.toBeNull();
  });
});

describe('toMobileUrl', () => {
  it('rewrites www. to m.', () => {
    expect(toMobileUrl('https://www.example.com/page')).toBe('https://m.example.com/page');
  });

  it('prepends m. when no www', () => {
    expect(toMobileUrl('https://example.com/page')).toBe('https://m.example.com/page');
  });

  it('leaves already-mobile hosts unchanged', () => {
    expect(toMobileUrl('https://m.example.com/page')).toBe('https://m.example.com/page');
  });

  it('passes through malformed input', () => {
    expect(toMobileUrl('not a url')).toBe('not a url');
  });
});

describe('toAmpUrl', () => {
  it('appends /amp to a path without trailing slash', () => {
    expect(toAmpUrl('https://example.com/article')).toBe('https://example.com/article/amp');
  });

  it('appends amp/ to a path with trailing slash', () => {
    expect(toAmpUrl('https://example.com/article/')).toBe('https://example.com/article/amp/');
  });

  it('passes through malformed input', () => {
    expect(toAmpUrl('::::')).toBe('::::');
  });
});

describe('dropWww', () => {
  it('removes leading www.', () => {
    expect(dropWww('https://www.example.com/x')).toBe('https://example.com/x');
  });

  it('leaves non-www hosts unchanged', () => {
    expect(dropWww('https://example.com/x')).toBe('https://example.com/x');
  });
});

describe('toOldRedditUrl', () => {
  it('rewrites www.reddit.com to old.reddit.com', () => {
    expect(toOldRedditUrl('https://www.reddit.com/r/x/comments/y/')).toBe('https://old.reddit.com/r/x/comments/y/');
  });

  it('rewrites bare reddit.com to old.reddit.com', () => {
    expect(toOldRedditUrl('https://reddit.com/r/x/')).toBe('https://old.reddit.com/r/x/');
  });

  it('leaves non-reddit URLs unchanged', () => {
    expect(toOldRedditUrl('https://example.com/r/x/')).toBe('https://example.com/r/x/');
  });
});

describe('toNaverMobileUrl', () => {
  it('rewrites blog.naver.com to m.blog.naver.com', () => {
    expect(toNaverMobileUrl('https://blog.naver.com/user/123')).toBe('https://m.blog.naver.com/user/123');
  });

  it('leaves already-mobile naver URLs unchanged', () => {
    expect(toNaverMobileUrl('https://m.blog.naver.com/user/123')).toBe('https://m.blog.naver.com/user/123');
  });

  it('passes through non-naver URLs', () => {
    expect(toNaverMobileUrl('https://example.com/post')).toBe('https://example.com/post');
  });
});
