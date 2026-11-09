export const WORDMARK_DRAW_MS = 3000;
export const wordmarkPhase = (elapsed: number) =>
  Number.isFinite(elapsed)
    ? Math.max(0, Math.min(1, elapsed / WORDMARK_DRAW_MS))
    : 1;

export const normalizeWordmark = (radius = 28, stroke = 0.8) => ({
  radius: Number.isFinite(radius) ? Math.max(12, Math.min(50, radius)) : 28,
  stroke: Number.isFinite(stroke) ? Math.max(0.4, Math.min(2, stroke)) : 0.8,
});
export interface WordmarkBounds {
  height: number;
  left: number;
  top: number;
  width: number;
}
export const wordmarkPointer = (
  bounds: WordmarkBounds,
  x: number,
  y: number
) => {
  if (
    ![bounds.left, bounds.top, bounds.width, bounds.height, x, y].every(
      Number.isFinite
    ) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return null;
  }
  return {
    x: Math.max(0, Math.min(100, ((x - bounds.left) / bounds.width) * 100)),
    y: Math.max(0, Math.min(100, ((y - bounds.top) / bounds.height) * 100)),
  };
};
