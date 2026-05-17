import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { decodeProjectDirName, parseClaudeSession } from '../../../src/adapters/claude/jsonl';

const FIXTURES = join(import.meta.dir, '../../fixtures/claude');

describe('parseClaudeSession', () => {
  test('aggregates token usage from assistant messages', () => {
    const events = parseClaudeSession(join(FIXTURES, 'session-normal.jsonl'), '/Users/x/proj');
    expect(events).toHaveLength(2);
    const first = events[0];
    expect(first?.inputTokens).toBe(120);
    expect(first?.cacheReadTokens).toBe(1000);
    expect(first?.model).toBe('claude-opus-4-7');
    expect(first?.sessionId).toBe('sess-1');
    expect(first?.projectPath).toBe('/Users/x/proj');
  });

  test('skips malformed lines without throwing', () => {
    const events = parseClaudeSession(join(FIXTURES, 'session-malformed.jsonl'), '/Users/x/proj');
    expect(events).toHaveLength(2);
    expect(events[0]?.inputTokens).toBe(50);
    expect(events[1]?.inputTokens).toBe(10);
  });
});

describe('decodeProjectDirName', () => {
  test('decodes dash-encoded project paths', () => {
    expect(decodeProjectDirName('-Users-shandar-signal')).toBe('/Users/shandar/signal');
  });

  test('returns name unchanged if no leading dash', () => {
    expect(decodeProjectDirName('weird-name')).toBe('weird-name');
  });
});
