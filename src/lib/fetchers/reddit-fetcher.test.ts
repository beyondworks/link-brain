import { describe, it, expect, vi, afterEach } from 'vitest';
import { RedditFetcher, parseRedditRss } from './reddit-fetcher';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseRedditRss', () => {
  it('extracts title, body text, and thumbnail from the first entry', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>r/test</title>
  <entry>
    <title>My Post Title</title>
    <content type="html">&lt;p&gt;This is the post body with enough words to read.&lt;/p&gt;</content>
    <media:thumbnail url="https://preview.redd.it/thumb.jpg" />
  </entry>
  <entry>
    <title>a comment</title>
    <content type="html">ignore me</content>
  </entry>
</feed>`;

    const post = parseRedditRss(xml);
    expect(post.title).toBe('My Post Title');
    expect(post.text).toContain('post body with enough words');
    expect(post.text).not.toContain('ignore me');
    expect(post.thumbnail).toBe('https://preview.redd.it/thumb.jpg');
  });
});

describe('RedditFetcher — rss step', () => {
  it('returns a success result from a substantial .rss body', async () => {
    const bodyText = 'This is a detailed reddit self-post paragraph. '.repeat(120); // > 3000 bytes
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>r/dataisbeautiful</title>
  <entry>
    <title>An Interesting Chart</title>
    <content type="html">&lt;p&gt;${bodyText}&lt;/p&gt;</content>
    <media:thumbnail url="https://preview.redd.it/chart.jpg" />
  </entry>
</feed>`;

    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('.rss')) {
        return { ok: true, status: 200, text: async () => xml, json: async () => ({}) };
      }
      throw new Error(`unexpected fetch: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new RedditFetcher().fetch(
      'https://www.reddit.com/r/dataisbeautiful/comments/abc123/an_interesting_chart/'
    );

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.method).toBe('reddit:rss');
      expect(result.content.title).toBe('An Interesting Chart');
      expect(result.content.rawText).toContain('detailed reddit self-post');
      expect(result.content.images).toContain('https://preview.redd.it/chart.jpg');
    }
    // First step succeeded; json/jina/og never fetched.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
