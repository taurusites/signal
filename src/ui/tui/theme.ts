export const theme = {
  ok: 'green',
  warn: 'yellow',
  crit: 'red',
  dim: 'gray',
  border: 'white',
} as const;

export function severityColor(util: number | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (util === null) return 'gray';
  if (util > 90) return 'red';
  if (util > 70) return 'yellow';
  return 'green';
}

export function bar(pct: number | null, width = 20): string {
  if (pct === null) return '─'.repeat(width);
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
