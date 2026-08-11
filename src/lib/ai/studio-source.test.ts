import { describe, it, expect } from 'vitest';
import {
  capForBudget,
  buildSourceMaterial,
  buildSourcesSection,
  PER_CLIP_CHAR_CAP,
  type SourceClip,
} from './studio-source';

function clip(over: Partial<SourceClip> = {}): SourceClip {
  return {
    title: '제목',
    url: 'https://example.com/a',
    platform: 'web',
    summary: null,
    createdAt: '2026-01-15T00:00:00.000Z',
    content: '본문',
    ...over,
  };
}

describe('capForBudget', () => {
  it('returns the max length when everything fits', () => {
    expect(capForBudget([100, 200, 300], 10000)).toBe(300);
  });

  it('trims the longest first, leaving short items whole', () => {
    // budget 500: 짧은 100은 그대로, 나머지 둘이 남은 400을 나눠 200씩
    const cap = capForBudget([100, 1000, 1000], 500);
    expect(cap).toBe(200);
    const total = [100, 1000, 1000].reduce((a, l) => a + Math.min(l, cap), 0);
    expect(total).toBeLessThanOrEqual(500);
  });

  it('never exceeds the budget for uniform lengths', () => {
    const lengths = [4000, 4000, 4000, 4000];
    const cap = capForBudget(lengths, 6000);
    expect(lengths.reduce((a, l) => a + Math.min(l, cap), 0)).toBeLessThanOrEqual(6000);
  });

  it('handles the empty case', () => {
    expect(capForBudget([], 1000)).toBe(0);
  });
});

describe('buildSourceMaterial', () => {
  it('includes title, platform, saved date and url per source', () => {
    const out = buildSourceMaterial([clip({ title: '리액트 훅', platform: 'medium' })]);
    expect(out).toContain('[소스 1] 리액트 훅');
    expect(out).toContain('플랫폼: medium');
    expect(out).toContain('저장일: 2026-01-15');
    expect(out).toContain('URL: https://example.com/a');
  });

  it('caps a single clip at 4000 chars', () => {
    const out = buildSourceMaterial([clip({ content: 'ㄱ'.repeat(9000) })]);
    expect((out.match(/ㄱ/g) ?? []).length).toBe(PER_CLIP_CHAR_CAP);
    expect(out).toContain('…(이하 생략)');
  });

  it('respects the total budget across many clips', () => {
    const clips = Array.from({ length: 20 }, () => clip({ content: 'ㄴ'.repeat(4000) }));
    const out = buildSourceMaterial(clips, { totalBudget: 60000 });
    expect((out.match(/ㄴ/g) ?? []).length).toBeLessThanOrEqual(60000);
    // 20 * 4000 = 80000 이므로 실제로 깎였어야 한다
    expect((out.match(/ㄴ/g) ?? []).length).toBeLessThan(80000);
  });

  it('falls back to summary when there is no content', () => {
    const out = buildSourceMaterial([clip({ content: null, summary: '한 줄 요약' })]);
    expect(out).toContain('요약: 한 줄 요약');
  });

  it('separates multiple sources', () => {
    const out = buildSourceMaterial([clip(), clip({ title: '두번째' })]);
    expect(out).toContain('[소스 1]');
    expect(out).toContain('[소스 2] 두번째');
    expect(out).toContain('---');
  });
});

describe('buildSourcesSection', () => {
  it('renders a markdown link list under 참고한 클립', () => {
    const out = buildSourcesSection([
      clip({ title: '첫 글', url: 'https://a.com' }),
      clip({ title: '둘째 글', url: 'https://b.com' }),
    ]);
    expect(out).toContain('## 참고한 클립');
    expect(out).toContain('- [첫 글](https://a.com)');
    expect(out).toContain('- [둘째 글](https://b.com)');
  });

  it('falls back to url when the title is missing', () => {
    expect(buildSourcesSection([clip({ title: null, url: 'https://c.com' })]))
      .toContain('- [https://c.com](https://c.com)');
  });

  it('returns empty string with no clips', () => {
    expect(buildSourcesSection([])).toBe('');
  });
});
