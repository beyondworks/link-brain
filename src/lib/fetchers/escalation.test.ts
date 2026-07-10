import { describe, it, expect, vi, afterEach } from 'vitest';
import { runEscalationChain, type FetchStep } from './escalation';
import type { FetchedUrlContent } from './types';

const content = (text: string): FetchedUrlContent => ({ rawText: text, images: [] });
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const step = (
  method: FetchStep['method'],
  tier: FetchStep['tier'],
  run: FetchStep['run']
): FetchStep => ({ method, tier, run });

afterEach(() => {
  vi.useRealTimers();
});

describe('runEscalationChain', () => {
  it('short-circuits on first ok', async () => {
    const secondRun = vi.fn();
    const steps: FetchStep[] = [
      step('jina', 'reader', async () => ({ verdict: 'ok', content: content('hello') })),
      step('readability', 'html', async () => {
        secondRun();
        return { verdict: 'ok', content: content('nope') };
      }),
    ];
    const result = await runEscalationChain(steps);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.method).toBe('jina');
      expect(result.content.rawText).toBe('hello');
    }
    expect(secondRun).not.toHaveBeenCalled();
  });

  it('remembers weak then succeeds on a later ok', async () => {
    const steps: FetchStep[] = [
      step('jina', 'reader', async () => ({ verdict: 'weak', content: content('thin') })),
      step('readability', 'html', async () => ({ verdict: 'ok', content: content('full') })),
    ];
    const result = await runEscalationChain(steps);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.method).toBe('readability');
      expect(result.content.rawText).toBe('full');
    }
    expect(result.attempts).toHaveLength(2);
  });

  it('retries a transient failure once then succeeds', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const steps: FetchStep[] = [
      step('jina', 'reader', async () => {
        calls++;
        return calls === 1
          ? { verdict: 'network_error' }
          : { verdict: 'ok', content: content('recovered') };
      }),
    ];
    const promise = runEscalationChain(steps);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(calls).toBe(2);
    expect(result.kind).toBe('success');
    // Both the failed and successful attempts are recorded.
    expect(result.attempts).toHaveLength(2);
  });

  it('terminates immediately on not_found', async () => {
    const secondRun = vi.fn();
    const steps: FetchStep[] = [
      step('reddit:json', 'api', async () => ({ verdict: 'not_found', httpStatus: 404 })),
      step('jina', 'reader', async () => {
        secondRun();
        return { verdict: 'ok', content: content('never') };
      }),
    ];
    const result = await runEscalationChain(steps);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.code).toBe('FETCH_NOT_FOUND');
      expect(result.retryable).toBe(false);
    }
    expect(secondRun).not.toHaveBeenCalled();
  });

  it('returns best weak candidate when the deadline expires', async () => {
    const secondRun = vi.fn();
    const steps: FetchStep[] = [
      step('jina', 'reader', async () => {
        await sleep(20);
        return { verdict: 'weak', content: content('partial') };
      }),
      step('readability', 'html', async () => {
        secondRun();
        return { verdict: 'ok', content: content('should-not-run') };
      }),
    ];
    const result = await runEscalationChain(steps, { deadlineMs: 10 });
    expect(result.kind).toBe('weak');
    if (result.kind === 'weak') {
      expect(result.content.rawText).toBe('partial');
    }
    expect(secondRun).not.toHaveBeenCalled();
  });

  it('resolves to blocked when all steps are challenges', async () => {
    const steps: FetchStep[] = [
      step('jina', 'reader', async () => ({ verdict: 'challenge', detail: 'just a moment...' })),
      step('readability', 'html', async () => ({ verdict: 'challenge', detail: 'px-captcha' })),
    ];
    const result = await runEscalationChain(steps);
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked') {
      expect(result.code).toBe('FETCH_BLOCKED');
    }
  });

  it('skips remote-tier steps when no gateway is provided', async () => {
    const remoteRun = vi.fn(async () => ({ verdict: 'ok' as const, content: content('remote') }));
    const steps: FetchStep[] = [
      step('threads:scrape', 'remote', remoteRun),
      step('og-meta', 'html', async () => ({ verdict: 'ok', content: content('local') })),
    ];
    const result = await runEscalationChain(steps);
    expect(remoteRun).not.toHaveBeenCalled();
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.method).toBe('og-meta');
    }
  });
});
