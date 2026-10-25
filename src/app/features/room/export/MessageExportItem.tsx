import React from 'react';
import { Icon, Icons, MenuItem, Text } from 'folds';
import { useSetAtom } from 'jotai';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import {
  ExportPlace,
  placeExportAnchor,
  roomIdToExportSelectionAtomFamily,
} from '../../../state/room/roomExport';
import * as css from '../message/styles.css';
import { useMessageExportEnabled } from './useMessageExportEnabled';

type MessageExportItemProps = {
  room: Room;
  mEvent: MatrixEvent;
  place: ExportPlace;
  onClose?: () => void;
};

const MENU_TEXT: Record<ExportPlace, string> = {
  start: 'Export From Here',
  end: 'Export Up To Here',
};

/** Marks the message as one end of an export range. */
export function MessageExportItem({ room, mEvent, place, onClose }: MessageExportItemProps) {
  const enabled = useMessageExportEnabled();
  const setSelection = useSetAtom(roomIdToExportSelectionAtomFamily(room.roomId));

  const handleClick = () => {
    const eventId = mEvent.getId();
    if (!eventId) return;
    setSelection((current) => placeExportAnchor(current, place, { eventId, ts: mEvent.getTs() }));
    onClose?.();
  };

  if (!enabled) return null;

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.Download} />}
      radii="300"
      onClick={handleClick}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        {MENU_TEXT[place]}
      </Text>
    </MenuItem>
  );
}
