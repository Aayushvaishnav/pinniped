import React, { useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  Scroll,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  config,
} from 'folds';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import classNames from 'classnames';

import * as css from './RoomSearchDrawer.css';
import { MembersDrawer } from './MembersDrawer';
import { DmProfileDrawer } from './DmProfileDrawer';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { EncryptionNotice, SearchErrorNotice } from '../message-search/SearchNotice';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useIsDirectRoom } from '../../hooks/useRoom';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useSetSetting, useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { mDirectAtom } from '../../state/mDirectList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import {
  useDirects,
  useOrphanRooms,
  useRecursiveChildRoomScopeFactory,
  useSpaceChildren,
} from '../../state/hooks/roomList';
import { useMessageSearch } from '../message-search/useMessageSearch';
import { SearchResultGroup } from '../message-search/SearchResultGroup';
import { VirtualTile } from '../../components/virtualizer';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { roomSearchTermAtom, roomSearchDrawerActiveAtom } from '../../state/roomSearch';

type SearchResultsProps = {
  term: string;
  rooms: string[];
  onOpen: (roomId: string, eventId: string) => void;
};
function SearchResults({ term, rooms, onOpen }: SearchResultsProps) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  const msgSearchParams = useMemo(() => ({ term, rooms }), [term, rooms]);
  const searchMessages = useMessageSearch(msgSearchParams);

  const { status, data, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    enabled: !!term,
    queryKey: ['room-sidebar-search', term, rooms],
    queryFn: ({ pageParam, signal }) => searchMessages(pageParam, signal),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });

  const groups = useMemo(() => data?.pages.flatMap((result) => result.groups) ?? [], [data]);
  const highlights = useMemo(() => {
    const mixed = data?.pages.flatMap((result) => result.highlights);
    return Array.from(new Set(mixed));
  }, [data]);
  // every page reports the same server-side total
  const totalCount = data?.pages[0]?.count;

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 200,
    overscan: 1,
  });

  const vItems = virtualizer.getVirtualItems();
  const lastVItem = vItems[vItems.length - 1];
  const lastVItemIndex = lastVItem?.index;
  const lastGroupIndex = groups.length - 1;
  useEffect(() => {
    if (
      lastGroupIndex > -1 &&
      lastVItemIndex === lastGroupIndex &&
      !isFetchingNextPage &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastVItemIndex, lastGroupIndex, fetchNextPage, isFetchingNextPage, hasNextPage]);

  const loadedResults = useMemo(() => groups.reduce((sum, g) => sum + g.items.length, 0), [groups]);

  let resultsLabel: string;
  if (status === 'pending') {
    resultsLabel = 'Searching...';
  } else if (typeof totalCount === 'number' && totalCount > loadedResults) {
    // the spec only promises an approximate count
    resultsLabel = `${loadedResults} of ~${totalCount} Results`;
  } else {
    resultsLabel = `${loadedResults} ${loadedResults === 1 ? 'Result' : 'Results'}`;
  }

  return (
    <Box className={css.RoomSearchContentBase} grow="Yes" direction="Column">
      <Box className={css.SearchResultsHeader}>
        <Text size="T200" priority="300">
          {resultsLabel}
        </Text>
      </Box>
      <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover" hideTrack>
        <Box direction="Column" gap="300" style={{ padding: `${config.space.S200} 0` }}>
          <Box ref={scrollTopAnchorRef} />
          <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
            <IconButton
              onClick={() => virtualizer.scrollToOffset(0)}
              variant="Surface"
              radii="Pill"
              outlined
              size="300"
              aria-label="Scroll to Top"
            >
              <Icon src={Icons.ChevronTop} size="300" />
            </IconButton>
          </ScrollTopContainer>

          <EncryptionNotice
            searchedRooms={rooms}
            detailed={status === 'success' && groups.length === 0}
          />

          {status === 'pending' && (
            <Box justifyContent="Center">
              <Spinner />
            </Box>
          )}

          {status === 'success' && groups.length === 0 && (
            <Text style={{ padding: config.space.S300 }} align="Center" priority="300">
              {`No results found for "${term}"`}
            </Text>
          )}

          <Box direction="Column" gap="400">
            <div
              style={{
                position: 'relative',
                height: virtualizer.getTotalSize(),
              }}
            >
              {vItems.map((vItem) => {
                const group = groups[vItem.index];
                if (!group) return null;
                const groupRoom = mx.getRoom(group.roomId);
                if (!groupRoom) return null;

                return (
                  <VirtualTile
                    virtualItem={vItem}
                    style={{ paddingBottom: config.space.S400 }}
                    key={group.key}
                    ref={virtualizer.measureElement}
                  >
                    <SearchResultGroup
                      room={groupRoom}
                      highlights={highlights}
                      items={group.items}
                      mediaAutoLoad={mediaAutoLoad}
                      urlPreview={groupRoom.hasEncryptionStateEvent() ? encUrlPreview : urlPreview}
                      onOpen={onOpen}
                      legacyUsernameColor={legacyUsernameColor || mDirects.has(groupRoom.roomId)}
                      hour24Clock={hour24Clock}
                      dateFormatString={dateFormatString}
                    />
                  </VirtualTile>
                );
              })}
            </div>
          </Box>

          {isFetchingNextPage && (
            <Box justifyContent="Center">
              <Spinner />
            </Box>
          )}

          {error && <SearchErrorNotice error={error} />}
        </Box>
      </Scroll>
    </Box>
  );
}

