import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './get-error-message';

describe('getErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('extracts message from TypeError', () => {
    expect(getErrorMessage(new TypeError('type fail'))).toBe('type fail');
  });

  it('returns string directly if thrown as string', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('extracts message from Supabase PostgrestError-like object', () => {
    const pgError = { message: 'relation "clips" does not exist', details: '', hint: '', code: '42P01' };
    expect(getErrorMessage(pgError)).toBe('relation "clips" does not exist');
  });

  it('extracts message from nested { error: { message } } pattern', () => {
    const apiError = { error: { message: 'Unauthorized' } };
    expect(getErrorMessage(apiError)).toBe('Unauthorized');
  });

  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('오류가 발생했습니다.');
  });

  it('returns fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('오류가 발생했습니다.');
  });

  it('returns fallback for number', () => {
    expect(getErrorMessage(42)).toBe('오류가 발생했습니다.');
  });

  it('returns fallback for empty object', () => {
    expect(getErrorMessage({})).toBe('오류가 발생했습니다.');
  });

  it('returns fallback for object with empty message', () => {
    expect(getErrorMessage({ message: '' })).toBe('오류가 발생했습니다.');
  });

  it('uses custom fallback when provided', () => {
    expect(getErrorMessage(null, '커스텀 에러')).toBe('커스텀 에러');
  });

  it('ignores nested error with empty message', () => {
    expect(getErrorMessage({ error: { message: '' } })).toBe('오류가 발생했습니다.');
  });

  it('returns fallback for boolean', () => {
    expect(getErrorMessage(false)).toBe('오류가 발생했습니다.');
  });
});
