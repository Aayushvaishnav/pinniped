import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

export type ExportAnchor = {
  eventId: string;
  ts: number;
};

/** Export range selected by the user, one anchor per range boundary. */
export type RoomExportSelection = {
  start?: ExportAnchor;
  end?: ExportAnchor;
};

export type ExportPlace = 'start' | 'end';

const createRoomExportSelectionAtom = () => atom<RoomExportSelection>({});
export type TRoomExportSelectionAtom = ReturnType<typeof createRoomExportSelectionAtom>;

export const roomIdToExportSelectionAtomFamily = atomFamily<string, TRoomExportSelectionAtom>(
  createRoomExportSelectionAtom
);

/** Room whose export dialog is open, undefined when closed. */
export const exportDialogRoomIdAtom = atom<string | undefined>(undefined);

/**
 * Places an anchor on the given boundary. Placing the same message again on the
 * same boundary clears it, so a second right-click can undo a misclick.
 */
export const placeExportAnchor = (
  selection: RoomExportSelection,
  place: ExportPlace,
  anchor: ExportAnchor
): RoomExportSelection => {
  const current = selection[place];
  if (current?.eventId === anchor.eventId) {
    return { ...selection, [place]: undefined };
  }
  return { ...selection, [place]: anchor };
};
