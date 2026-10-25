import React from 'react';
import { Menu, Overlay, OverlayBackdrop, OverlayCenter, PopOut, toRem } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useCloseUserRoomProfile, useUserRoomProfileState } from '../state/hooks/userRoomProfile';
import { UserRoomProfile } from './user-profile';
import { UserRoomProfileState } from '../state/userRoomProfile';
import { useAllJoinedRoomsSet, useGetRoom } from '../hooks/useGetRoom';
import { stopPropagation } from '../utils/keyboard';
import { SpaceProvider } from '../hooks/useSpace';
import { RoomProvider } from '../hooks/useRoom';

function UserRoomProfileContextMenu({ state }: { state: UserRoomProfileState }) {
  const { roomId, spaceId, userId, cords, position, centered } = state;
  const allJoinedRooms = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allJoinedRooms);
  const room = getRoom(roomId);
  const space = spaceId ? getRoom(spaceId) : undefined;

  const close = useCloseUserRoomProfile();

  if (!room) return null;

  const card = (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: false,
        onDeactivate: close,
        clickOutsideDeactivates: true,
        escapeDeactivates: stopPropagation,
      }}
    >
      <Menu style={{ width: toRem(340) }}>
        <SpaceProvider value={space ?? null}>
          <RoomProvider value={room}>
            <UserRoomProfile userId={userId} />
          </RoomProvider>
        </SpaceProvider>
      </Menu>
    </FocusTrap>
  );

  if (centered) {
    return (
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>{card}</OverlayCenter>
      </Overlay>
    );
  }

  return <PopOut anchor={cords} position={position ?? 'Top'} align="Start" content={card} />;
}

export function UserRoomProfileRenderer() {
  const state = useUserRoomProfileState();

  if (!state) return null;
  return <UserRoomProfileContextMenu state={state} />;
}
