/**
 * Tests for frontend/src/utils/templateConstants.ts
 * Ensures single source of truth for A4 canvas dimensions.
 */
import { describe, it, expect } from 'vitest';
import { RESUME_W, RESUME_H } from '../utils/templateConstants';

describe('templateConstants', () => {
  it('exports RESUME_W as 794 (A4 width at 96dpi)', () => {
    expect(RESUME_W).toBe(794);
  });

  it('exports RESUME_H as 1123 (A4 height at 96dpi)', () => {
    expect(RESUME_H).toBe(1123);
  });

  it('maintains correct A4 aspect ratio (~1:√2)', () => {
    const ratio = RESUME_H / RESUME_W;
    // √2 ≈ 1.414; allow ±0.01 tolerance
    expect(ratio).toBeCloseTo(1.414, 1);
  });
});
