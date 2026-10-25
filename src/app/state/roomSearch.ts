import { atom } from 'jotai';
import type { SearchLookup } from '../features/message-search/searchQuery';

// The current room message search query, as typed (free text plus `from:`-style
// filters). undefined = no search active.
export const roomSearchTermAtom = atom<string | undefined>(undefined);

// Whether the room search drawer is currently mounted and visible.
// The room header reads this to decide whether to show the search input.
export const roomSearchDrawerActiveAtom = atom<boolean>(false);

// Who and what the open search can reach. The drawer knows its scope; the search
// box in the room header needs it to autocomplete `from:` and `in:`.
export const roomSearchLookupAtom = atom<SearchLookup>({ users: [], rooms: [] });

// `oldest` is a recency sort the server must opt in to; see SEARCH_EXTENSION_KEY
export type RoomSearchOrder = 'recent' | 'oldest' | 'rank';
export const roomSearchOrderAtom = atom<RoomSearchOrder>('recent');
