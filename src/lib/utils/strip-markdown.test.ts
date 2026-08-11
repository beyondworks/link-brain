import { describe, it, expect } from 'vitest';
import { stripMarkdown } from './strip-markdown';

describe('stripMarkdown', () => {
  it('removes heading markers but keeps the text', () => {
    expect(stripMarkdown('# 제목\n\n## 소제목')).toBe('제목\n\n소제목');
  });

  it('unwraps bold and italic', () => {
    expect(stripMarkdown('**굵게** 그리고 *기울임*')).toBe('굵게 그리고 기울임');
  });

  it('turns bullets into middle dots', () => {
    expect(stripMarkdown('- 하나\n- 둘')).toBe('· 하나\n· 둘');
  });

  it('keeps link text and url readable', () => {
    expect(stripMarkdown('[링크](https://a.com)')).toBe('링크 (https://a.com)');
  });

  it('reduces images to alt text', () => {
    expect(stripMarkdown('![그림](https://a.com/x.png)')).toBe('그림');
  });

  it('strips inline code backticks and blockquote markers', () => {
    expect(stripMarkdown('> `useState` 를 씁니다')).toBe('useState 를 씁니다');
  });

  it('drops horizontal rules and collapses extra blank lines', () => {
    expect(stripMarkdown('앞\n\n---\n\n뒤')).toBe('앞\n\n뒤');
  });

  it('leaves plain SNS text untouched', () => {
    const threads = '[1/3] 이건 훅이에요\n\n두 번째 줄\n\n#태그';
    expect(stripMarkdown(threads)).toBe(threads);
  });
});
