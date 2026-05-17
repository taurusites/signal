import { useState } from 'react';
import { resetLayout } from '../lib/layout';
import { DEFAULT_SETTINGS, type UserSettings, resetSettings, saveSettings } from '../lib/settings';

interface Props {
  settings: UserSettings;
  onChange: (s: UserSettings) => void;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13 }}>{label}</div>
        <div>{children}</div>
      </div>
      {hint ? <div style={{ fontSize: 11, color: 'var(--dim)' }}>{hint}</div> : null}
    </div>
  );
}

function NumberInput({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }): JSX.Element {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
      style={{
        width: 110,
        padding: '6px 10px',
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 4,
        fontFamily: 'inherit',
        fontSize: 13,
        textAlign: 'right',
      }}
    />
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      style={{
        width: 42,
        height: 22,
        padding: 0,
        background: value ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.12)',
        border: 0,
        borderRadius: 999,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: '#0a0d18',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
}

export function SettingsView({ settings, onChange }: Props): JSX.Element {
  const [local, setLocal] = useState<UserSettings>(settings);
  const update = (patch: Partial<UserSettings>): void => {
    const next = { ...local, ...patch };
    setLocal(next);
    saveSettings(next);
    onChange(next);
  };
  const updateMood = (key: keyof UserSettings['moodThresholds'], v: number): void => {
    const next = { ...local, moodThresholds: { ...local.moodThresholds, [key]: v } };
    setLocal(next);
    saveSettings(next);
    onChange(next);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
        padding: '56px 20px 24px',
        background: 'linear-gradient(to bottom, #07101f, #050811)',
      }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Settings</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 18 }}>
          stored on this device. resets don't affect saved Claude data.
        </div>

        <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
          currency
        </div>
        <Row label="USD → INR rate" hint="used for the optional ₹ display. defaults to 84.">
          <NumberInput value={local.usdToInr} onChange={(v) => update({ usdToInr: v })} step={0.5} min={1} />
        </Row>

        <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 18 }}>
          crab moods
        </div>
        <Row label="focused at" hint="token count where crab moves from chill → focused">
          <NumberInput value={local.moodThresholds.focused} onChange={(v) => updateMood('focused', v)} step={50_000} />
        </Row>
        <Row label="cooking at" hint="focused → cooking">
          <NumberInput value={local.moodThresholds.cooking} onChange={(v) => updateMood('cooking', v)} step={250_000} />
        </Row>
        <Row label="burning at" hint="cooking → burning (on fire)">
          <NumberInput value={local.moodThresholds.burning} onChange={(v) => updateMood('burning', v)} step={1_000_000} />
        </Row>

        <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 18 }}>
          interactions
        </div>
        <Row label="toast notifications" hint="pop a toast when Claude finishes a turn or the crab changes mood">
          <Toggle value={local.toastsEnabled} onChange={(v) => update({ toastsEnabled: v })} />
        </Row>
        <Row label="mini-game" hint="tap the water to drop food; crab walks over and eats it">
          <Toggle value={local.miniGameEnabled} onChange={(v) => update({ miniGameEnabled: v })} />
        </Row>

        <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 18 }}>
          danger zone
        </div>
        <Row label="reset card layout">
          <button
            type="button"
            onClick={() => {
              resetLayout();
              window.location.reload();
            }}
            style={dangerBtn}
          >
            reset
          </button>
        </Row>
        <Row label="reset all settings to defaults">
          <button
            type="button"
            onClick={() => {
              resetSettings();
              setLocal(DEFAULT_SETTINGS);
              onChange(DEFAULT_SETTINGS);
            }}
            style={dangerBtn}
          >
            reset
          </button>
        </Row>

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--dim)', textAlign: 'center' }}>
          signal · Affordance Design Studio · MIT
        </div>
      </div>
    </div>
  );
}

const dangerBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(255,90,110,0.12)',
  color: 'var(--crit)',
  border: '1px solid rgba(255,90,110,0.4)',
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};
