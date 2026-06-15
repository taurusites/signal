# Status — `main`

> **What this is**: a working snapshot so you can pick up the branch cold months from now. Read top-to-bottom in 90 seconds.

**Last updated**: 2026-05-17
**Last commit**: `b6ce423` docs: add terminal screenshot to README
**Tag**: `v0.1.0` at `39ae97a`
**Sibling branch**: `v2-multi-display` (web tank for phone / tablet / browser / external display)

---

## What works right now

Run `signal` from this branch and you get the terminal CLI:

- **Animated pixel-art crab** — direct port of [Marcio Granzotto's clawd-tank](https://github.com/marciogranzotto/clawd-tank) sprite (MIT), rendered via unicode half-blocks with truecolor fg/bg. 15×16 pixel sprite → 15×8 character cells.
- **Mood-driven motion** — chill / focused / cooking / burning, each with 4 walk poses (body shift, eye drift, claw bob, leg pattern) and its own palette
- **Ambient particle row** above the crab (cyan bubbles / yellow dots / yellow sparks / red heatwaves)
- **JSONL-first** — reads `~/.claude/projects/*.jsonl` via `fs.watch`, sub-second updates
- **OAuth opt-in** via `signal auth claude` for exact 5h/7d utilization% (most users skip it)
- **5 subcommands**: `signal` (TUI), `signal status`, `signal json`, `signal doctor`, `signal config`, `signal auth claude`
- **INR-first cost** with Indian lakh/crore grouping
- **Per-model + per-project breakdown** with cost
- **Hardware strip** — CPU + RAM bars + load avg + GPU (macOS)
- **Recent turns feed** with input → output flow
- **Session reset countdown** + clock time
- **Severity-coded exit codes** on `signal status` (0 ok / 1 warn / 2 crit)
- **Bun-compiled single binary** (`bun run compile` → `dist/signal`, ~60MB self-contained)

## Architecture

```
~/.claude/projects/*.jsonl   ←  Claude Code writes turns here
            │
            ▼
       Ink-rendered TUI loop (src/ui/tui/App.tsx)
       • fs.watch + 5s safety poll
       • PollScheduler runs adapters concurrently
            │
            ▼
       SQLite event store (~/.signal/events.db)
            │ aggregateClaude() → ClaudeSummary
            ▼
       Crab + Card components in Ink (src/ui/tui/)
            │
            ▼
       Terminal (TTY)
```

Three layers, one-way imports:

| Layer | Responsibility | Location |
|---|---|---|
| Adapters | Per-provider data fetch + normalize | `src/adapters/<provider>/` |
| Core | Aggregation, scheduling, storage, pricing | `src/core/` |
| UI | Ink components, render loop, subcommands | `src/ui/` |

## Key file locations

| Concern | File |
|---|---|
| CLI entry + subcommand wiring | `src/index.ts` |
| Live TUI root | `src/ui/tui/App.tsx` |
| Animated pixel-art crab component | `src/ui/tui/Crab.tsx` |
| Crab sprite + pose grid | `src/ui/tui/crabSprite.ts` |
| Provider row | `src/ui/tui/ProviderRow.tsx` |
| Header bar (hardware + identity) | `src/ui/tui/HeaderBar.tsx` |
| One-shot status command | `src/ui/status.tsx` |
| JSON snapshot command | `src/ui/json.ts` |
| Doctor command | `src/ui/doctor.tsx` |
| Auth walkthrough | `src/ui/authClaude.tsx` |
| Event aggregator | `src/core/Aggregator.ts` |
| Pricing (INR per token by model) | `src/core/Pricing.ts` |
| SQLite event store | `src/core/EventStore.ts` |
| Forecaster (burn rate + ETA) | `src/core/Forecaster.ts` |
| Hardware sampler | `src/core/HardwareSampler.ts` |
| Provider registry + poll scheduler | `src/core/Provider*.ts` |
| GitJoiner stub | `src/core/GitJoiner.ts` (empty; reserved for v2.5 ROI work) |
| Config loader (TOML) | `src/core/config.ts` |
| Claude JSONL parser | `src/adapters/claude/jsonl.ts` |
| Claude OAuth client | `src/adapters/claude/oauth.ts` |
| Claude keychain reader | `src/adapters/claude/keychain.ts` |
| Tests | `tests/` (21 tests across core + adapters + ui) |

## Resuming after a break

```bash
cd "<repo>"
git checkout main
bun install
bun run lint
bunx tsc --noEmit
bun test                   # should report: 21 pass, 0 fail
bun run compile            # produces dist/signal (~60MB)
./dist/signal              # launches the TUI
```

For doctor / status / json one-offs:

```bash
./dist/signal doctor
./dist/signal status
./dist/signal json | jq    # if you have jq
```

To enable OAuth (exact-% utilization, requires Keychain ACL grant):

```bash
./dist/signal auth claude
# Walkthrough explains the macOS Keychain Access steps
```

---

## What's next

In rough priority order. Each item is roughly its own session.

### High-value, near-term

1. **Codex adapter** — `src/adapters/codex/` mirroring the Claude pattern. Reads `~/.codex/sessions/*.jsonl`. Field shape needs verification first. ~1-2 sessions.
2. **Cursor adapter** — Cursor stores tokens in `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (SQLite). Schema varies between Cursor versions — defensive parsing required. ~2 sessions.
3. **Gemini CLI adapter** — `~/.gemini/` log format check, then adapter. ~1 session.
4. **GitHub Copilot adapter** — no local logs; needs `gh auth token` + Copilot billing endpoints. Experimental flag; may slip to v1.2. ~2 sessions.

### Distribution

5. **Notarized macOS build** — Apple Developer ID signing + `notarytool` stapling. Required for friction-free brew install. ~1 session.
6. **Homebrew tap** — `affordance/tap/signal` formula. Cask version of the notarized binary. ~1 session.
7. **npm publish workflow** — `@affordance/signal` published to npm with `bun:sqlite` as the runtime requirement documented. CI on tag push. ~1 session.

### Polish

8. **Live TUI cost-per-PR widget** — once GitJoiner is wired up (see v2.5 below), surface "today's cost per merged PR" in the TUI. ~half session.
9. **Per-session-not-per-project rollups** — events already carry `sessionId`; switch the aggregation key. ~half session.
10. **`signal stats`** — a new subcommand that prints a 30-day historical view (sparklines, peak hours, weekly breakdown). ~1 session.
11. **Color-blind-friendly mode** — currently green/yellow/red severity. Add `--no-color` and a high-contrast palette via settings. ~half session.

### Architectural / longer-term

12. **ROI layer (v2.5)** — populate the `git_commits` table via the GitJoiner stub. Walk every `git log` once on first run, then watch `~/.gitconfig` and modified repos. Cross-reference with `events.ts` to compute cost per commit / per PR. ~3-4 sessions.
13. **Predictive intervention** — burn-rate forecaster says "you'll hit 100% in 47 min." Suggest model-downgrade for cheap prompts via a small badge in the TUI. ~2 sessions.

### Stretch / longer-shot

14. **Linux process detection** — `Processes.ts` is macOS-only (uses `lsof -d cwd`). Add `/proc/<pid>/cwd` readlink for Linux parity. ~half session.
15. **Smart-statusline export** — a `signal statusline` subcommand that emits a single-line plaintext usage string suitable for tmux / starship / oh-my-zsh prompts. ~1 session.

---

## Open questions / decisions to revisit

- **When does main get merged with v2?** Currently they're parallel branches. Once Tauri wrappers exist on v2, the right call is probably "v2 becomes main" and the current main becomes a `legacy-tui` branch (or vanishes since v2 contains both the TUI and the web tank). Decision deferred until v2 has a Tauri wrapper.
- **Should `signal auth claude` ship enabled by default?** Currently OAuth is opt-in. The case for default-on: exact % utilization is the headline feature for power users. The case for default-off (current): macOS Keychain prompts are user-hostile and break on rebuilds. Sticking with off — but worth revisiting if we ever get a notarized binary that's persistently-allowed in the ACL.
- **Where does the TUI get the user's tier?** We don't currently know if you're on Pro / Team / Enterprise — utilization is always "% of whatever Anthropic says is your cap." Future opt-in setting could let users override their cap manually for cost projection.

## Known limitations / "by design"

- **macOS-only for live-process detection.** Linux/Windows users get the TUI but not the "running terminals" widget that's on v2. Easy to fix when needed.
- **No multi-machine view.** Each `signal` install reads only the local `~/.claude/projects/`. A cloud-aggregated view isn't planned — it'd require auth + a hosted service.
- **Pricing table hardcoded.** `src/core/Pricing.ts` has Opus / Sonnet / Haiku rates baked in. When Anthropic updates pricing, the table updates manually. No live pricing API exists at Anthropic.
- **FX rate hardcoded** at 84 ₹/USD. Editable via `signal config` (manual). Future: optional FX feed.
- **JSONL fallback only shows tokens, not %.** Exact % requires OAuth — by design.
