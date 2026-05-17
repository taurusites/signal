#!/usr/bin/env bun
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { ClaudeAdapter } from './adapters/claude';
import { EventStore } from './core/EventStore';
import { PollScheduler } from './core/PollScheduler';
import { ProviderRegistry } from './core/ProviderRegistry';
import { loadConfig, writeDefaultConfig } from './core/config';
import { runJson } from './ui/json';
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
  .command('tui', { isDefault: true })
  .description('Live TUI (default)')
  .action(() => {
    writeDefaultConfig();
    const cfg = loadConfig();
    const store = new EventStore(cfg.dbPath);
    const registry = new ProviderRegistry();
    const all = [new ClaudeAdapter()];
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
