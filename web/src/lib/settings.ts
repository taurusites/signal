// User-tunable settings. Live next to layout/currency helpers but keyed
// separately so a reset-layout doesn't blow these away.

const SETTINGS_KEY = 'signal:settings:v1';

export interface UserSettings {
  // ₹ per $. Default 84; user can override.
  usdToInr: number;
  // Token-count thresholds at which the crab changes mood.
  moodThresholds: { focused: number; cooking: number; burning: number };
  // Toast & mini-game toggles.
  toastsEnabled: boolean;
  miniGameEnabled: boolean;
  // Daemon URL — empty string means "same origin as the page" which is
  // what you want when served by the daemon itself; only override when
  // running the Vite dev server against a non-default daemon port.
  daemonOverride: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  usdToInr: 84,
  moodThresholds: { focused: 500_000, cooking: 5_000_000, burning: 20_000_000 },
  toastsEnabled: true,
  miniGameEnabled: true,
  daemonOverride: '',
};

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      moodThresholds: {
        ...DEFAULT_SETTINGS.moodThresholds,
        ...(parsed.moodThresholds ?? {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: UserSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function resetSettings(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SETTINGS_KEY);
}

// Mood from tokens, parameterized by current thresholds.
export function moodFromTokensWithSettings(
  tokens: number,
  thresholds: UserSettings['moodThresholds'],
): 'chill' | 'focused' | 'cooking' | 'burning' {
  if (tokens < thresholds.focused) return 'chill';
  if (tokens < thresholds.cooking) return 'focused';
  if (tokens < thresholds.burning) return 'cooking';
  return 'burning';
}
