// The server can accept a read receipt without ever sending it back (it drops a
// receipt that isn't newer than the one it has), so after a restart the client
// may hold no receipt of ours at all for a room we did read. Keep the newest
// event timestamp we successfully marked read per room, so unread detection can
// fall back on it.
const STORAGE_KEY = 'pinniped.read_markers';
const MAX_ENTRIES = 1000;

type Markers = Record<string, number>;

const load = (): Markers => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Markers) : {};
  } catch {
    return {};
  }
};

let cache: Markers | undefined;

export const getLocalReadTs = (roomId: string): number => {
  cache ??= load();
  return cache[roomId] ?? 0;
};

export const rememberLocalReadTs = (roomId: string, ts: number) => {
  cache ??= load();
  if ((cache[roomId] ?? 0) >= ts) return;
  cache[roomId] = ts;
  const entries = Object.entries(cache);
  if (entries.length > MAX_ENTRIES) {
    entries.sort(([, a], [, b]) => b - a);
    cache = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable or full: the in-memory value still helps this session
  }
};
