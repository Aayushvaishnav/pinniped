import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { EventType, MatrixEvent, MsgType, Room } from 'matrix-js-sdk';
import {
  CHAT_EXPORT_FILES_DIR,
  CHAT_EXPORT_MESSAGE_FILE,
  ChatExport,
  summarizeExportRange,
} from '../../src/app/features/room/export/chatExport';
import {
  ChatExportImageCollector,
  downloadExportImages,
  exportChat,
} from '../../src/app/features/room/export/exportChat';

const savedFiles: { name: string; size: number }[] = [];
let savedBlobPromise: Blob | undefined;

vi.mock('file-saver', () => ({
  default: {
    saveAs: (blob: Blob, name: string) => {
      savedFiles.push({ name, size: blob.size });
      savedBlobPromise = blob;
    },
  },
}));

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const buildRoom = (events: MatrixEvent[]) => {
  const timeline = {
    getEvents: () => events,
    getNeighbouringTimeline: () => null,
    getState: () => ({ paginationToken: null, getStateEvents: () => undefined }),
  };
  const timelineSet = {
    getLiveTimeline: () => timeline,
    getTimelineForEvent: (eventId: string) =>
      events.some((evt) => evt.getId() === eventId) ? timeline : null,
    relations: { getChildEventsForEvent: () => undefined },
  };
  const room = {
    roomId: '!room:example.org',
    name: 'Test Room',
    hasEncryptionStateEvent: () => false,
    getUnfilteredTimelineSet: () => timelineSet,
    getLiveTimeline: () => timeline,
    getMember: (userId: string) =>
      userId === '@alice:example.org' ? { rawDisplayName: 'Alice' } : undefined,
  };
  return room as unknown as Room;
};

const makeEvent = (content: Record<string, unknown>, ts: number) =>
  new MatrixEvent({
    type: EventType.RoomMessage,
    sender: '@alice:example.org',
    event_id: `$event-${ts}`,
    origin_server_ts: ts,
    room_id: '!room:example.org',
    content,
  });

describe('export pipeline', () => {
  afterEach(() => {
    savedFiles.length = 0;
    savedBlobPromise = undefined;
    vi.unstubAllGlobals();
  });

  it('writes messages.json plus the referenced images into the zip', async () => {
    vi.stubGlobal('fetch', async () => new Response(pngBytes, { status: 200 }));
    const mx = { mxcUrlToHttp: () => 'https://media.example/cat' } as never;

    const events = [
      makeEvent({ msgtype: MsgType.Text, body: 'hello' }, 1000),
      makeEvent(
        {
          msgtype: MsgType.Image,
          body: 'cat.png',
          filename: 'cat.png',
          url: 'mxc://example.org/cat',
          info: { mimetype: 'image/png', w: 10, h: 20 },
        },
        2000
      ),
      makeEvent({ msgtype: MsgType.Text, body: 'bye' }, 3000),
    ];
    const room = buildRoom(events);
    const startEventId = events[0].getId()!;
    const endEventId = events[2].getId()!;

    const preview = { events, summary: summarizeExportRange(events) };
    const summary = await exportChat({
      mx,
      room,
      preview,
      startEventId,
      endEventId,
      useAuthentication: false,
    });

    expect(summary).toEqual({
      messages: 3,
      images: 1,
      failedImages: 0,
      fileName: 'Test-Room-1970-01-01.zip',
    });
    expect(savedFiles).toHaveLength(1);

    const zip = await JSZip.loadAsync(await savedBlobPromise!.arrayBuffer());
    expect(zip.file(CHAT_EXPORT_MESSAGE_FILE)).not.toBeNull();
    expect(zip.file(`${CHAT_EXPORT_FILES_DIR}/cat.png`)).not.toBeNull();
    expect(await zip.file(`${CHAT_EXPORT_FILES_DIR}/cat.png`)!.async('uint8array')).toEqual(
      pngBytes
    );

    const data: ChatExport = JSON.parse(await zip.file(CHAT_EXPORT_MESSAGE_FILE)!.async('string'));
    expect(data.messages.map((message) => message.body)).toEqual(['hello', 'cat.png', 'bye']);
    expect(data.messages[1].file).toMatchObject({
      path: 'files/cat.png',
      mimetype: 'image/png',
      width: 10,
      height: 20,
    });
    expect(data.range).toEqual({
      startEventId,
      endEventId,
      startTimestamp: new Date(1000).toISOString(),
      endTimestamp: new Date(3000).toISOString(),
    });
  });

  it('keeps exporting when an image cannot be downloaded', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 404 }));
    const mx = { mxcUrlToHttp: () => 'https://media.example/missing' } as never;

    const events = [
      makeEvent(
        {
          msgtype: MsgType.Image,
          body: 'missing.png',
          filename: 'missing.png',
          url: 'mxc://example.org/missing',
          info: { mimetype: 'image/png' },
        },
        1000
      ),
    ];
    const room = buildRoom(events);
    const startEventId = events[0].getId()!;

    const preview = { events, summary: summarizeExportRange(events) };
    const summary = await exportChat({
      mx,
      room,
      preview,
      startEventId,
      endEventId: startEventId,
      useAuthentication: false,
    });

    expect(summary).toMatchObject({ messages: 1, images: 0, failedImages: 1 });
    const zip = await JSZip.loadAsync(await savedBlobPromise!.arrayBuffer());
    expect(zip.file(`${CHAT_EXPORT_FILES_DIR}/missing.png`)).toBeNull();

    const data: ChatExport = JSON.parse(await zip.file(CHAT_EXPORT_MESSAGE_FILE)!.async('string'));
    expect(data.messages[0].file?.error).toBeTruthy();
    expect(data.messages[0].file?.path).toBeUndefined();
  });

  it('reports progress per downloaded image', async () => {
    vi.stubGlobal('fetch', async () => new Response(pngBytes, { status: 200 }));
    const mx = { mxcUrlToHttp: (url: string) => `https://media.example/${url}` } as never;
    const collector = new ChatExportImageCollector();
    collector.collect(
      makeEvent({ msgtype: MsgType.Image, body: 'a.png', filename: 'a.png', url: 'mxc://a' }, 1000)
    );
    collector.collect(
      makeEvent({ msgtype: MsgType.Image, body: 'b.png', filename: 'b.png', url: 'mxc://b' }, 2000)
    );

    const progress: [number, number][] = [];
    const blobs = await downloadExportImages(mx, false, collector.tasks, (done, total) =>
      progress.push([done, total])
    );

    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(Array.from(blobs.keys())).toEqual(['files/a.png', 'files/b.png']);
  });
});
