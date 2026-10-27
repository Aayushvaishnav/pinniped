import { Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { useRoomMembers } from './useRoomMembers';
import { useStateEvent } from './useStateEvent';
import { StateEvent } from '../../types/matrix/room';
import { isMatrixOrgUser } from '../plugins/matrix-org-servers';

export type MatrixOrgExposure = {
  /** Joined or invited members on Matrix.org administered servers. */
  count: number;
};

/** Set when a room is not end-to-end encrypted and has members on Matrix.org administered servers. */
export const useMatrixOrgExposure = (room: Room): MatrixOrgExposure | undefined => {
  const members = useRoomMembers(room.client, room.roomId);
  const encrypted = !!useStateEvent(room, StateEvent.RoomEncryption);

  return useMemo(() => {
    if (encrypted) return undefined;
    const count = members.filter(
      (member) =>
        (member.membership === 'join' || member.membership === 'invite') &&
        isMatrixOrgUser(member.userId)
    ).length;
    return count > 0 ? { count } : undefined;
  }, [members, encrypted]);
};
