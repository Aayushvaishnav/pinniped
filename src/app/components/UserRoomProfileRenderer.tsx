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

// Tall enough for the card with a collapsed, maximum-length bio.
const RESERVED_CARD_HEIGHT = 520;

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

  // PopOut measures its content once, when it opens, but the profile (and its
  // bio) loads afterwards and grows the card, so a card placed near the bottom
  // edge would end up clipped. Reserve the height of a full card with an
  // invisible, click-through spacer so placement always leaves enough room.
  const popPosition = position ?? 'Top';
  const reserved = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: popPosition === 'Top' ? 'flex-end' : 'flex-start',
        minHeight: `min(${toRem(RESERVED_CARD_HEIGHT)}, 100vh)`,
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>{card}</div>
    </div>
  );

  return <PopOut anchor={cords} position={popPosition} align="Start" content={reserved} />;
}

export function UserRoomProfileRenderer() {
  const state = useUserRoomProfileState();

  if (!state) return null;
  return <UserRoomProfileContextMenu state={state} />;
}
