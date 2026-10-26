import { useMemo } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useAccountData } from '../hooks/useAccountData';

type LeftRoomsContent = {
  /** roomId -> timestamp (ms) of the explicit leave */
  rooms?: Record<string, number>;
};

const parseLeftRooms = (content?: LeftRoomsContent): Record<string, number> => {
  const rooms = content?.rooms;
  if (!rooms || typeof rooms !== 'object') return {};
  return Object.fromEntries(Object.entries(rooms).filter(([, ts]) => typeof ts === 'number'));
};

export const getLeftRooms = (mx: MatrixClient): Record<string, number> =>
  parseLeftRooms(
    mx.getAccountData(AccountDataEvent.PinnipedLeftRooms)?.getContent<LeftRoomsContent>()
  );

// Serialises read-modify-write so concurrent leaves (e.g. leaving a space and
// all its rooms) don't clobber each other.
let queue: Promise<unknown> = Promise.resolve();

const updateLeftRooms = (
  mx: MatrixClient,
  update: (rooms: Record<string, number>) => Record<string, number> | undefined
): Promise<unknown> => {
  queue = queue
    .catch(() => undefined)
    .then(() => {
      const rooms = update(getLeftRooms(mx));
      if (!rooms) return undefined;
      return mx.setAccountData(AccountDataEvent.PinnipedLeftRooms, { rooms });
    });
  return queue;
};

/**
 * Records rooms the user explicitly left, so space auto-join never joins them
 * back. Stored in account data so it syncs across devices.
 */
export const markRoomsLeft = (mx: MatrixClient, roomIds: string[]): Promise<unknown> =>
  updateLeftRooms(mx, (rooms) => {
    if (roomIds.length === 0) return undefined;
    const now = Date.now();
    return { ...rooms, ...Object.fromEntries(roomIds.map((id) => [id, now])) };
  });

/** Forgets explicit leaves, e.g. after the user deliberately rejoined. */
export const unmarkRoomsLeft = (mx: MatrixClient, roomIds: string[]): Promise<unknown> =>
  updateLeftRooms(mx, (rooms) => {
    if (!roomIds.some((id) => id in rooms)) return undefined;
    return Object.fromEntries(Object.entries(rooms).filter(([id]) => !roomIds.includes(id)));
  });

/** Leaves a room and remembers that the leave was explicit. */
export const leaveRoomExplicitly = async (mx: MatrixClient, roomId: string): Promise<void> => {
  await markRoomsLeft(mx, [roomId]);
  try {
    await mx.leave(roomId);
  } catch (err) {
    // The leave didn't happen, so don't keep a mark that would block auto-join.
    await unmarkRoomsLeft(mx, [roomId]).catch(() => undefined);
    throw err;
  }
};

export const useLeftRooms = (): Set<string> => {
  const event = useAccountData(AccountDataEvent.PinnipedLeftRooms);
  return useMemo(
    () => new Set(Object.keys(parseLeftRooms(event?.getContent<LeftRoomsContent>()))),
    [event]
  );
};
