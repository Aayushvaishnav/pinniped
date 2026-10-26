import { MatrixClient, ReceiptType } from 'matrix-js-sdk';
import { rememberLocalReadTs } from '../state/readMarkers';

// The SDK adds a local echo receipt the moment a receipt is sent, so
// getEventReadUpTo() claims "read" even if the POST failed, and that would make
// every later call a no-op until a restart brought the real state back. Track
// what actually reached the server instead.
const sentReceipts = new Map<string, string>();

export async function markAsRead(mx: MatrixClient, roomId: string, privateReceipt: boolean) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  const timeline = room.getLiveTimeline().getEvents();
  const readEventId = room.getEventReadUpTo(mx.getUserId()!);

  const getLatestValidEvent = () => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const latestEvent = timeline[i];
      const latestId = latestEvent.getId();
      if (
        latestId === readEventId &&
        (sentReceipts.get(roomId) === latestId ||
          latestId === room.getEventReadUpTo(mx.getUserId()!, true))
      ) {
        return null;
      }
      if (!latestEvent.isSending()) return latestEvent;
    }
    return null;
  };
  if (timeline.length === 0) return;
  const latestEvent = getLatestValidEvent();
  if (latestEvent === null) return;

  const eventId = latestEvent.getId()!;
  try {
    await mx.sendReadReceipt(
      latestEvent,
      privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read
    );
    sentReceipts.set(roomId, eventId);
    rememberLocalReadTs(roomId, latestEvent.getTs());
  } catch (err) {
    sentReceipts.delete(roomId);
    // eslint-disable-next-line no-console
    console.warn('Failed to send read receipt', roomId, eventId, err);
  }
}
