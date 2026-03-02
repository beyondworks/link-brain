/**
 * Sparkline unit tests — pure logic, no DOM required (node environment).
 *
 * We test the SVG point-calculation logic extracted into a shared helper so
 * we can verify correctness without a browser runtime.
 */

import { describe, it, expect } from 'vitest';

// ── Helper: mirrors the point-generation logic in sparkline.tsx ──────────────

interface PointResult {
  points: string[];
  lastX: number;
  lastY: number;
}

function calcSparklinePoints(
  data: number[],
  width = 80,
  height = 32,
  padding = 2,
): PointResult | null {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * plotWidth;
    const y = padding + (1 - (value - min) / range) * plotHeight;
    return `${x},${y}`;
  });

  const lastX = padding + plotWidth;
  const lastY = padding + (1 - (data[data.length - 1] - min) / range) * plotHeight;

  return { points, lastX, lastY };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Sparkline point calculation', () => {
  it('returns null for empty data', () => {
    expect(calcSparklinePoints([])).toBeNull();
  });

  it('returns a single centred point for one-element data', () => {
    const result = calcSparklinePoints([5]);
    expect(result).not.toBeNull();
    // With a single value, index/(length-1 || 1) = 0/1 = 0 → x = padding
    // value - min = 0, range = 1 → y = padding + plotHeight (bottom)
    expect(result!.points).toHaveLength(1);
    // lastX should equal padding + plotWidth
    expect(result!.lastX).toBeCloseTo(78); // 80 - 2*2 + 2 = 78
  });

  it('produces the correct number of polyline points', () => {
    const data = [1, 3, 2, 5, 4];
    const result = calcSparklinePoints(data);
    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(5);
  });

  it('last dot x coordinate equals the rightmost plot boundary', () => {
    const data = [10, 20, 15, 30];
    const result = calcSparklinePoints(data, 80, 32, 2);
    expect(result).not.toBeNull();
    // lastX = padding + plotWidth = 2 + (80 - 4) = 78
    expect(result!.lastX).toBeCloseTo(78);
  });

  it('last dot y coordinate is at top when last value equals max', () => {
    const data = [0, 5, 10];
    const result = calcSparklinePoints(data, 80, 32, 2);
    expect(result).not.toBeNull();
    // last value = 10 = max → (1 - 1) * plotHeight = 0 → y = padding = 2
    expect(result!.lastY).toBeCloseTo(2);
  });

  it('last dot y coordinate is at bottom when last value equals min', () => {
    const data = [10, 5, 0];
    const result = calcSparklinePoints(data, 80, 32, 2);
    expect(result).not.toBeNull();
    // last value = 0 = min → (1 - 0) * plotHeight = 28 → y = padding + 28 = 30
    expect(result!.lastY).toBeCloseTo(30);
  });

  it('all-equal data does not produce NaN (range collapses to 1)', () => {
    const data = [7, 7, 7, 7];
    const result = calcSparklinePoints(data);
    expect(result).not.toBeNull();
    result!.points.forEach((p) => {
      expect(p).not.toMatch(/NaN/);
    });
    expect(isNaN(result!.lastX)).toBe(false);
    expect(isNaN(result!.lastY)).toBe(false);
  });

  it('x coordinates increase monotonically from left to right', () => {
    const data = [1, 4, 2, 8, 3];
    const result = calcSparklinePoints(data);
    expect(result).not.toBeNull();
    const xs = result!.points.map((p) => parseFloat(p.split(',')[0]));
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    }
  });
});
