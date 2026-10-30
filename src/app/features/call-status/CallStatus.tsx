import React, { useState } from 'react';
import { Box, color, Icon, Icons, RectCords, Spinner, Text } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';
import { CallRoomName } from './CallRoomName';
import { CallControl, CallHangupButton } from './CallControl';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { CallStatsPopout } from './stats/CallStatsPopout';
import { useCallConnectionStatus, useCallJoined } from '../../hooks/useCallEmbed';
import { useCallError } from '../../plugins/call/hooks';

type CallStatusProps = {
  callEmbed: CallEmbed;
};
/** "Voice Connected" panel for the bottom of the room list. */
export function CallStatus({ callEmbed }: CallStatusProps) {
  const { room } = callEmbed;

  const callJoined = useCallJoined(callEmbed);
  const connectionStatus = useCallConnectionStatus(callEmbed);
  const callError = useCallError(callEmbed);
  const [statsCords, setStatsCords] = useState<RectCords>();

  return (
    <Box
      className={classNames(css.CallStatus, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      direction="Column"
      gap="200"
    >
      <Box alignItems="Center" gap="200">
        <Box
          as="button"
          type="button"
          grow="Yes"
          alignItems="Center"
          gap="200"
          disabled={!callJoined}
          aria-label="Connection stats"
          aria-pressed={!!statsCords}
          onClick={(evt: React.MouseEvent<HTMLButtonElement>) =>
            setStatsCords(evt.currentTarget.getBoundingClientRect())
          }
          style={{
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            color: 'inherit',
            cursor: callJoined ? 'pointer' : 'default',
          }}
        >
          {callJoined ? (
            <Icon size="200" src={Icons.VolumeHigh} filled style={{ color: color.Success.Main }} />
          ) : (
            <Spinner variant="Secondary" size="200" />
          )}
          <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
            <Text size="T300" style={{ color: color.Success.Main }} truncate>
              {callJoined ? 'Voice Connected' : connectionStatus}
            </Text>
            <CallRoomName room={room} plain />
          </Box>
        </Box>
        <CallStatsPopout
          callEmbed={callEmbed}
          anchor={statsCords}
          requestClose={() => setStatsCords(undefined)}
        />
        <Box shrink="No">
          <CallHangupButton callEmbed={callEmbed} callJoined={callJoined} />
        </Box>
      </Box>
      {callError && (
        <Box role="alert" alignItems="Start" gap="200" style={{ color: color.Critical.Main }}>
          <Icon size="200" src={Icons.Warning} filled />
          <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
            <Text size="T300">
              <b>{callError.title}</b>
            </Text>
            {callError.message && <Text size="T200">{callError.message}</Text>}
          </Box>
        </Box>
      )}
      <CallControl callJoined={callJoined} callEmbed={callEmbed} />
    </Box>
  );
}
