import { Box, Text } from 'ink';
import React from 'react';
import {
  type ClaudeSummary,
  formatAge,
  formatCountdown,
  formatTokens,
  shortModel,
} from '../../core/Aggregator';
import { bar, severityColor } from './theme';

interface Props {
  summary: ClaudeSummary;
  lastError: string | null;
}

// Synthesize a 0-100 "intensity" for the bar from tokens-in-window using a
// log scale capped at 50M (one big day). Pure visual signal — not a quota.
function intensityPct(tokens: number): number {
  if (tokens <= 0) return 0;
  const max = 50_000_000;
  const pct = (Math.log10(tokens + 1) / Math.log10(max + 1)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function ClaudeCard({ summary, lastError }: Props): React.ReactElement {
  const tokens = summary.tokensWindow;
  const pct = intensityPct(tokens);
  const color = severityColor(pct);
  const reset = formatCountdown(summary.resetsAtMs);
  const top = summary.byModel.slice(0, 3);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="white" paddingX={1}>
      <Box>
        <Text bold>Claude Code</Text>
        {summary.currentProject ? (
          <>
            <Text dimColor>
              {'   '}·{'  '}
            </Text>
            <Text color="cyan">{summary.currentProject}</Text>
          </>
        ) : null}
        {summary.currentModel ? (
          <>
            <Text dimColor>
              {'  '}·{'  '}
            </Text>
            <Text>{shortModel(summary.currentModel)}</Text>
          </>
        ) : null}
        {summary.latestAgeMs !== null ? (
          <>
            <Text dimColor>
              {'  '}·{'  '}last turn {formatAge(summary.latestAgeMs)}
            </Text>
          </>
        ) : null}
      </Box>

      <Box marginTop={1}>
        <Box width={14}>
          <Text bold color={color}>
            {tokens === 0 ? '— tok' : `${formatTokens(tokens)} tok`}
          </Text>
        </Box>
        <Box width={28}>
          <Text color={color}>{bar(pct, 22)}</Text>
        </Box>
        <Text dimColor>5h window</Text>
      </Box>

      <Box>
        <Box width={14}>
          <Text dimColor>resets in</Text>
        </Box>
        <Text color="magenta">{reset}</Text>
      </Box>

      {top.length > 0 ? (
        <Box marginTop={1}>
          {top.map((m, i) => (
            <React.Fragment key={m.model}>
              {i > 0 ? <Text dimColor>{'  ·  '}</Text> : null}
              <Text>
                {shortModel(m.model)} <Text bold>{formatTokens(m.tokens)}</Text>
              </Text>
            </React.Fragment>
          ))}
        </Box>
      ) : null}

      {summary.recent.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>recent</Text>
          {summary.recent.map((r, i) => (
            <Box key={`${r.ts.getTime()}-${i}`}>
              <Text dimColor>{'  · '}</Text>
              <Box width={9}>
                <Text>{shortModel(r.model)}</Text>
              </Box>
              <Box width={9}>
                <Text>{formatTokens(r.tokens)}</Text>
              </Box>
              <Box width={11}>
                <Text dimColor>{formatAge(Date.now() - r.ts.getTime())}</Text>
              </Box>
              <Text color="cyan">{r.project}</Text>
            </Box>
          ))}
        </Box>
      ) : null}

      {lastError ? (
        <Box marginTop={1}>
          <Text color="red">! {lastError}</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="yellow">
            *{' '}
            {summary.currentProject
              ? `${summary.currentProject} · ${shortModel(summary.currentModel ?? '')} · ${formatAge(summary.latestAgeMs)}`
              : 'idle'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