type RoomSearchDrawerProps = {
  room: Room;
  members: RoomMember[];
};
export function RoomSearchDrawer({ room, members }: RoomSearchDrawerProps) {
  const mx = useMatrixClient();
  const space = useSpaceOptionally();
  const direct = useIsDirectRoom();
  const { navigateRoom } = useRoomNavigate();
  const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

  const [searchTerm, setSearchTerm] = useAtom(roomSearchTermAtom);
  const setDrawerActive = useSetAtom(roomSearchDrawerActiveAtom);

  useEffect(() => {
    setDrawerActive(true);
    return () => {
      setDrawerActive(false);
      setSearchTerm(undefined);
    };
  }, [setDrawerActive, setSearchTerm]);

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const childRoomScopeFactory = useRecursiveChildRoomScopeFactory(mx, mDirects, roomToParents);
  const spaceChildren = useSpaceChildren(allRoomsAtom, space?.roomId ?? '', childRoomScopeFactory);
  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const directs = useDirects(mx, allRoomsAtom, mDirects);

  const searchRooms = useMemo(() => {
    if (space) return spaceChildren;
    return [...orphanRooms, ...directs];
  }, [space, spaceChildren, orphanRooms, directs]);

  const handleOpen = (roomId: string, eventId: string) => {
    navigateRoom(roomId, eventId);
  };

  let drawerContent: React.ReactNode;
  if (searchTerm) {
    drawerContent = <SearchResults term={searchTerm} rooms={searchRooms} onOpen={handleOpen} />;
  } else if (direct) {
    drawerContent = (
      <Box grow="Yes">
        <DmProfileDrawer room={room} />
      </Box>
    );
  } else {
    drawerContent = (
      <Box grow="Yes">
        <MembersDrawer room={room} members={members} hideHeader />
      </Box>
    );
  }

  return (
    <Box
      className={classNames(
        css.RoomSearchDrawer,
        ContainerColor({ variant: 'Background' }),
        searchTerm && css.RoomSearchDrawerWide
      )}
      shrink="No"
      direction="Column"
    >
      <Header className={css.RoomSearchDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" justifyContent="End">
          <TooltipProvider
            position="Bottom"
            align="End"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>Close</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton
                ref={triggerRef}
                variant="Background"
                onClick={() => setPeopleDrawer(false)}
                aria-label={direct ? 'Close profile' : 'Close member list'}
              >
                <Icon src={Icons.Cross} />
              </IconButton>
            )}
          </TooltipProvider>
        </Box>
      </Header>

      {drawerContent}
    </Box>
  );
}
