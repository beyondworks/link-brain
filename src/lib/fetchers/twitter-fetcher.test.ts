import { describe, it, expect, vi, afterEach } from 'vitest';
import { TwitterFetcher } from './twitter-fetcher';

const jsonResponse = (obj: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(obj),
  json: async () => obj,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TwitterFetcher — tweet-result', () => {
  it('parses syndication tweet-result JSON into a success result', async () => {
    const tweet = {
      text: 'Hello world — this is the tweet body that we want to extract.',
      user: {
        name: 'Jane Doe',
        screen_name: 'jane',
        profile_image_url_https: 'https://pbs.twimg.com/jane.jpg',
      },
      photos: [{ url: 'https://pbs.twimg.com/media/pic1.jpg' }],
      mediaDetails: [{ media_url_https: 'https://pbs.twimg.com/media/pic2.jpg', type: 'photo' }],
      created_at: '2024-01-01T00:00:00Z',
    };

    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('cdn.syndication.twimg.com/tweet-result')) {
        return jsonResponse(tweet);
      }
      throw new Error(`unexpected fetch: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new TwitterFetcher().fetch('https://x.com/jane/status/1234567890');

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.method).toBe('twitter:tweet-result');
      expect(result.content.rawText).toContain('Hello world');
      expect(result.content.author).toBe('Jane Doe');
      expect(result.content.authorHandle).toBe('@jane');
      expect(result.content.images).toContain('https://pbs.twimg.com/media/pic1.jpg');
      expect(result.content.images).toContain('https://pbs.twimg.com/media/pic2.jpg');
    }
    // Short-circuited on the first step — oembed/jina/og never fetched.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('escalates past a 404 tweet-result to not_found (terminal)', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('tweet-result')) {
        return { ok: false, status: 404, text: async () => 'Not Found', json: async () => ({}) };
      }
      throw new Error(`unexpected fetch: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new TwitterFetcher().fetch('https://x.com/jane/status/999');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.code).toBe('FETCH_NOT_FOUND');
      expect(result.retryable).toBe(false);
    }
  });
});
