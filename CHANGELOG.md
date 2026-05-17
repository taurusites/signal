# Changelog — `main`

All notable changes on the main branch (the v1 terminal CLI). Format follows [Keep a Changelog](https://keepachangelog.com/). Each entry header is the commit short SHA on origin.

The v2 multi-display web tank lives on the `v2-multi-display` branch; its history is in `CHANGELOG.md` there.

---

## Unreleased — animated pixel-art crab

### Visual upgrade

#### `b6ce423` — docs: add terminal screenshot to README
- Live capture of the TUI in cooking mood, full dashboard visible

#### `6652041` — docs: update README for animated crab + v2 pointer
- Rewrites the README to lead with the animated pixel-art crab
- Adds a top-of-readme pointer to the `v2-multi-display` branch
- Reorders the follow-on plan list

#### `82afc68` — feat(tui): port clawd-tank pixel-art crab via half-blocks
- New `src/ui/tui/crabSprite.ts` — direct port of Marcio Granzotto's clawd-tank `clawd-static-base.svg` (MIT)
- 15×16 pixel sprite rendered as unicode half-blocks (`▀`) with truecolor fg/bg → 15×8 character cells
- 4-pose walk cycle per mood with per-pixel deltas (`bodyDx`, `eyeDx`, `leftArmDy`, `rightArmDy`, `legPattern`)
- Mood palettes: chill clay #DE886D → focused warm gold #E5A95D → cooking red-orange #E67050 → burning deep red #C03030
- Run-coalescer in `Crab.tsx` merges adjacent same-color cells into single `<Text>` segments for performance
- Particle row above the crab (cyan bubbles / yellow dots / yellow sparks / red heatwaves)

#### `8e78123` — chore(lint): allow template literals
- `biome.json` disables `noUnusedTemplateLiteral` — frame strings contain apostrophes (leg markers) so backticks are the right delimiter

#### `fef5865` — feat(tui): animate the terminal crab with multi-frame mood cycles
- First pass of TUI crab animation — frame-cycling unicode-block art (later replaced by the pixel-art port above)
- Auto-twitch loop with 4 reactions (wave / jump / dance / spin) every 18-40s

---

## v0.1.0 — terminal CLI, shipped 2026-05-17

Tagged at `39ae97a`. The original v1 release with the card-style Claude card and INR pricing.

### Card-style TUI + INR

#### `39ae97a` — feat(tui): crab character, INR pricing, in→out flow, per-project breakdown, session timeline
- ASCII crab with mood states (chill/focused/cooking/burning)
- INR cost calculation (`src/core/Pricing.ts`) with Indian lakh/crore comma grouping
- Per-model and per-project breakdown with cost
- Session-progress timeline (rolling 5h window)
- Input → output flow in headline + recent feed

#### `56e782e` — feat(tui): card-style Claude view with reset countdown, model split, recent feed
- Replaces minimal one-row Claude view with a richer card
- Reset countdown (session start + 5h)
- Top-3 model breakdown
- Recent 5 turns feed

### JSONL-first default

#### `522aad2` — feat: make JSONL the default Claude path; OAuth opt-in
- `claude.useOauth: false` default in `config.toml`
- `ClaudeAdapter` skips keychain entirely when false
- Poll cadence drops 150s → 5s when OAuth is off (JSONL has no rate limit)
- TUI watches `~/.claude/projects` via `fs.watch` (debounced 250ms) for sub-second updates
- New `signal auth claude` walkthrough for the opt-in OAuth path
- `signal doctor` cleaned up — no "needs_auth" line when OAuth is disabled

#### `3c0966a` — fix(ui): surface JSONL token tally when OAuth utilization unavailable
- Previously: silent `—` when OAuth was off, even with active Claude turns writing JSONL
- Now: token count over 5h window appears in the cell instead

### Polish + LICENSE

#### `3e85729` — fix: surface OAuth token expiry, add LICENSE, wire c/? keys, fix bin path
- `TokenExpiredError` re-thrown so PollScheduler records the error visibly in the UI
- MIT LICENSE file added
- TUI keybinds: `?` toggles help, `c` exits (then run `signal config` for `$EDITOR`)
- `package.json` `bin` points to `./src/index.ts`; `files` array declares the npm publish manifest

#### `ef6db6f` — chore: add react-devtools-core, fix package.json indent
- `react-devtools-core` is an ink compile-time dep that was missing
- Drop stale biome-ignore comment

### v1.0 release readiness

#### `c447de4` — docs: add README with install, usage, and v1.0 status
- Initial release-quality README

#### `ff10aeb` — test(ui): Ink snapshot tests for status table
- `ink-testing-library` smoke tests for the status table render

### Subcommands

#### `f79d1b0` — feat(ui): signal doctor diagnostics and signal config editor launch
- `signal doctor` reports config path, Claude detection, hardware sample with truecolor severity
- `signal config` opens `~/.signal/config.toml` in `$EDITOR`

#### `8d5f42d` — feat(ui): live TUI with hardware strip, provider rows, sparklines and burn-rate ETA
- Default `signal` command launches the live TUI (Ink default command)
- Hardware strip at the top: CPU + RAM bars + load + GPU
- Sparklines per provider row, burn-rate calc, ETA-to-cap formatting

#### `84b574e` — feat(ui): signal json with provider snapshot + hardware sample
- `signal json` emits a single JSON snapshot for scripts and statuslines
- Includes per-provider snapshot + burn rate + ETA + hardware bucket

#### `ad350a9` — feat(ui): signal status one-shot Ink table with severity exit codes
- `signal status` renders a one-shot Ink table and exits
- Exit codes: 0 ok / 1 warn (>70%) / 2 crit (>90%)

### Core utilities

#### `1300432` — feat(core): config loader (TOML) and GitJoiner stub
- `src/core/config.ts` reads `~/.signal/config.toml` with merge-with-defaults
- `GitJoiner` stub reserves the seam for v2 ROI work (git × events join)

#### `187efd8` — feat(core): HardwareSampler
- `node:os` module baseline (CPU diff via two snapshots, mem from `freemem`/`totalmem`, `loadavg`)
- Optional `systeminformation` dep for richer per-core CPU, mem pressure, macOS GPU

#### `99defb3` — feat(core): Forecaster
- `burnRatePerHour(points)` with 2h rolling window
- `etaToCapMs(currentUtilization, burnRate)` for "time until 100%" projection
- `formatEta(ms)` for display

#### `eb25fcc` — feat(core): ProviderRegistry and PollScheduler
- `ProviderRegistry` — map-based collection of adapters
- `PollScheduler` — per-adapter interval + exponential backoff
- Per-adapter error isolation: one failing adapter never blocks the others

### Claude adapter

#### `501c0c8` — docs(adapters/claude): document hyphen-ambiguity + tighten oauth type cast
- Code comment explaining that Claude's project-dir encoding loses fidelity on hyphenated path segments
- Comment on the timestamp fallback in JSONL parser
- `as never` → proper `RawWindow` type in oauth.ts

#### `b71c100` — feat(adapters/claude): compose JSONL + OAuth into ProviderAdapter
- `ClaudeAdapter` combines `parseClaudeSession()` JSONL fallback with `fetchUsage()` OAuth
- 429 backoff (5-min sleep after rate-limit error)

#### `577b26f` — feat(adapters/claude): keychain reader + OAuth usage client
- `readClaudeKeychain()` via macOS `security` CLI, with darwin/non-darwin guard
- `fetchUsage()` posts to Anthropic's usage API with the exact `oauth-2025-04-20` beta header
- 429 → `RateLimitedError`, 401 → `TokenExpiredError`

#### `027de2c` — feat(adapters/claude): JSONL parser
- Defensive line-by-line parser of `~/.claude/projects/*.jsonl`
- Skip malformed lines without throwing
- `decodeProjectDirName('-Users-x-proj')` → `/Users/x/proj`
- `findClaudeProjectDirs()` + `findRecentSessionFiles()` helpers

### EventStore + types

#### `887a9c7` — feat(core): EventStore on bun:sqlite
- SQLite event store at `~/.signal/events.db`
- Tables: `events`, `state`, `git_commits` (empty, for v2), `hw_samples`, `schema_version`
- Inline migrations as string constants (works with `bun build --compile`)
- Round-trip tests for events + hardware samples

#### `fcd3d55` — feat(core): define UsageEvent, HwSample, AuthStatus, ProviderAdapter types
- `src/core/types.ts` — single source of truth for all cross-module types

### Initial scaffolding

#### `19d52e2` — chore: drop better-sqlite3 in favor of built-in bun:sqlite
- Sidesteps the Node/Bun ABI mismatch with native SQLite bindings

#### `edaeb61` — chore: drop unused ink-table dep and trust better-sqlite3 postinstall
- Pre-bun:sqlite cleanup

#### `94ee153` — chore: scaffold Bun + TypeScript project with Biome and commander
- Initial project setup, biome.json, tsconfig, package.json
