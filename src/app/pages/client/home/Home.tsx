import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavCategoryHeader,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
} from '../../../components/nav';
import { getDirectCreatePath, getHomeRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { useDirectCreateSelected } from '../../../hooks/router/useDirectSelected';
import { useDirectRooms } from '../direct/useDirectRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../utils/notifications';
import { stopPropagation } from '../../../utils/keyboard';
import { InvitesNavItem } from '../inbox/Inbox';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';

type HomeMenuProps = {
  requestClose: () => void;
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ requestClose }, ref) => {
  const directs = useDirectRooms();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const unread = useRoomsUnread(directs, roomToUnreadAtom);
  const mx = useMatrixClient();

  const handleMarkAsRead = () => {
    if (!unread) return;
    directs.forEach((rId) => markAsRead(mx, rId, hideActivity));
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          aria-disabled={!unread}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Mark as Read
          </Text>
        </MenuItem>
      </Box>
    </Menu>
  );
});

function HomeHeader() {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Home
            </Text>
          </Box>
          <Box>
            <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
              <Icon src={Icons.VerticalDots} size="200" />
            </IconButton>
          </Box>
        </Box>
      </PageNavHeader>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <HomeMenu requestClose={() => setMenuAnchor(undefined)} />
          </FocusTrap>
        }
      />
    </>
  );
}

function HomeEmpty() {
  const navigate = useNavigate();

  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={Icons.Mention} />}
        title={
          <Text size="H5" align="Center">
            No Direct Messages
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            You do not have any direct messages yet.
          </Text>
        }
        options={
          <Button onClick={() => navigate(getDirectCreatePath())} variant="Secondary" size="300">
            <Text size="B300" truncate>
              Create Chat
            </Text>
          </Button>
        }
      />
    </NavEmptyCenter>
  );
}

export function Home() {
  const mx = useMatrixClient();
  useNavToActivePathMapper('home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const directs = useDirectRooms();
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const navigate = useNavigate();

  const selectedRoomId = useSelectedRoom();
  const createDirectSelected = useDirectCreateSelected();
  const noRoomToDisplay = directs.length === 0;

  const sortedDirects = useMemo(
    () => Array.from(directs).sort(factoryRoomIdByActivity(mx)),
    [mx, directs]
  );

  const directVirtualizer = useVirtualizer({
    count: sortedDirects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  return (
    <PageNav>
      <HomeHeader />
      {noRoomToDisplay ? (
        <HomeEmpty />
      ) : (
        <PageNavContent scrollRef={scrollRef}>
          <Box direction="Column" gap="200">
            <NavCategory>
              <InvitesNavItem />
            </NavCategory>
            <NavCategory>
              <NavItem variant="Background" radii="400" aria-selected={createDirectSelected}>
                <NavButton onClick={() => navigate(getDirectCreatePath())}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Mention} size="100" />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Create Chat
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
            </NavCategory>
            <NavCategory>
              <NavCategoryHeader>
                <Box grow="Yes" style={{ padding: `0 ${config.space.S200}` }}>
                  <Text size="T200" priority="300" truncate>
                    Direct Messages
                  </Text>
                </Box>
              </NavCategoryHeader>
              <div
                style={{
                  position: 'relative',
                  height: directVirtualizer.getTotalSize(),
                }}
              >
                {directVirtualizer.getVirtualItems().map((vItem) => {
                  const roomId = sortedDirects[vItem.index];
                  const room = mx.getRoom(roomId);
                  if (!room) return null;
                  const selected = selectedRoomId === roomId;

                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={directVirtualizer.measureElement}
                    >
                      <RoomNavItem
                        room={room}
                        selected={selected}
                        showAvatar
                        direct
                        linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                        notificationMode={getRoomNotificationMode(
                          notificationPreferences,
                          room.roomId
                        )}
                      />
                    </VirtualTile>
                  );
                })}
              </div>
            </NavCategory>
          </Box>
        </PageNavContent>
      )}
    </PageNav>
  );
}
