import { Box, Text } from 'ink';
import {
  type ClaudeSummary,
  formatAge,
  formatClockTime,
  formatCountdown,
  formatTokens,
  moodFor,
  sessionProgressPct,
  shortModel,
} from '../../core/Aggregator';
import { formatInr } from '../../core/Pricing';
import { Crab } from './Crab';
import { bar, severityColor } from './theme';

interface Props {
  summary: ClaudeSummary;
  lastError: string | null;
}

function intensityPct(tokens: number): number {
  if (tokens <= 0) return 0;
  const max = 50_000_000;
  return Math.max(0, Math.min(100, (Math.log10(tokens + 1) / Math.log10(max + 1)) * 100));
}

// Mini horizontal bar with custom width — for model/project breakdown rows.
function miniBar(pct: number, width = 12): string {
  const f = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '▰'.repeat(f) + '▱'.repeat(width - f);
}

export function ClaudeCard({ summary, lastError }: Props): JSX.Element {
  const intensity = intensityPct(summary.tokensWindow);
  const intensityColor = severityColor(intensity);
  const mood = moodFor(summary.tokensWindow);
  const reset = formatCountdown(summary.resetsAtMs);
  const resetClock = formatClockTime(summary.resetsAtMs);
  const sessionPct = sessionProgressPct(summary.windowStartMs);

  const topModelTokens = summary.byModel[0]?.tokens ?? 1;
  const topProjectTokens = summary.byProject[0]?.tokens ?? 1;

  const moodLabel: Record<typeof mood, string> = {
    chill: 'taking it easy',
    focused: 'in the zone',
    cooking: 'cooking',
    burning: 'on fire',
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="white" paddingX={1}>
      {/* Top row: crab + title + current activity chip */}
      <Box>
        <Box marginRight={2}>
          <Crab mood={mood} />
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Box>
            <Text bold>Claude Code </Text>
            <Text dimColor> · </Text>
            <Text color="cyan">{summary.currentProject ?? 'idle'}</Text>
            {summary.currentModel ? (
              <>
                <Text dimColor> · </Text>
                <Text>{shortModel(summary.currentModel)}</Text>
              </>
            ) : null}
            {summary.latestAgeMs !== null ? (
              <>
                <Text dimColor> · last turn {formatAge(summary.latestAgeMs)}</Text>
              </>
            ) : null}
          </Box>

          {/* Headline: total tokens + intensity bar + cost */}
          <Box marginTop={1}>
            <Box width={14}>
              <Text bold color={intensityColor}>
                {summary.tokensWindow === 0 ? '— tok' : `${formatTokens(summary.tokensWindow)} tok`}
              </Text>
            </Box>
            <Box width={26}>
              <Text color={intensityColor}>{bar(intensity, 22)}</Text>
            </Box>
            <Text dimColor>5h window</Text>
          </Box>

          {/* Token-flow breakdown */}
          <Box>
            <Text dimColor>
              {'  '}in {formatTokens(summary.buckets.input)}
            </Text>
            <Text dimColor>{'  →  '}</Text>
            <Text>out </Text>
            <Text bold>{formatTokens(summary.buckets.output)}</Text>
            <Text dimColor>
              {'   ·  cache w '}
              {formatTokens(summary.buckets.cacheCreation)}
            </Text>
            <Text dimColor>
              {'  ·  r '}
              {formatTokens(summary.buckets.cacheRead)}
            </Text>
          </Box>

          {/* Cost + reset */}
          <Box>
            <Box width={14}>
              <Text color="green" bold>
                {formatInr(summary.costInr)}
              </Text>
            </Box>
            <Text dimColor>resets in </Text>
            <Text color="magenta">{reset}</Text>
            <Text dimColor>
              {'  ('}
              {resetClock}
              {')'}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Session timeline */}
      <Box marginTop={1}>
        <Text dimColor>session </Text>
        <Text color="cyan">{bar(sessionPct, 38)}</Text>
        <Text dimColor> {sessionPct.toFixed(0)}% of 5h</Text>
      </Box>

      {/* Models breakdown */}
      {summary.byModel.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>models</Text>
          {summary.byModel.map((m) => {
            const pct = (m.tokens / topModelTokens) * 100;
            return (
              <Box key={m.model}>
                <Box width={10}>
                  <Text>
                    {'  '}
                    {shortModel(m.model)}
                  </Text>
                </Box>
                <Box width={14}>
                  <Text dimColor>{miniBar(pct, 12)}</Text>
                </Box>
                <Box width={10}>
                  <Text>{formatTokens(m.tokens)}</Text>
                </Box>
                <Text color="green">{formatInr(m.costInr)}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}

      {/* Projects breakdown */}
      {summary.byProject.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>projects</Text>
          {summary.byProject.slice(0, 4).map((p) => {
            const pct = (p.tokens / topProjectTokens) * 100;
            return (
              <Box key={p.project}>
                <Box width={20}>
                  <Text>
                    {'  '}
                    <Text color="cyan">{p.project}</Text>
                  </Text>
                </Box>
                <Box width={14}>
                  <Text dimColor>{miniBar(pct, 12)}</Text>
                </Box>
                <Box width={10}>
                  <Text>{formatTokens(p.tokens)}</Text>
                </Box>
                <Box width={12}>
                  <Text color="green">{formatInr(p.costInr)}</Text>
                </Box>
                <Text dimColor>{p.models.map(shortModel).join(' ')}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}

      {/* Recent feed — input → output flow */}
      {summary.recent.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>recent</Text>
          {summary.recent.map((r, i) => (
            <Box key={`${r.ts.getTime()}-${i}`}>
              <Box width={9}>
                <Text dimColor>
                  {'  '}
                  {formatAge(Date.now() - r.ts.getTime())}
                </Text>
              </Box>
              <Box width={9}>
                <Text>{shortModel(r.model)}</Text>
              </Box>
              <Box width={20}>
                <Text>
                  <Text dimColor>{formatTokens(r.inputTokens)}</Text>
                  <Text dimColor> → </Text>
                  <Text bold>{formatTokens(r.outputTokens)}</Text>
                </Text>
              </Box>
              <Text color="cyan">{r.project}</Text>
            </Box>
          ))}
        </Box>
      ) : null}

      {/* Status footer */}
      <Box marginTop={1}>
        {lastError ? (
          <Text color="red">! {lastError}</Text>
        ) : (
          <Text color="yellow">
            *{' '}
            {summary.currentProject
              ? `${moodLabel[mood]} in ${summary.currentProject} · ${shortModel(summary.currentModel ?? '')}`
              : 'idle'}
          </Text>
        )}
      </Box>
    </Box>
  );
}
