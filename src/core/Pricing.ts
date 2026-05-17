// Anthropic API pricing, USD per million tokens. These are approximations
// for the current Claude 4.x family — exact rates depend on the model and
// Anthropic's published price list. See https://www.anthropic.com/pricing.
// Cache-read is dramatically cheaper than first-write, which is why a busy
// agent session can look terrifying in raw tokens but cheap in actual ₹.

export interface ModelPrice {
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
  cacheWritePerMTokUsd: number;
  cacheReadPerMTokUsd: number;
}

const OPUS: ModelPrice = {
  inputPerMTokUsd: 15,
  outputPerMTokUsd: 75,
  cacheWritePerMTokUsd: 18.75,
  cacheReadPerMTokUsd: 1.5,
};

const SONNET: ModelPrice = {
  inputPerMTokUsd: 3,
  outputPerMTokUsd: 15,
  cacheWritePerMTokUsd: 3.75,
  cacheReadPerMTokUsd: 0.3,
};

const HAIKU: ModelPrice = {
  inputPerMTokUsd: 1,
  outputPerMTokUsd: 5,
  cacheWritePerMTokUsd: 1.25,
  cacheReadPerMTokUsd: 0.1,
};

export function priceFor(model: string | null): ModelPrice {
  const m = (model ?? '').toLowerCase();
  if (m.includes('opus')) return OPUS;
  if (m.includes('haiku')) return HAIKU;
  // Default everything else (including unknown) to Sonnet — the workhorse.
  return SONNET;
}

// Exchange rate. Hardcoded for v1; a follow-up can make this configurable
// or pull from an FX feed. Updates monthly are fine — the variance dwarfs
// the cost-per-token precision of Anthropic's pricing.
export const USD_TO_INR = 84;

export interface TokenBuckets {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

export function costInr(buckets: TokenBuckets, model: string | null): number {
  const p = priceFor(model);
  const usd =
    (buckets.input / 1_000_000) * p.inputPerMTokUsd +
    (buckets.output / 1_000_000) * p.outputPerMTokUsd +
    (buckets.cacheCreation / 1_000_000) * p.cacheWritePerMTokUsd +
    (buckets.cacheRead / 1_000_000) * p.cacheReadPerMTokUsd;
  return usd * USD_TO_INR;
}

export function formatInr(rupees: number): string {
  if (rupees < 1) return `₹${rupees.toFixed(2)}`;
  if (rupees < 1000) return `₹${rupees.toFixed(0)}`;
  // Indian numbering (lakh/crore) commas: 12,34,567
  const whole = Math.round(rupees);
  const s = whole.toString();
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${grouped},${last3}`;
}
