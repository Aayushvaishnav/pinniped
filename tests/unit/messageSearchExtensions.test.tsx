import React from 'react';
import { act, create } from 'react-test-renderer';
import { MatrixClient } from 'matrix-js-sdk';
import { describe, expect, it, vi } from 'vitest';
import { MatrixClientProvider } from '../../src/app/hooks/useMatrixClient';
import {
  MessageSearchParams,
  SEARCH_EXTENSION_KEY,
  SearchResult,
  useMessageSearch,
} from '../../src/app/features/message-search/useMessageSearch';
import {
  hasQueryFilters,
  parseSearchQuery,
  serverMsgtypes,
} from '../../src/app/features/message-search/searchQuery';

type SearchBody = {
  search_categories: {
    room_events: {
      search_term: string;
      order_by?: string;
      filter: Record<string, unknown>;
    };
  };
};

const response = (extra: Record<string, unknown> = {}, results: unknown[] = []) => ({
  search_categories: { room_events: { results, count: results.length, highlights: [], ...extra } },
});

const run = async (
  params: MessageSearchParams,
  reply: unknown
): Promise<{ body?: SearchBody; result: SearchResult; calls: number }> => {
  const search = vi.fn().mockResolvedValue(reply);
  const mx = { search } as unknown as MatrixClient;
  let fetchPage!: (next?: string) => Promise<SearchResult>;
  function Harness() {
    fetchPage = useMessageSearch(params);
    return null;
  }
  await act(async () => {
    create(
      <MatrixClientProvider value={mx}>
        <Harness />
      </MatrixClientProvider>
    );
  });
  let result!: SearchResult;
  await act(async () => {
    result = await fetchPage('');
  });
  return { body: search.mock.calls[0]?.[0].body, result, calls: search.mock.calls.length };
};

describe('search extensions on the wire', () => {
  it('sends a plain spec request unless the caller opts in', async () => {
    const { body } = await run({ term: 'cat', order: 'recent' }, response());
    const { filter } = body?.search_categories.room_events ?? { filter: {} };
    expect(Object.keys(filter)).not.toContain(SEARCH_EXTENSION_KEY);
    expect(body?.search_categories.room_events.search_term).toBe('cat');
    expect(body?.search_categories.room_events.order_by).toBe('recent');
  });

  it('puts every extension under one namespaced key and leaves spec keys alone', async () => {
    const { body } = await run(
      {
        term: 'cat',
        order: 'recent',
        rooms: ['!a:b'],
        senders: ['@x:y'],
        containsUrl: true,
        extensions: { prefix: true, afterTs: 5, ascending: true, msgtypes: ['m.image'] },
      },
      response()
    );
    const { filter } = body?.search_categories.room_events ?? { filter: {} };
    expect(filter.rooms).toEqual(['!a:b']);
    expect(filter.senders).toEqual(['@x:y']);
    expect(filter.contains_url).toBe(true);
    expect(filter[SEARCH_EXTENSION_KEY]).toMatchObject({
      prefix: true,
      after_ts: 5,
      ascending: true,
      msgtypes: ['m.image'],
    });
    expect(body?.search_categories.room_events.order_by).toBe('recent');
  });

  it('reports what a patched server says it applied', async () => {
    const { result } = await run(
      { term: 'cat', extensions: { prefix: true } },
      response({ [SEARCH_EXTENSION_KEY]: { version: 1, applied: ['prefix'] } })
    );
    expect(result.applied).toEqual(['prefix']);
  });

  it('treats a response without the marker as a stock server', async () => {
    const { result } = await run({ term: 'cat', extensions: { prefix: true } }, response());
    expect(result.applied).toBeUndefined();
  });

  it('ignores a malformed marker rather than trusting it', async () => {
    const { result } = await run(
      { term: 'cat', extensions: { prefix: true } },
      response({ [SEARCH_EXTENSION_KEY]: { applied: 'prefix' } })
    );
    expect(result.applied).toBeUndefined();
  });

  it('only sends an empty term when the caller allowed it', async () => {
    const none = await run({ term: '', extensions: { prefix: true } }, response());
    expect(none.result.groups).toEqual([]);
    expect(none.calls).toBe(0);

    const { body } = await run(
      { term: '', extensions: { allowEmptyTerm: true } },
      response({ [SEARCH_EXTENSION_KEY]: { applied: ['allow_empty_term'] } })
    );
    expect(body?.search_categories.room_events.search_term).toBe('');
  });
});

describe('server filter mapping', () => {
  it('asks the server for one media kind at a time', () => {
    expect(serverMsgtypes(['image'])).toEqual(['m.image']);
    expect(serverMsgtypes(['link'])).toBeUndefined();
    expect(serverMsgtypes(['image', 'video'])).toBeUndefined();
    expect(serverMsgtypes(['link', 'file'])).toEqual(['m.file']);
  });

  it('knows when a query is more than free text', () => {
    expect(hasQueryFilters(parseSearchQuery('cat'))).toBe(false);
    expect(hasQueryFilters(parseSearchQuery('cat from:alice'))).toBe(true);
    expect(hasQueryFilters(parseSearchQuery('pinned:true'))).toBe(true);
  });
});
