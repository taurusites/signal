#!/usr/bin/env bun
import { execFileSync } from 'node:child_process';
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { ClaudeAdapter } from './adapters/claude';
import { EventStore } from './core/EventStore';
import { PollScheduler } from './core/PollScheduler';
import { ProviderRegistry } from './core/ProviderRegistry';
import { configPath, loadConfig, setClaudeUseOauth, writeDefaultConfig } from './core/config';
import { runAuthClaude } from './ui/authClaude';
import { runDoctor } from './ui/doctor';
import { runJson } from './ui/json';
import { runServe } from './ui/serve';
import { runStatus } from './ui/status';
import { App } from './ui/tui/App';

const program = new Command();
program.name('signal').description('Multi-provider AI usage monitor').version('0.1.0');

program
  .command('status')
  .description('One-shot usage table')
  .action(async () => {
    const code = await runStatus();
    process.exit(code);
  });

program
  .command('json')
  .description('Machine-readable usage + hardware snapshot')
  .action(async () => {
    await runJson();
  });

program
  .command('serve')
  .description('Start the daemon + web tank UI (phone / tablet / browser)')
  .option('-p, --port <number>', 'HTTP + WebSocket port', '8787')
  .action(async (opts: { port: string }) => {
    await runServe({ port: Number.parseInt(opts.port, 10) });
  });

program
  .command('doctor')
  .description('Diagnose adapter auth and hardware sampling')
  .action(async () => {
    const code = await runDoctor();
    process.exit(code);
  });

program
  .command('config')
  .description('Open ~/.signal/config.toml in $EDITOR')
  .action(() => {
    writeDefaultConfig();
    const editor = process.env.EDITOR ?? 'vi';
    execFileSync(editor, [configPath()], { stdio: 'inherit' });
  });

const auth = program
  .command('auth')
  .description('Opt-in extras (the default JSONL path needs no auth setup)');

auth
  .command('claude')
  .description('Walkthrough to enable Claude OAuth for exact % utilization')
  .action(async () => {
    const code = await runAuthClaude();
    setClaudeUseOauth(true);
    process.exit(code);
  });

auth
  .command('claude-disable')
  .description('Disable Claude OAuth and fall back to JSONL-only (no keychain access)')
  .action(() => {
    setClaudeUseOauth(false);
    console.log('Claude OAuth disabled. signal will read JSONL only.');
  });

program
  .command('tui', { isDefault: true })
  .description('Live TUI (default)')
  .action(() => {
    writeDefaultConfig();
    const cfg = loadConfig();
    const store = new EventStore(cfg.dbPath);
    const registry = new ProviderRegistry();
    const all = [new ClaudeAdapter({ useOauth: cfg.claude.useOauth })];
    for (const a of all) if (cfg.enabledProviders.includes(a.id)) registry.register(a);
    const sched = new PollScheduler(store);
    for (const a of registry.list()) sched.add(a);
    render(
      React.createElement(App, {
        adapters: registry.list(),
        store,
        scheduler: sched,
        sampleIntervalMs: cfg.hardware.sampleIntervalMs,
        useSystemInformation: cfg.hardware.useSystemInformation,
      }),
    );
  });

program.parse();
