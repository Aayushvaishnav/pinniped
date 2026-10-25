import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { ExportPlace, roomIdToExportSelectionAtomFamily } from '../../../state/room/roomExport';
import { useMessageExportEnabled } from './useMessageExportEnabled';

type ExportAnchorMap = Map<string, ExportPlace>;

const ExportAnchorContext = createContext<ExportAnchorMap>(new Map());

/** Provides the currently anchored export range to the timeline messages. */
export function ExportAnchorProvider({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  const enabled = useMessageExportEnabled();
  const selection = useAtomValue(roomIdToExportSelectionAtomFamily(roomId));
  const anchors = useMemo(() => {
    const map: ExportAnchorMap = new Map();
    // A range left over from before export was turned off isn't shown.
    if (!enabled) return map;
    if (selection.start) map.set(selection.start.eventId, 'start');
    if (selection.end) map.set(selection.end.eventId, 'end');
    return map;
  }, [enabled, selection]);

  return <ExportAnchorContext.Provider value={anchors}>{children}</ExportAnchorContext.Provider>;
}

export const useExportAnchor = (eventId?: string): ExportPlace | undefined => {
  const anchors = useContext(ExportAnchorContext);
  if (!eventId) return undefined;
  return anchors.get(eventId);
};
