import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { allRoomsAtom } from '../state/room-list/roomList';
import { mDirectAtom } from '../state/mDirectList';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { useDirects, useOrphanRooms, useOrphanSpaces } from '../state/hooks/roomList';
import { useSidebarItems } from './useSidebarItems';
import { getRoomSortMode, useRoomOrderContent } from './useRoomOrder';
import { createHierarchyRoomSorter, getSpaceJoinedHierarchy } from './useSpaceHierarchy';
import { factoryRoomIdByActivity, factoryRoomIdByAtoZ } from '../utils/sort';
import { isRoom } from '../utils/room';

const neverExclude = () => false;
const neverSortByActivity = () => false;

/**
 * Returns a getter for every joined room laid out in sidebar reading order:
 * direct messages, then orphan rooms, then each sidebar space's joined
 * hierarchy. Rooms reachable through several spaces keep their first position.
 *
 * The list is built on call rather than on render because the hierarchy walk is
 * only needed when the user actually jumps between rooms.
 */
export const useGlobalRoomOrder = (): (() => string[]) => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const allRooms = useAtomValue(allRoomsAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const [sidebarItems] = useSidebarItems(orphanSpaces);
  const roomOrderContent = useRoomOrderContent();

  const joinedRooms = useMemo(() => new Set(allRooms), [allRooms]);
  const getRoom = useCallback(
    (roomId: string): Room | undefined =>
      joinedRooms.has(roomId) ? (mx.getRoom(roomId) ?? undefined) : undefined,
    [mx, joinedRooms]
  );

  return useCallback(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const push = (roomId: string) => {
      if (seen.has(roomId)) return;
      seen.add(roomId);
      ordered.push(roomId);
    };

    Array.from(directs).sort(factoryRoomIdByActivity(mx)).forEach(push);
    Array.from(orphanRooms).sort(factoryRoomIdByAtoZ(mx)).forEach(push);

    const customOrders = roomOrderContent.orders ?? {};
    sidebarItems
      .flatMap((item) => (typeof item === 'string' ? [item] : item.content))
      .forEach((spaceId) => {
        const sorter = createHierarchyRoomSorter(
          mx,
          neverSortByActivity,
          getRoomSortMode(roomOrderContent, spaceId),
          customOrders
        );
        getSpaceJoinedHierarchy(spaceId, getRoom, neverExclude, sorter).forEach((item) => {
          if ('space' in item) return;
          push(item.roomId);
        });
      });

    // spaces can form cycles without an orphan root, so nothing guarantees the
    // walk above reached every joined room
    allRooms
      .filter((roomId) => !seen.has(roomId) && isRoom(mx.getRoom(roomId)))
      .sort(factoryRoomIdByActivity(mx))
      .forEach(push);

    return ordered;
  }, [mx, allRooms, directs, orphanRooms, sidebarItems, roomOrderContent, getRoom]);
};
