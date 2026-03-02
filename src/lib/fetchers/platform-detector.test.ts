import { describe, it, expect } from 'vitest';
import { detectPlatform } from './platform-detector';

describe('detectPlatform', () => {
  describe('sourceHint passthrough', () => {
    it('returns sourceHint directly when provided', () => {
      expect(detectPlatform('https://example.com', 'youtube')).toBe('youtube');
    });
  });

  describe('YouTube', () => {
    it('detects youtube.com', () => {
      expect(detectPlatform('https://www.youtube.com/watch?v=abc123')).toBe('youtube');
    });

    it('detects youtu.be short links', () => {
      expect(detectPlatform('https://youtu.be/abc123')).toBe('youtube');
    });
  });

  describe('Twitter / X', () => {
    it('detects twitter.com', () => {
      expect(detectPlatform('https://twitter.com/user/status/123')).toBe('twitter');
    });

    it('detects x.com', () => {
      expect(detectPlatform('https://x.com/user/status/123')).toBe('twitter');
    });

    it('detects t.co redirect links', () => {
      expect(detectPlatform('https://t.co/abc123')).toBe('twitter');
    });
  });

  describe('Instagram', () => {
    it('detects instagram.com', () => {
      expect(detectPlatform('https://www.instagram.com/p/abc123/')).toBe('instagram');
    });

    it('detects instagr.am short links', () => {
      expect(detectPlatform('https://instagr.am/p/abc123/')).toBe('instagram');
    });
  });

  describe('Threads', () => {
    it('detects threads.net', () => {
      expect(detectPlatform('https://www.threads.net/@user/post/abc123')).toBe('threads');
    });

    it('detects l.threads.net redirect links', () => {
      expect(detectPlatform('https://l.threads.net/?u=abc')).toBe('threads');
    });
  });

  describe('Pinterest', () => {
    it('detects pinterest.com', () => {
      expect(detectPlatform('https://www.pinterest.com/pin/123456/')).toBe('pinterest');
    });
  });

  describe('GitHub', () => {
    it('detects github.com', () => {
      expect(detectPlatform('https://github.com/user/repo')).toBe('github');
    });

    it('detects gist.github.com', () => {
      expect(detectPlatform('https://gist.github.com/user/abc123')).toBe('github');
    });
  });

  describe('Reddit', () => {
    it('detects reddit.com', () => {
      expect(detectPlatform('https://www.reddit.com/r/programming/comments/abc/')).toBe('reddit');
    });

    it('detects redd.it short links', () => {
      expect(detectPlatform('https://redd.it/abc123')).toBe('reddit');
    });
  });

  describe('LinkedIn', () => {
    it('detects linkedin.com', () => {
      expect(detectPlatform('https://www.linkedin.com/in/user/')).toBe('linkedin');
    });

    it('detects lnkd.in short links', () => {
      expect(detectPlatform('https://lnkd.in/abc123')).toBe('linkedin');
    });
  });

  describe('Medium', () => {
    it('detects medium.com', () => {
      expect(detectPlatform('https://medium.com/@user/article-title-abc123')).toBe('medium');
    });

    it('detects towardsdatascience.com', () => {
      expect(detectPlatform('https://towardsdatascience.com/some-article')).toBe('medium');
    });
  });

  describe('Substack', () => {
    it('detects substack.com', () => {
      expect(detectPlatform('https://newsletter.substack.com/p/article')).toBe('substack');
    });
  });

  describe('TikTok', () => {
    it('detects tiktok.com', () => {
      expect(detectPlatform('https://www.tiktok.com/@user/video/123456')).toBe('tiktok');
    });

    it('detects vm.tiktok.com short links', () => {
      expect(detectPlatform('https://vm.tiktok.com/abc123/')).toBe('tiktok');
    });
  });

  describe('Naver Blog', () => {
    it('detects blog.naver.com', () => {
      expect(detectPlatform('https://blog.naver.com/user/123456')).toBe('naver');
    });

    it('detects m.blog.naver.com mobile links', () => {
      expect(detectPlatform('https://m.blog.naver.com/user/123456')).toBe('naver');
    });
  });

  describe('web fallback', () => {
    it('returns "web" for unknown URLs', () => {
      expect(detectPlatform('https://example.com/article')).toBe('web');
    });

    it('returns "web" for arbitrary domains', () => {
      expect(detectPlatform('https://mysite.io/blog/post')).toBe('web');
    });
  });

  describe('case insensitivity', () => {
    it('detects platform regardless of URL case', () => {
      expect(detectPlatform('HTTPS://YOUTUBE.COM/WATCH?V=ABC')).toBe('youtube');
    });
  });
});
