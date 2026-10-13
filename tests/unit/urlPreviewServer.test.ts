import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SERVER = 'https://matrix.stablecat.club';
const TOKEN = 'spv_test';
const LINK = 'https://example.com/a?b=c';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// The module keeps a cache and rate-limit state, so load a fresh copy per test.
const load = async () => (await import('../../src/app/utils/urlPreviewServer')).getUrlPreview;

describe('getUrlPreview', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mx: { getUrlPreview: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mx = { getUrlPreview: vi.fn().mockResolvedValue({ 'og:title': 'from homeserver' }) };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the homeserver when no preview server is set', async () => {
    const getUrlPreview = await load();
    await expect(getUrlPreview(mx as any, LINK, 1, '', '')).resolves.toEqual({
      'og:title': 'from homeserver',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only the preview token to the preview server and caches per URL', async () => {
    fetchMock.mockResolvedValue(json(200, { 'og:title': 'from preview server' }));
    const getUrlPreview = await load();

    const first = await getUrlPreview(mx as any, LINK, 1, SERVER, TOKEN);
    const second = await getUrlPreview(mx as any, LINK, 2, SERVER, TOKEN);

    expect(first).toEqual({ 'og:title': 'from preview server' });
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe(
      `${SERVER}/_matrix/client/v1/media/preview_url?url=${encodeURIComponent(LINK)}`
    );
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(init.credentials).toBe('omit');
    expect(mx.getUrlPreview).not.toHaveBeenCalled();
  });

  it('waits retry_after_ms after a 429 and retries once', async () => {
    fetchMock
      .mockResolvedValueOnce(json(429, { errcode: 'M_LIMIT_EXCEEDED', retry_after_ms: 50 }))
      .mockResolvedValueOnce(json(200, { 'og:title': 'after wait' }));
    const getUrlPreview = await load();

    const start = Date.now();
    await expect(getUrlPreview(mx as any, LINK, 1, SERVER, TOKEN)).resolves.toEqual({
      'og:title': 'after wait',
    });
    expect(Date.now() - start).toBeGreaterThanOrEqual(45);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the homeserver on errors and does not cache the failure', async () => {
    fetchMock
      .mockResolvedValueOnce(json(502, { errcode: 'M_UNKNOWN' }))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(json(200, { 'og:title': 'recovered' }));
    const getUrlPreview = await load();

    await expect(getUrlPreview(mx as any, LINK, 1, SERVER, TOKEN)).resolves.toEqual({
      'og:title': 'from homeserver',
    });
    await expect(getUrlPreview(mx as any, LINK, 1, SERVER, TOKEN)).resolves.toEqual({
      'og:title': 'from homeserver',
    });
    await expect(getUrlPreview(mx as any, LINK, 1, SERVER, TOKEN)).resolves.toEqual({
      'og:title': 'recovered',
    });
    expect(mx.getUrlPreview).toHaveBeenCalledTimes(2);
  });

  it('gives up after a second 429 and uses the homeserver', async () => {
    fetchMock.mockResolvedValue(json(429, { errcode: 'M_LIMIT_EXCEEDED', retry_after_ms: 10 }));
    const getUrlPreview = await load();

    await expect(getUrlPreview(mx as any, LINK, 1, SERVER, TOKEN)).resolves.toEqual({
      'og:title': 'from homeserver',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
