import { describe, it, expect } from 'vitest';
import { CONTENT_STUDIO_TYPES } from '@/config/constants';
import {
  STUDIO_FORMATS,
  STUDIO_LENGTHS,
  isStudioLength,
  getLengthTarget,
} from './studio-formats';

describe('STUDIO_FORMATS', () => {
  it('covers every studio content type', () => {
    for (const type of CONTENT_STUDIO_TYPES) {
      expect(STUDIO_FORMATS[type]).toBeDefined();
    }
    expect(Object.keys(STUDIO_FORMATS).sort()).toEqual([...CONTENT_STUDIO_TYPES].sort());
  });

  it('defines a target and picker label for every length', () => {
    for (const type of CONTENT_STUDIO_TYPES) {
      for (const length of STUDIO_LENGTHS) {
        expect(STUDIO_FORMATS[type].targets[length]).toBeTruthy();
        expect(STUDIO_FORMATS[type].pickerLabels[length]).toBeTruthy();
      }
    }
  });

  it('keeps instructions concise (6 lines or fewer, no empty line)', () => {
    for (const type of CONTENT_STUDIO_TYPES) {
      const lines = STUDIO_FORMATS[type].instructions;
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(6);
      for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it('gives each length a distinct target per type (no flat 500자 for everything)', () => {
    for (const type of CONTENT_STUDIO_TYPES) {
      const targets = STUDIO_LENGTHS.map((l) => STUDIO_FORMATS[type].targets[l]);
      expect(new Set(targets).size).toBe(STUDIO_LENGTHS.length);
    }
  });

  it('maps threads length to thread count, not raw char count', () => {
    expect(STUDIO_FORMATS.threads_post.targets.medium).toContain('3연속');
    expect(STUDIO_FORMATS.threads_post.targets.long).toContain('5연속');
  });

  it('maps instagram length to slide count', () => {
    expect(STUDIO_FORMATS.instagram_feed.targets.short).toContain('5장');
    expect(STUDIO_FORMATS.instagram_feed.targets.long).toContain('10장');
  });

  it('marks SNS formats as plain output and documents as markdown', () => {
    expect(STUDIO_FORMATS.threads_post.output).toBe('plain');
    expect(STUDIO_FORMATS.instagram_feed.output).toBe('plain');
    expect(STUDIO_FORMATS.blog_post.output).toBe('markdown');
    expect(STUDIO_FORMATS.newsletter.output).toBe('markdown');
  });
});

describe('isStudioLength', () => {
  it('accepts valid lengths', () => {
    expect(isStudioLength('short')).toBe(true);
    expect(isStudioLength('medium')).toBe(true);
    expect(isStudioLength('long')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isStudioLength('huge')).toBe(false);
    expect(isStudioLength(3)).toBe(false);
    expect(isStudioLength(null)).toBe(false);
    expect(isStudioLength(undefined)).toBe(false);
  });
});

describe('getLengthTarget', () => {
  it('returns the blog char targets from the single source of truth', () => {
    expect(getLengthTarget('blog_post', 'short')).toContain('1,000자');
    expect(getLengthTarget('blog_post', 'medium')).toContain('2,200자');
    expect(getLengthTarget('blog_post', 'long')).toContain('3,500자');
  });
});
