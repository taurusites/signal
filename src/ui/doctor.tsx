import { Box, Text, render } from 'ink';
import React from 'react';
import { ClaudeAdapter } from '../adapters/claude';
import { HardwareSampler } from '../core/HardwareSampler';
import { configPath } from '../core/config';

export async function runDoctor(): Promise<number> {
  const claude = new ClaudeAdapter();
  const detected = await claude.detect();
  const auth = await claude.authStatus();
  let hwOk = false;
  let hwNote = '';
  try {
    const s = await new HardwareSampler().sample();
    hwOk = s.memTotalBytes > 0 && s.cpuPct >= 0;
    const memPct = ((s.memUsedBytes / s.memTotalBytes) * 100).toFixed(0);
    const gpu = s.gpuPct === null ? 'n/a' : `${s.gpuPct.toFixed(0)}%`;
    hwNote = `cpu ${s.cpuPct.toFixed(0)}% · ram ${memPct}% · gpu ${gpu}`;
  } catch (e) {
    hwNote = e instanceof Error ? e.message : String(e);
  }

  const remediation = auth.kind === 'needs_auth' ? ` — ${auth.remediation}` : '';

  const { unmount } = render(
    <Box flexDirection="column" borderStyle="single">
      <Box paddingX={1}>
        <Text bold>signal doctor</Text>
      </Box>
      <Box paddingX={1}>
        <Text>
          config: <Text color="cyan">{configPath()}</Text>
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text>
          Claude detected: <Text color={detected ? 'green' : 'red'}>{detected ? 'yes' : 'no'}</Text>
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text>
          Claude auth: <Text color={auth.kind === 'ok' ? 'green' : 'yellow'}>{auth.kind}</Text>
          {remediation}
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text>
          hardware: <Text color={hwOk ? 'green' : 'red'}>{hwOk ? 'ok' : 'fail'}</Text> — {hwNote}
        </Text>
      </Box>
    </Box>,
  );
  unmount();
  return detected && auth.kind === 'ok' && hwOk ? 0 : 1;
}
