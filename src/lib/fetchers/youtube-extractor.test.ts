/**
 * Tests for YouTube extractor — timestamped transcript chunking
 */
import { describe, it, expect } from 'vitest';
import { buildYouTubeRichText, type YouTubeVideoData } from './youtube-extractor';

describe('buildYouTubeRichText', () => {
  it('should include title and channel', () => {
    const data: YouTubeVideoData = {
      videoId: 'abc123',
      title: 'Test Video',
      channelTitle: 'Test Channel',
      description: 'Some description',
      thumbnailUrl: '',
      hasTranscript: false,
    };
    const result = buildYouTubeRichText(data);
    expect(result).toContain('Title: Test Video');
    expect(result).toContain('Channel: Test Channel');
  });

  it('should prefer timestamped transcript over plain', () => {
    const data: YouTubeVideoData = {
      videoId: 'abc123',
      title: 'Test Video',
      channelTitle: 'Test Channel',
      description: '',
      thumbnailUrl: '',
      hasTranscript: true,
      transcript: 'plain transcript text',
      timestampedTranscript: '[0:00] Introduction\n\n[2:00] Main topic',
    };
    const result = buildYouTubeRichText(data);
    expect(result).toContain('[0:00] Introduction');
    expect(result).toContain('[2:00] Main topic');
    expect(result).not.toContain('plain transcript text');
  });

  it('should fall back to plain transcript if no timestamped version', () => {
    const data: YouTubeVideoData = {
      videoId: 'abc123',
      title: 'Test Video',
      channelTitle: '',
      description: '',
      thumbnailUrl: '',
      hasTranscript: true,
      transcript: 'plain transcript text',
    };
    const result = buildYouTubeRichText(data);
    expect(result).toContain('plain transcript text');
  });

  it('should fall back to description if no transcript', () => {
    const data: YouTubeVideoData = {
      videoId: 'abc123',
      title: 'Test Video',
      channelTitle: '',
      description: 'Video description here',
      thumbnailUrl: '',
      hasTranscript: false,
    };
    const result = buildYouTubeRichText(data);
    expect(result).toContain('Video description here');
  });

  it('should handle video with no content fields', () => {
    const data: YouTubeVideoData = {
      videoId: 'abc123',
      title: '',
      channelTitle: '',
      description: '',
      thumbnailUrl: '',
      hasTranscript: false,
    };
    const result = buildYouTubeRichText(data);
    expect(result).toBe('');
  });
});
