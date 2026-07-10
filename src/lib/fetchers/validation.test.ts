import { describe, it, expect } from 'vitest';
import { validateFetchResponse } from './validation';

/** Pad a body to exceed the 3000-byte "small body" threshold. */
const large = (seed: string): string => seed + ' '.repeat(3200);

describe('validateFetchResponse', () => {
  describe('hard challenge markers', () => {
    it('flags Cloudflare "Just a moment..." as challenge', () => {
      const body = large('<html><head><title>Just a moment...</title></head><body>Checking your browser</body></html>');
      const result = validateFetchResponse({ httpStatus: 200, body });
      expect(result.verdict).toBe('challenge');
      expect(result.detail).toBe('just a moment...');
    });

    it('flags Incapsula challenge', () => {
      const body = large('Request unsuccessful. Incapsula incident ID: 123-456');
      const result = validateFetchResponse({ httpStatus: 200, body });
      expect(result.verdict).toBe('challenge');
      expect(result.detail).toBe('request unsuccessful. incapsula');
    });

    it('flags DataDome sec-if-cpt-container marker', () => {
      const body = large('<div id="sec-if-cpt-container">please verify</div>');
      const result = validateFetchResponse({ httpStatus: 200, body });
      expect(result.verdict).toBe('challenge');
      expect(result.detail).toBe('sec-if-cpt-container');
    });
  });

  describe('size heuristic', () => {
    it('treats tiny valid JSON as ok (structured exempt from size)', () => {
      const result = validateFetchResponse({ httpStatus: 200, body: '{"ok":true}', expectJson: true });
      expect(result.verdict).toBe('ok');
    });

    it('treats tiny valid JSON as ok without expectJson (auto-detect)', () => {
      const result = validateFetchResponse({ httpStatus: 200, body: '{"id":1,"name":"x"}' });
      expect(result.verdict).toBe('ok');
    });

    it('treats tiny HTML as weak', () => {
      const result = validateFetchResponse({ httpStatus: 200, body: '<html><body>hi</body></html>' });
      expect(result.verdict).toBe('weak');
    });
  });

  describe('auth gate', () => {
    it('flags a Korean login wall (small body) as auth_gate', () => {
      const body = '<html><body><h1>로그인</h1><p>회원가입이 필요합니다</p></body></html>';
      const result = validateFetchResponse({ httpStatus: 200, body });
      expect(result.verdict).toBe('auth_gate');
    });

    it('does NOT flag a normal article that mentions "sign up" deep in body', () => {
      const article =
        '<html><body><article>' +
        'This is a long form article about product growth. '.repeat(120) +
        ' Later on we mention you can sign up for the newsletter. ' +
        'And the article continues for a while more. '.repeat(60) +
        '</article></body></html>';
      const result = validateFetchResponse({ httpStatus: 200, body: article });
      expect(result.verdict).toBe('ok');
    });
  });

  describe('HTTP semantics', () => {
    it('maps 404 to not_found', () => {
      expect(validateFetchResponse({ httpStatus: 404, body: 'Not Found' }).verdict).toBe('not_found');
    });

    it('maps 429 to rate_limited', () => {
      expect(validateFetchResponse({ httpStatus: 429, body: 'Too Many Requests' }).verdict).toBe('rate_limited');
    });

    it('maps 500 to http_error', () => {
      expect(validateFetchResponse({ httpStatus: 500, body: 'Server Error' }).verdict).toBe('http_error');
    });

    it('maps 403 with WAF body to challenge', () => {
      const result = validateFetchResponse({ httpStatus: 403, body: large('<h1>Access Denied</h1>') });
      expect(result.verdict).toBe('challenge');
    });

    it('maps 401 dominated by login wall to auth_gate', () => {
      const result = validateFetchResponse({ httpStatus: 401, body: '<h1>Please log in</h1>' });
      expect(result.verdict).toBe('auth_gate');
    });
  });

  describe('soft markers', () => {
    it('flags soft "captcha" marker only with small body', () => {
      const result = validateFetchResponse({ httpStatus: 200, body: 'please solve the captcha' });
      expect(result.verdict).toBe('challenge');
    });

    it('does not flag soft "captcha" in a large structured-free article', () => {
      const body = large('An article discussing how captcha systems work in depth.');
      const result = validateFetchResponse({ httpStatus: 200, body });
      // large body, soft marker not triggered → passes size gate → ok
      expect(result.verdict).toBe('ok');
    });
  });
});
