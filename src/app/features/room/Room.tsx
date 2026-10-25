import React from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { RoomView } from './RoomView';
import { RoomSearchDrawer } from './RoomSearchDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { CallView } from '../call/CallView';
import { RoomViewHeader } from './RoomViewHeader';
import { callChatAtom } from '../../state/callEmbed';
import { CallChatView } from './CallChatView';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { DmCallSplit } from './DmCallSplit';

export function Room() {
  const { eventId } = useParams();
  const room = useRoom();
  const mx = useMatrixClient();

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(callSession);
  const callEmbed = useCallEmbed();

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSizeContext();
  const powerLevels = usePowerLevels(room);
  const members = useRoomMembers(mx, room.roomId);
  const chat = useAtomValue(callChatAtom);
  const direct = useIsDirectRoom();

  const callView = callEmbed?.roomId === room.roomId || room.isCallRoom() || callMembers.length > 0;

  // In DMs the call sits above the chat instead of replacing it.
  const dmSplit = callView && direct && !room.isCallRoom();

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes">
        {dmSplit && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader />
            <DmCallSplit call={<CallView />} chat={<RoomView eventId={eventId} />} />
          </Box>
        )}
        {!dmSplit && callView && (screenSize === ScreenSize.Desktop || !chat) && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader callView />
            <Box grow="Yes">
              <CallView />
            </Box>
          </Box>
        )}
        {!callView && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader />
            <Box grow="Yes">
              <RoomView eventId={eventId} />
            </Box>
          </Box>
        )}

        {!dmSplit && callView && chat && (
          <>
            {screenSize === ScreenSize.Desktop && (
              <Line variant="Background" direction="Vertical" size="300" />
            )}
            <CallChatView />
          </>
        )}
        {(!callView || dmSplit) && screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <RoomSearchDrawer key={room.roomId} room={room} members={members} />
          </>
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
