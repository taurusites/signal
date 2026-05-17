#!/usr/bin/env bun
import { Command } from 'commander';
import { runStatus } from './ui/status';

const program = new Command();
program.name('signal').description('Multi-provider AI usage monitor').version('0.1.0');

program
  .command('status')
  .description('One-shot usage table')
  .action(async () => {
    const code = await runStatus();
    process.exit(code);
  });

program.parse();
