import { Box, Text, render } from 'ink';
import React from 'react';
import { readClaudeKeychain } from '../adapters/claude/keychain';
import { fetchUsage } from '../adapters/claude/oauth';

export async function runAuthClaude(): Promise<number> {
  // Check whether we already have working access.
  let working = false;
  let probeError: string | null = null;
  const creds = readClaudeKeychain();
  if (creds) {
    try {
      await fetchUsage(creds.accessToken);
      working = true;
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }
  }

  const { unmount } = render(
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>signal — Claude OAuth setup</Text>
      <Text> </Text>
      {working ? (
        <>
          <Text color="green">✓ Keychain access already granted — OAuth is working.</Text>
          <Text>signal will now use the exact 5h / 7d utilization % from Anthropic's API.</Text>
        </>
      ) : (
        <>
          <Text>
            JSONL mode (the default) gives you tokens, models, projects, sessions — without any
            system-level access. You only need this walkthrough if you want the exact{' '}
            <Text bold>% of plan utilization</Text> and <Text bold>reset timer</Text> from
            Anthropic's API.
          </Text>
          <Text> </Text>
          <Text bold>To enable OAuth:</Text>
          <Text>1. Open Keychain Access (Cmd+Space → "Keychain Access")</Text>
          <Text>2. Search for: Claude Code-credentials</Text>
          <Text>3. Double-click the entry → Access Control tab</Text>
          <Text>4. Click + → navigate to and select the `signal` binary</Text>
          <Text>5. Click Save Changes (you'll need your login password)</Text>
          <Text> </Text>
          <Text>Then re-run `signal auth claude` to verify.</Text>
          <Text> </Text>
          <Text dimColor>To leave OAuth off and stay on the default JSONL path:</Text>
          <Text dimColor>{'  signal auth claude-disable'}</Text>
          {probeError ? (
            <>
              <Text> </Text>
              <Text dimColor>Last probe: {probeError}</Text>
            </>
          ) : null}
        </>
      )}
    </Box>,
  );
  unmount();
  return working ? 0 : 1;
}
