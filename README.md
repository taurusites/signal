# signal

Multi-provider usage monitor for AI coding agents. **Signal, not noise.**

`signal` watches your AI usage across Claude Code (v1.0) and your host hardware in one TUI. Codex, Cursor, Gemini, and Copilot adapters land in v1.1. Built by [Affordance Design Studio](https://affordance.design). MIT.

## Install

```bash
# macOS — recommended
brew install affordance/tap/signal

# Anywhere with Bun (or run `npm i -g bun` first)
npm install -g @affordance/signal
```

## Use

```bash
signal           # live TUI with hardware strip (CPU · RAM · GPU · load avg)
signal status    # one-shot table — exit 0 ok, 1 warn (>70%), 2 crit (>90%)
signal json      # machine-readable snapshot for scripts and statuslines
signal doctor    # diagnose adapter auth and hardware sampling
signal config    # edit ~/.signal/config.toml in $EDITOR
```

## How it works

Reads Claude OAuth credentials from the macOS Keychain and queries the same usage endpoint Claude Code itself uses. Falls back to parsing `~/.claude/projects/*.jsonl` when OAuth is unavailable. All data stays on your machine — one local SQLite at `~/.signal/events.db`. No telemetry. No accounts.

Hardware sampling (CPU, RAM, load average, GPU on macOS) runs only while the TUI is alive. The base layer uses Node's `os` module; install the optional `systeminformation` dep for per-core CPU, memory pressure, and richer GPU metrics.

## Configuration

`signal config` opens `~/.signal/config.toml`. Defaults:

```toml
enabledProviders = ["claude"]
dbPath = "~/.signal/events.db"

[hardware]
sampleIntervalMs = 2000
useSystemInformation = true
```

## Status

**v1.0 — Claude + hardware.** Source MIT. Issues and PRs welcome at github.com/shandar/signal.

Follow-on plans, in priority order:
1. **v1.1** — Codex, Cursor, and Gemini adapters
2. **v1.2** — GitHub Copilot adapter (experimental)
3. **v1.3** — Homebrew tap + notarized binaries + npm publish workflow
4. **v2.0** — ROI layer (cost per shipped PR via `git_commits` join), predictive intervention
5. **v3.0** — Tauri cross-platform tray + VS Code/Cursor sidebar
