import { describe, it, expect } from 'vitest';
import {
  splitParagraphsForExtraction,
  rebuildSocialBody,
  isSocialPlatform,
} from './social-extract';

const RAW = [
  '오리지널 포스트 본문입니다.',
  '본문 두번째 문단.',
  '와 대박이네요',              // 남의 댓글
  '작성자 후속 댓글: 링크는 여기',
  'Continue with Instagram',    // 사이트 껍데기
].join('\n\n');

describe('social body extraction', () => {
  const paragraphs = splitParagraphsForExtraction(RAW);

  it('splits into indexable paragraphs', () => {
    expect(paragraphs).toHaveLength(5);
    expect(paragraphs[0]).toBe('오리지널 포스트 본문입니다.');
  });

  it('keeps only selected paragraphs, appending author follow-ups', () => {
    const out = rebuildSocialBody(paragraphs, { keepLines: [0, 1], authorFollowUpLines: [3] });
    expect(out).toContain('오리지널 포스트 본문입니다.');
    expect(out).toContain('작성자 후속 댓글: 링크는 여기');
    expect(out).not.toContain('와 대박이네요');
    expect(out).not.toContain('Continue with Instagram');
    expect(out).toContain('[[[COMMENTS_SECTION]]]');
  });

  it('never emits text outside the source paragraphs', () => {
    const out = rebuildSocialBody(paragraphs, { keepLines: [0, 99, -1] }) ?? '';
    for (const line of out.split('\n\n')) {
      if (!line || line.startsWith('[[[')) continue;
      expect(paragraphs).toContain(line);
    }
  });

  it('cuts non-contiguous tail (a look-alike later post) from the body', () => {
    const many = splitParagraphsForExtraction(
      Array.from({ length: 12 }, (_, i) => `문단 ${i} 내용입니다`).join('\n\n')
    );
    const out = rebuildSocialBody(many, { keepLines: [0, 1, 2, 10] }) ?? '';
    expect(out).toContain('문단 2');
    expect(out).not.toContain('문단 10');
    // gap of 1 (skipped noise line) is allowed
    const out2 = rebuildSocialBody(many, { keepLines: [0, 2, 3] }) ?? '';
    expect(out2).toContain('문단 3');
  });

  it('returns null on empty/garbage selection so caller keeps the original', () => {
    expect(rebuildSocialBody(paragraphs, {})).toBeNull();
    expect(rebuildSocialBody(paragraphs, { keepLines: [99] })).toBeNull();
  });

  it('respects the char budget', () => {
    expect(splitParagraphsForExtraction('a'.repeat(50) + '\n\n' + 'b'.repeat(50), 60)).toHaveLength(1);
  });

  it('flags social platforms only', () => {
    expect(isSocialPlatform('threads')).toBe(true);
    expect(isSocialPlatform('web')).toBe(false);
  });
});
