/**
 * Escalation Chain — tiered fetch runner ported from insane-search.
 *
 * Runs an ordered list of fetch steps (api → reader → html → remote), recording
 * a FetchAttempt per try. Short-circuits on the first 'ok', remembers the best
 * 'weak' candidate, retries transient failures once, and terminates early on
 * 'not_found'. When steps are exhausted (or the deadline expires) it resolves
 * to a single FetchResult reflecting the best outcome seen.
 */

import {
    blockedResult,
    emptyResult,
    errorResult,
    successResult,
    weakResult,
    type FetchAttempt,
    type FetchMethod,
    type FetchResult,
    type FetchVerdict,
} from './fetch-result';
import type { FetchedUrlContent } from './types';

export type FetchTier = 'api' | 'reader' | 'html' | 'remote';

export interface StepOutcome {
    verdict: FetchVerdict;
    content?: FetchedUrlContent;
    httpStatus?: number;
    detail?: string;
}

export interface FetchStep {
    method: FetchMethod;
    tier: FetchTier;
    /** Step does its own fetch + parse and reports a verdict. */
    run: () => Promise<StepOutcome>;
}

export interface RemoteFetchGateway {
    fetch(url: string, profile: { tier: 'browser' | 'tls'; platform: string }): Promise<FetchResult>;
}

export interface EscalationOptions {
    deadlineMs?: number;
    gateway?: RemoteFetchGateway | null;
}

const DEFAULT_DEADLINE_MS = 40_000;
const RETRY_BACKOFF_MS = 1_000;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isTransient = (verdict: FetchVerdict): boolean =>
    verdict === 'network_error' || verdict === 'http_error';

interface WeakCandidate {
    content: FetchedUrlContent;
    method: FetchMethod;
}

/**
 * Run steps in order until one succeeds or the chain is exhausted.
 */
export const runEscalationChain = async (
    steps: FetchStep[],
    opts?: EscalationOptions
): Promise<FetchResult> => {
    const deadlineMs = opts?.deadlineMs ?? DEFAULT_DEADLINE_MS;
    const gateway = opts?.gateway ?? null;
    const startedAt = Date.now();

    const attempts: FetchAttempt[] = [];
    let bestWeak: WeakCandidate | null = null;
    let sawChallenge = false;
    let sawRateLimited = false;
    let rateLimitedContent: FetchedUrlContent | null = null;
    let sawNetworkError = false;

    for (const step of steps) {
        // Deadline check before each step start.
        if (Date.now() - startedAt >= deadlineMs) {
            if (bestWeak) {
                return weakResult(bestWeak.content, bestWeak.method, attempts);
            }
            return errorResult('FETCH_TIMEOUT', 'Escalation deadline exceeded', true, attempts);
        }

        // Remote-tier steps require a gateway; skip silently otherwise.
        if (step.tier === 'remote' && !gateway) {
            continue;
        }

        let outcome = await runStep(step, attempts);

        // Transient failure → retry this step ONCE after a backoff.
        if (isTransient(outcome.verdict)) {
            await delay(RETRY_BACKOFF_MS);
            outcome = await runStep(step, attempts);
        }

        switch (outcome.verdict) {
            case 'ok':
                return successResult(outcome.content ?? emptyContent(), step.method, attempts);

            case 'weak':
                if (outcome.content && !bestWeak) {
                    bestWeak = { content: outcome.content, method: step.method };
                }
                continue;

            case 'not_found':
                // Terminal — the resource does not exist; stop immediately.
                return errorResult('FETCH_NOT_FOUND', 'Resource not found', false, attempts);

            case 'challenge':
            case 'auth_gate':
                sawChallenge = true;
                if (outcome.content && !bestWeak) {
                    bestWeak = { content: outcome.content, method: step.method };
                }
                continue;

            case 'rate_limited':
                sawRateLimited = true;
                if (outcome.content && !rateLimitedContent) {
                    rateLimitedContent = outcome.content;
                }
                continue;

            case 'network_error':
            case 'http_error':
                sawNetworkError = true;
                continue;

            case 'empty':
            default:
                continue;
        }
    }

    return resolveFinal({
        attempts,
        bestWeak,
        sawChallenge,
        sawRateLimited,
        rateLimitedContent,
        sawNetworkError,
    });
};

const runStep = async (step: FetchStep, attempts: FetchAttempt[]): Promise<StepOutcome> => {
    const stepStart = Date.now();
    try {
        const outcome = await step.run();
        attempts.push({
            method: step.method,
            verdict: outcome.verdict,
            httpStatus: outcome.httpStatus,
            durationMs: Date.now() - stepStart,
            detail: outcome.detail,
        });
        return outcome;
    } catch (error) {
        // An exception from run() is treated as a network_error verdict.
        console.warn(`[Escalation] step ${step.method} threw:`, error);
        attempts.push({
            method: step.method,
            verdict: 'network_error',
            durationMs: Date.now() - stepStart,
            detail: error instanceof Error ? error.message : String(error),
        });
        return { verdict: 'network_error' };
    }
};

interface FinalState {
    attempts: FetchAttempt[];
    bestWeak: WeakCandidate | null;
    sawChallenge: boolean;
    sawRateLimited: boolean;
    rateLimitedContent: FetchedUrlContent | null;
    sawNetworkError: boolean;
}

const resolveFinal = (state: FinalState): FetchResult => {
    const { attempts, bestWeak, sawChallenge, sawRateLimited, rateLimitedContent, sawNetworkError } = state;

    if (bestWeak) {
        return weakResult(bestWeak.content, bestWeak.method, attempts);
    }
    if (sawChallenge) {
        return blockedResult('FETCH_BLOCKED', null, attempts);
    }
    if (sawRateLimited) {
        return blockedResult('FETCH_RATE_LIMITED', rateLimitedContent, attempts);
    }
    if (sawNetworkError) {
        return errorResult('FETCH_NETWORK', 'All fetch attempts failed with network errors', true, attempts);
    }
    return emptyResult(attempts);
};

const emptyContent = (): FetchedUrlContent => ({ rawText: '', images: [] });
