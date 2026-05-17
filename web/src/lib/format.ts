// Display helpers — kept separate from types so they can be unit-tested without
// pulling React in. Mirrors the formatting logic in the daemon's Aggregator.ts.

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatAge(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function formatCountdown(targetMs: number | null, now = Date.now()): string {
  if (targetMs === null) return '—';
  const remaining = targetMs - now;
  if (remaining <= 0) return 'now';
  const s = Math.floor(remaining / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatClock(ms: number | null): string {
  if (ms === null) return '—';
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')}${ampm}`;
}

export function formatInr(rupees: number): string {
  if (rupees < 1) return `₹${rupees.toFixed(2)}`;
  if (rupees < 1000) return `₹${rupees.toFixed(0)}`;
  const whole = Math.round(rupees);
  const s = whole.toString();
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${grouped},${last3}`;
}

export function shortModel(model: string): string {
  const m = model.replace(/^claude-/i, '');
  const stem = m.split('-')[0] ?? m;
  return stem.toLowerCase();
}

export function moodFromTokens(tokens: number): 'chill' | 'focused' | 'cooking' | 'burning' {
  if (tokens < 500_000) return 'chill';
  if (tokens < 5_000_000) return 'focused';
  if (tokens < 20_000_000) return 'cooking';
  return 'burning';
}

export function sessionProgressPct(windowStartMs: number | null, now = Date.now()): number {
  if (windowStartMs === null) return 0;
  const FIVE_H = 5 * 60 * 60 * 1000;
  return Math.max(0, Math.min(100, ((now - windowStartMs) / FIVE_H) * 100));
}

export function intensityPct(tokens: number): number {
  if (tokens <= 0) return 0;
  const max = 50_000_000;
  return Math.max(0, Math.min(100, (Math.log10(tokens + 1) / Math.log10(max + 1)) * 100));
}
