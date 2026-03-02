import { describe, it, expect } from 'vitest';
import { estimateReadingTime } from './reading-time';

describe('estimateReadingTime', () => {
  describe('빈 입력', () => {
    it('빈 문자열은 0분 반환', () => {
      const result = estimateReadingTime('');
      expect(result.minutes).toBe(0);
      expect(result.words).toBe(0);
    });

    it('공백만 있는 문자열은 0분 반환', () => {
      const result = estimateReadingTime('   \n\t  ');
      expect(result.minutes).toBe(0);
      expect(result.words).toBe(0);
    });
  });

  describe('한국어 텍스트 (500자/분)', () => {
    it('500자 → 1분', () => {
      const text = '가'.repeat(500);
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(1);
      expect(result.words).toBe(500);
    });

    it('501자 → 2분 (ceil)', () => {
      const text = '가'.repeat(501);
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(2);
    });

    it('1000자 → 2분', () => {
      const text = '가'.repeat(1000);
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(2);
    });

    it('1500자 → 3분', () => {
      const text = '가'.repeat(1500);
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(3);
    });

    it('50자 이하 짧은 텍스트 → 최소 1분', () => {
      const text = '안녕하세요. 짧은 문장입니다.';
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(1);
    });
  });

  describe('영어 텍스트 (200단어/분)', () => {
    it('200단어 → 1분', () => {
      const text = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(1);
      expect(result.words).toBe(200);
    });

    it('201단어 → 2분 (ceil)', () => {
      const text = Array.from({ length: 201 }, (_, i) => `word${i}`).join(' ');
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(2);
    });

    it('400단어 → 2분', () => {
      const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
      const result = estimateReadingTime(text);
      expect(result.minutes).toBe(2);
    });

    it('짧은 영어 문장 → 최소 1분', () => {
      const result = estimateReadingTime('Hello world');
      expect(result.minutes).toBe(1);
    });
  });

  describe('혼합 텍스트', () => {
    it('한글 비율 30% 이상이면 한국어 기준 적용', () => {
      // 한글 30자 + 영어 70자 → 한글 비율 약 30%
      const korean = '가'.repeat(30);
      const english = 'a'.repeat(70);
      const text = korean + english;
      const result = estimateReadingTime(text);
      // 한국어 기준: 100자 / 500 = 0.2 → ceil → 1분
      expect(result.minutes).toBe(1);
    });

    it('한글 비율 30% 미만이면 영어 기준 적용', () => {
      // 한글 10단어 + 영어 90단어 → 한글 비율 낮음
      const korean = '가'.repeat(10);
      const english = Array.from({ length: 90 }, () => 'word').join(' ');
      const text = korean + ' ' + english;
      const result = estimateReadingTime(text);
      // 영어 기준: 91단어 / 200 → ceil → 1분
      expect(result.minutes).toBe(1);
      expect(result.words).toBe(91);
    });

    it('한글이 절반 이상인 혼합 텍스트는 한국어 기준', () => {
      const korean = '안녕하세요 반갑습니다 오늘도 좋은 하루 보내세요 '.repeat(20);
      const english = 'hello world';
      const text = korean + english;
      const result = estimateReadingTime(text);
      // 한국어 기준 적용
      expect(result.minutes).toBeGreaterThanOrEqual(1);
    });
  });
});
