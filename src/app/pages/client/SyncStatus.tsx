import { MatrixClient, SyncState } from 'matrix-js-sdk';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, config, Line, Text } from 'folds';
import { useSyncState } from '../../hooks/useSyncState';
import { ContainerColor } from '../../styles/ContainerColor.css';

type StateData = {
  current: SyncState | null;
  previous: SyncState | null | undefined;
};

const SYNC_STEP: Partial<Record<SyncState, string>> = {
  [SyncState.Prepared]: 'initial sync done, processing',
  [SyncState.Catchup]: 'catching up on missed events',
  [SyncState.Syncing]: 'syncing',
};

/** What the sync is doing right now: step, rooms loaded, time spent, last error. */
function useSyncDetail(mx: MatrixClient, state: SyncState | null): string {
  const startedAt = useRef(Date.now());
  const [, setTick] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [state]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const parts: string[] = [];
  const step = state ? SYNC_STEP[state] : undefined;
  if (step) parts.push(step);
  parts.push(`${mx.getRooms().length} rooms loaded`);
  parts.push(`${Math.round((Date.now() - startedAt.current) / 1000)}s`);
  const error = mx.getSyncStateData()?.error as (Error & { httpStatus?: number }) | undefined;
  if (error)
    parts.push(`last error: ${error.httpStatus ?? ''} ${error.message ?? error.name}`.trim());
  return parts.join(' · ');
}

type SyncStatusProps = {
  mx: MatrixClient;
};
export function SyncStatus({ mx }: SyncStatusProps) {
  const [stateData, setStateData] = useState<StateData>({
    current: null,
    previous: undefined,
  });

  const detail = useSyncDetail(mx, stateData.current);

  useSyncState(
    mx,
    useCallback((current, previous) => {
      setStateData((s) => {
        if (s.current === current && s.previous === previous) {
          return s;
        }
        return { current, previous };
      });
    }, [])
  );

  if (
    // `Syncing` means we're connected. The sdk only repeats it after the next long-poll returns
    // (up to ~30s when idle), so counting it as "connecting" kept the banner up that long.
    (stateData.current === SyncState.Prepared || stateData.current === SyncState.Catchup) &&
    stateData.previous !== SyncState.Syncing
  ) {
    return (
      <Box direction="Column" shrink="No">
        <Box
          className={ContainerColor({ variant: 'Success' })}
          style={{ padding: `${config.space.S100} 0` }}
          alignItems="Center"
          justifyContent="Center"
        >
          <Text size="L400">{`Connecting... ${detail}`}</Text>
        </Box>
        <Line variant="Success" size="300" />
      </Box>
    );
  }

  if (stateData.current === SyncState.Reconnecting) {
    return (
      <Box direction="Column" shrink="No">
        <Box
          className={ContainerColor({ variant: 'Warning' })}
          style={{ padding: `${config.space.S100} 0` }}
          alignItems="Center"
          justifyContent="Center"
        >
          <Text size="L400">{`Connection Lost! Reconnecting... ${detail}`}</Text>
        </Box>
        <Line variant="Warning" size="300" />
      </Box>
    );
  }

  if (stateData.current === SyncState.Error) {
    return (
      <Box direction="Column" shrink="No">
        <Box
          className={ContainerColor({ variant: 'Critical' })}
          style={{ padding: `${config.space.S100} 0` }}
          alignItems="Center"
          justifyContent="Center"
        >
          <Text size="L400">{`Connection Lost! ${detail}`}</Text>
        </Box>
        <Line variant="Critical" size="300" />
      </Box>
    );
  }

  return null;
}
