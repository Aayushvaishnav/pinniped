import { Position, RectCords } from 'folds';
import { atom } from 'jotai';

export type UserRoomProfileState = {
  userId: string;
  roomId: string;
  spaceId?: string;
  cords: RectCords;
  position?: Position;
  /** Show centred over a backdrop (the call tile's "View Profile") instead of anchored to `cords`. */
  centered?: boolean;
};

export const userRoomProfileAtom = atom<UserRoomProfileState | undefined>(undefined);
