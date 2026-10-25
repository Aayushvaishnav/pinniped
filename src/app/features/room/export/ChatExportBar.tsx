import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, Icon, Icons, Line, Text, config } from 'folds';
import { useAtom } from 'jotai';
import { Room } from 'matrix-js-sdk';
import { roomIdToExportSelectionAtomFamily } from '../../../state/room/roomExport';
import { ExportChatOverlay } from './ChatExportDialog';
import * as css from './styles.css';

const formatTimestamp = (ts: number) => new Date(ts).toLocaleString();

type ChatExportBarProps = {
  room: Room;
};

/**
 * Shows the export anchors picked from message context menus and opens the
 * export dialog once both ends of the range are set.
 */
export function ChatExportBar({ room }: ChatExportBarProps) {
  const [selection, setSelection] = useAtom(roomIdToExportSelectionAtomFamily(room.roomId));
  const [dialogOpen, setDialogOpen] = useState(false);

  const { start, end } = selection;
  const rangeKey = start && end ? `${start.eventId}:${end.eventId}` : undefined;
  // Comparable ranges are not reopened after coming back to the room.
  const openedRange = useRef<string | undefined>(rangeKey);

  // Opening once per range keeps closing the dialog from reopening it immediately.
  useEffect(() => {
    if (!rangeKey || openedRange.current === rangeKey) return;
    openedRange.current = rangeKey;
    setDialogOpen(true);
  }, [rangeKey]);

  if (!start && !end) return null;

  const ready = start !== undefined && end !== undefined;

  return (
    <>
      {start && end && dialogOpen && (
        <ExportChatOverlay
          room={room}
          startEventId={start.eventId}
          endEventId={end.eventId}
          requestClose={() => setDialogOpen(false)}
        />
      )}
      <Box direction="Column" shrink="No">
        <Box
          className={css.ExportBar}
          style={{ padding: config.space.S200 }}
          alignItems="Center"
          gap="300"
        >
          <Box direction="Column" grow="Yes" gap="100">
            <Text className={css.ExportBarText} as="span" size="T300" truncate>
              {start
                ? `Start: ${formatTimestamp(start.ts)}`
                : 'Start: right-click the first message'}
            </Text>
            <Text className={css.ExportBarText} as="span" size="T300" truncate>
              {end ? `End: ${formatTimestamp(end.ts)}` : 'End: right-click the last message'}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            {ready && (
              <Button
                size="300"
                variant="Primary"
                before={<Icon size="100" src={Icons.Download} />}
                onClick={() => setDialogOpen(true)}
              >
                <Text size="B300">Export</Text>
              </Button>
            )}
            <Chip
              as="button"
              type="button"
              size="400"
              variant="Surface"
              radii="Pill"
              onClick={() => setSelection({})}
              before={<Icon size="50" src={Icons.Cross} />}
            >
              <Text size="L400">Cancel</Text>
            </Chip>
          </Box>
        </Box>
        <Line variant="Surface" size="300" />
      </Box>
    </>
  );
}
