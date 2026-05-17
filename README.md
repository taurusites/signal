# signal

Multi-provider usage monitor for AI coding agents. **Signal, not noise.**

`signal` watches your AI usage and host hardware in one TUI. Live token counts from Claude Code (v1.0) plus a CPU/RAM/GPU strip. Codex, Cursor, Gemini, and Copilot adapters land in v1.1. Built by [Affordance Design Studio](https://affordance.design). MIT.

## Why

Other monitors lean on the macOS Keychain to fetch exact `%` utilization from Anthropic's API. That requires per-binary Keychain ACL grants and breaks on every rebuild. `signal` reads your local Claude Code JSONL session logs instead — zero prompts, zero keychain access, zero auth dance. You get **real token counts, models, projects, sessions, and a hardware strip**, updated within a second of Claude writing a turn.

If you want exact `%` of plan limit (5h / 7d / Opus / Sonnet), run `signal auth claude` for an optional walkthrough. Most users never need it.

## Install

```bash
# macOS — recommended
brew install affordance/tap/signal

# Anywhere with Bun (or run `npm i -g bun` first)
npm install -g @affordance/signal
```

## Use

```bash
signal                 # live TUI — hardware strip + Claude row, updates within 1s
signal status          # one-shot table — exit 0 ok, 1 warn (>70%), 2 crit (>90%)
signal json            # machine-readable snapshot for scripts and statuslines
signal doctor          # diagnose adapter detection and hardware sampling
signal config          # edit ~/.signal/config.toml in $EDITOR

# Opt-in extras
signal auth claude           # walkthrough: enable exact-% via Anthropic OAuth (needs Keychain ACL grant)
signal auth claude-disable   # turn OAuth back off, return to JSONL-only
```

## How it works

`signal` reads `~/.claude/projects/*.jsonl` — the same logs Claude Code writes for every turn — and aggregates them locally in a SQLite event store at `~/.signal/events.db`. A `fs.watch` on the projects directory pushes new turns into the TUI within ~250ms. Nothing leaves your machine. No telemetry, no accounts, no API keys to manage.

Hardware sampling (CPU, RAM, load average, GPU on macOS) runs only while the TUI is alive. Baseline uses Node's `os` module; install the optional `systeminformation` dep for per-core CPU, memory pressure, and richer GPU metrics.

## Configuration

`signal config` opens `~/.signal/config.toml`. Defaults:

```toml
enabledProviders = ["claude"]
dbPath = "~/.signal/events.db"

[hardware]
sampleIntervalMs = 2000
useSystemInformation = true

[claude]
useOauth = false   # set true (or run `signal auth claude`) for exact % utilization
```

## Credits

The animated pixel-art crab in the web tank (`web/public/clawd/*.svg`) is from
[clawd-tank](https://github.com/marciogranzotto/clawd-tank) by Marcio Granzotto
Rodrigues, used under the MIT License. See `web/public/clawd/NOTICE.md`.

## Status

**v1.0 — Claude + hardware, zero-config.** Source MIT. Issues and PRs welcome at github.com/shandar/signal.

Follow-on plans, in priority order:
1. **v1.1** — Codex, Cursor, and Gemini adapters
2. **v1.2** — GitHub Copilot adapter (experimental)
3. **v1.3** — Homebrew tap + notarized binaries + npm publish workflow
4. **v2.0** — ROI layer (cost per shipped PR via `git_commits` join), predictive intervention
5. **v3.0** — Tauri cross-platform tray + VS Code/Cursor sidebar
