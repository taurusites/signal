# Changelog

All notable changes to `signal`. Format follows [Keep a Changelog](https://keepachangelog.com/) and the project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — v0.2.0 web tank + multi-provider

### Multi-provider (Codex)

- New `src/adapters/codex/` (`jsonl.ts` + `index.ts`) parses Codex CLI session logs at `~/.codex/sessions/<Y>/<M>/<D>/rollout-*.jsonl` and emits one `UsageEvent` per `event_msg.token_count` record; model attribution via the latest `turn_context.model` the parser has seen.
- No OAuth dance — Codex bakes rate-limit data into the JSONL records themselves. Walking the directory yields everything (5h + 7d windows, `used_percent`, `resets_at`, `plan_type`).
- `UsageEvent.reasoningOutputTokens?` added for hidden o-series / gpt-5 reasoning tokens; `EventStore` migration v2 adds the column.
- `Aggregator.aggregateProvider(events, { provider, displayName })` is now canonical (`aggregateClaude` kept as a thin alias). Reasoning tokens tracked separately on `ProviderSummary`; folded into output for cost calculation (Codex bills at output rate).
- `Pricing.ts` extended with GPT-5/Codex, o3, o4-mini, GPT-4o rate tables.
- Daemon snapshot envelope: `{ providers: { claude?, codex? }, claude (legacy), processes, hardware }` — backward-compat top-level `claude` field preserved.
- `Processes.detectCodexCliInstances()` finds `codex` CLI processes via pgrep + lsof, tagged with a `provider` field.
- New web `ProviderSwitcher` floating pill (top-left) shown when 2+ providers have data.
- `signal doctor` reports both providers separately with detection + recent-event count for Codex; exits 0 if any provider works.

### Web tank + daemon

- New `signal serve` command — HTTP + WebSocket daemon on `:8787` (Bun.serve).
- Snapshot pushed every 1s + on every `~/.claude/projects` / `~/.codex/sessions` file change (debounced 250ms).
- `/api/health`, `/api/snapshot`, `/ws` endpoints. Serves `web/dist/` with SPA fallback; prints LAN URLs for phone access on boot.
- New Vite + React + framer-motion frontend under `web/`.
- Pixel-art aquarium: gradient water, caustic flicker, bubbles, swaying kelp, pebble floor; glass data panels overlay the tank.
- 30 hand-tuned CSS-keyframe SVG animations from [clawd-tank](https://github.com/marciogranzotto/clawd-tank) (MIT) at `web/public/clawd/`. Mood mapping: chill → `idle-living`, focused → `working-typing`, cooking → `working-builder`, burning → `working-overheated`.
- WebSocket client with exponential reconnect backoff + iOS Safari background-throttle detection + `visibilitychange` re-open.
- Connection indicator with three states: `● live` (<3s), `● stale Ns`, `● offline`.
- PWA manifest + apple-touch-icon for phone "Add to Home Screen".

### Interactivity

- Cards on desktop wrapped in `DraggableCard` (framer-motion); offset persists in `localStorage`.
- Each card has a ▾/▴ collapse toggle, state also persisted.
- Crab is now interactive; tap plays a random reaction (wave / jump / spin / dance / surprise).
- Tap the big cost number to flip between INR ↔ USD.
- Tap the mood chip to manually cycle the crab's mood (override expires after 8s).
- Reset-layout button wipes positions + reloads.

### Notifications, mini-game, settings

- `useNotifications` hook + `Toasts` component: glass toasts on new turns + mood transitions.
- Mini-game: tap water → food drops → crab walks over → eats with sparkle + score.
- `Pager` for 2 swipe pages (tank + settings).
- `SettingsView` with FX rate, mood thresholds, toggles.
- `useMediaQuery` hook + `DataPanelMobile` for narrow viewports (≤720px stacked layout).

### Mobile

- iOS-Home-Screen-style 2-column grid of glass chips on phone (replaces stacked column).
- Accent borders coded by data semantics (cyan output, pink reset, lime session, yellow cache, etc.).
- Some chips span 2 columns (hero, last activity, recent feed).
- Mobile chip count: 14 → 7 after consolidation. Hero combines spend + session + reset. Token-flow includes cache-savings inline. Models becomes expandable.

### Live-process detection

- `ProjectTotal.lastTurnMs` added through Aggregator → wire → web.
- `projectStatus()` classifies: `live` (<90s), `recent` (<5min), `idle`.
- `LiveSessions` component with pulsing-green dot for live projects.
- New `src/core/Processes.ts`: `pgrep -f` + `lsof -d cwd` enumerate `claude` + `codex` CLI instances. Subagent children fold into their parent's CWD entry. Filters out macOS Claude.app helpers + signal's own daemon.
- Snapshot now includes `processes: CliInstance[]` with `{ provider, cwd, project, pids, startedAt }`.
- New `RunningSessions` widget — pulsing-dot live/recent/idle classification, uptime, lead PID, cost.

### Audio

- New `web/src/lib/sounds.ts` synthesizes footstep / splash / sparkle via Web Audio.
- Footstep: bandpass-filtered noise burst at ~2kHz, ~45ms decay — chitin tapping rock.
- Step trigger uses cumulative horizontal-distance accumulator (2.2% per step) — syncs to actual crab motion, not wall-clock.
- Footstep cadence follows mood walk speed (200ms burning → 720ms chill).
- Floating `SoundToggle` button bottom-left.
- `unlockAudio()` from any tap satisfies Safari autoplay policy.

### Pager fixes

- Pages laid out at exact `width: 100vw`; drag constraints `{ left: -(totalWidth-width), right: 0 }`.
- Velocity-based + offset-based swipe commit threshold (18% offset OR >350 px/s velocity).
- Arrow-key navigation for desktop.
- `touchAction: pan-y` on draggable strip so vertical scroll inside pages works while horizontal drag still pages.

### Documentation

- v0.2.0 README covers both terminal CLI and web tank, with screenshots of each.
- Web tank screenshot at `docs/screenshots/web.png`; terminal TUI screenshot at `docs/screenshots/terminal.png`.

---

## [0.1.0] — terminal TUI + Claude adapter

The first tagged release. Everything below shipped on the v0.1.0 tag.

- Live TUI built with Ink — hardware strip on top, Claude summary in the middle, animated pixel-art crab as the mood indicator.
- `signal status` — one-shot summary table with severity-coded exit codes (0/1/2).
- `signal json` — machine-readable snapshot.
- `signal doctor` — diagnose adapter detection + Claude auth + hardware sampling.
- `signal config` — opens `~/.signal/config.toml` in `$EDITOR`.
- Claude adapter — reads `~/.claude/projects/*.jsonl` for token usage by model. Optional OAuth path (`signal auth claude`) for exact % utilization.
- SQLite event store at `~/.signal/events.db` with migration system.
- Pricing for Anthropic Opus / Sonnet / Haiku in INR (with USD toggle).
- Hardware sampling — CPU, RAM, load average, GPU on macOS. Optional `systeminformation` for richer metrics.
- Pixel-art crab in the terminal — direct port of [Marcio Granzotto's clawd-tank](https://github.com/marciogranzotto/clawd-tank) (MIT) rendered as unicode half-blocks with truecolor fg/bg. 15×16 pixel sprite → 15-wide × 8-tall character cells.

[Unreleased]: https://github.com/shandar/signal/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shandar/signal/releases/tag/v0.1.0
