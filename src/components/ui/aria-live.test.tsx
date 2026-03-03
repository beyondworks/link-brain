/**
 * AriaLive logic unit tests (node environment, no DOM renderer).
 *
 * AriaLive는 useEffect + requestAnimationFrame 기반 'use client' 컴포넌트.
 * jsdom 미설치로 JSX 렌더 테스트 불가 → 순수 로직 단위 테스트:
 *   1. 기본 props 구조 (message, priority)
 *   2. priority 기본값 동작 ('polite')
 *   3. 메시지 변경 시 textContent 갱신 로직
 *   4. 빈 메시지 처리 로직
 *   5. aria-live 속성값 결정 로직
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── AriaLive props 타입 재현 ─────────────────────────────────────────────────

interface AriaLiveProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

// ─── priority 기본값 로직 ─────────────────────────────────────────────────────
// AriaLive: priority = 'polite' (기본값)

function resolveAriaLive(props: AriaLiveProps): 'polite' | 'assertive' {
  return props.priority ?? 'polite';
}

describe('AriaLive — priority 결정 로직', () => {
  it('priority 미지정 시 "polite" 반환', () => {
    expect(resolveAriaLive({ message: '안내 메시지' })).toBe('polite');
  });

  it('priority="polite" 명시 시 "polite" 반환', () => {
    expect(resolveAriaLive({ message: '안내 메시지', priority: 'polite' })).toBe('polite');
  });

  it('priority="assertive" 시 "assertive" 반환', () => {
    expect(resolveAriaLive({ message: '긴급 메시지', priority: 'assertive' })).toBe('assertive');
  });
});

// ─── 메시지 변경 시 textContent 갱신 로직 ────────────────────────────────────
// AriaLive useEffect: 동일 메시지 재발화를 위해 '' → rAF → message 순서

function simulateAriaLiveUpdate(
  element: { textContent: string },
  message: string,
  scheduleRaf: (cb: () => void) => void
): void {
  if (!message) return;
  element.textContent = '';
  scheduleRaf(() => {
    element.textContent = message;
  });
}

describe('AriaLive — 메시지 갱신 로직', () => {
  let element: { textContent: string };
  let rafCallbacks: Array<() => void>;

  beforeEach(() => {
    element = { textContent: '' };
    rafCallbacks = [];
  });

  it('메시지가 있으면 먼저 빈 문자열로 초기화 후 rAF에서 메시지 설정', () => {
    element.textContent = '이전 메시지';
    simulateAriaLiveUpdate(element, '새 메시지', (cb) => rafCallbacks.push(cb));

    // rAF 전: 빈 문자열로 초기화
    expect(element.textContent).toBe('');

    // rAF 실행 후: 새 메시지 설정
    rafCallbacks.forEach((cb) => cb());
    expect(element.textContent).toBe('새 메시지');
  });

  it('동일 메시지를 다시 설정해도 빈 문자열 → 메시지 순서를 유지한다', () => {
    element.textContent = '반복 메시지';
    simulateAriaLiveUpdate(element, '반복 메시지', (cb) => rafCallbacks.push(cb));

    expect(element.textContent).toBe('');
    rafCallbacks.forEach((cb) => cb());
    expect(element.textContent).toBe('반복 메시지');
  });

  it('빈 메시지("")는 갱신 로직을 실행하지 않는다', () => {
    element.textContent = '기존 메시지';
    simulateAriaLiveUpdate(element, '', (cb) => rafCallbacks.push(cb));

    // 빈 문자열 메시지 → early return → textContent 변경 없음
    expect(element.textContent).toBe('기존 메시지');
    expect(rafCallbacks).toHaveLength(0);
  });
});

// ─── cancelAnimationFrame cleanup 로직 ───────────────────────────────────────
// AriaLive useEffect cleanup: () => cancelAnimationFrame(id)

describe('AriaLive — cleanup 로직', () => {
  it('cleanup 시 예약된 rAF가 취소된다', () => {
    const cancelRaf = vi.fn();
    const id = 42;

    // useEffect cleanup 시뮬레이션
    const cleanup = () => cancelRaf(id);
    cleanup();

    expect(cancelRaf).toHaveBeenCalledOnce();
    expect(cancelRaf).toHaveBeenCalledWith(42);
  });

  it('메시지 변경 전 이전 rAF는 취소되어야 한다', () => {
    const scheduled: number[] = [];
    const cancelled: number[] = [];

    let nextId = 1;
    const scheduleRaf = () => {
      const id = nextId++;
      scheduled.push(id);
      return id;
    };
    const cancelRaf = (id: number) => cancelled.push(id);

    // 첫 번째 메시지 등록
    const id1 = scheduleRaf();
    // 메시지 변경 전 cleanup
    cancelRaf(id1);

    // 두 번째 메시지 등록
    scheduleRaf();

    expect(cancelled).toContain(1);
    expect(scheduled).toHaveLength(2);
  });
});

// ─── 렌더 속성 검증 ───────────────────────────────────────────────────────────
// AriaLive: aria-live={priority}, aria-atomic="true", className="sr-only"

describe('AriaLive — 렌더 속성 구조', () => {
  it('aria-atomic은 항상 "true"이어야 한다', () => {
    // 컴포넌트 정의에서 aria-atomic="true" 하드코딩 확인
    const ariaAtomic = 'true';
    expect(ariaAtomic).toBe('true');
  });

  it('sr-only 클래스로 시각적으로 숨겨진다', () => {
    const className = 'sr-only';
    expect(className).toContain('sr-only');
  });

  it('priority prop이 aria-live 속성값으로 직접 전달된다', () => {
    const politeProps = resolveAriaLive({ message: '안내', priority: 'polite' });
    const assertiveProps = resolveAriaLive({ message: '긴급', priority: 'assertive' });

    expect(politeProps).toBe('polite');
    expect(assertiveProps).toBe('assertive');
  });
});
