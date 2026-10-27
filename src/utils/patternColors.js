export const PATTERN_COLORS = ['var(--pattern-red)', 'var(--pattern-orange)', 'var(--pattern-yellow)'];
export const PATTERN_INACTIVE_COLOR = 'var(--pattern-inactive)';

export function getPatternColor(key, activePatterns) {
  if (activePatterns.length === 0) return PATTERN_COLORS[0];
  const i = activePatterns.indexOf(key);
  return i === -1 ? PATTERN_INACTIVE_COLOR : PATTERN_COLORS[i % PATTERN_COLORS.length];
}
