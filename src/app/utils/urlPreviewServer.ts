import { IPreviewUrlResponse, MatrixClient } from 'matrix-js-sdk';

// Link previews from an optional third-party preview server (configured in
// settings with a server URL and a preview-only token). Only that token is
// ever sent there, never the user's access token. Preview images are mxc://
// URLs and keep loading through the user's own homeserver.

// The server caches previews for about an hour, so do the same here to stay
// well within its rate limit when the timeline re-renders.
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;
const DEFAULT_RETRY_MS = 1000;

const cache = new Map<string, { expires: number; preview: Promise<IPreviewUrlResponse> }>();
let blockedUntil = 0;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchFromPreviewServer = async (
  server: string,
  token: string,
  url: string
): Promise<IPreviewUrlResponse> => {
  // One retry after a 429, waiting as long as the server asked.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const delay = blockedUntil - Date.now();

    if (delay > 0) await wait(delay);

    const res = await fetch(
      `${server}/_matrix/client/v1/media/preview_url?url=${encodeURIComponent(url)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      }
    );
    if (res.status !== 429) {
      if (!res.ok) throw new Error(`Preview server responded ${res.status}`);
      return res.json();
    }

    const body = await res.json().catch(() => ({}));
    const retryMs =
      Number(body?.retry_after_ms) ||
      Number(res.headers.get('Retry-After')) * 1000 ||
      DEFAULT_RETRY_MS;
    blockedUntil = Math.max(blockedUntil, Date.now() + retryMs);
  }
  throw new Error('Preview server rate limit exceeded');
};

/**
 * Get a link preview, from the configured preview server if there is one,
 * otherwise (or when that server fails) from the user's own homeserver.
 */
export const getUrlPreview = (
  mx: MatrixClient,
  url: string,
  ts: number,
  server?: string,
  token?: string
): Promise<IPreviewUrlResponse> => {
  if (!server || !token) return mx.getUrlPreview(url, ts);

  const key = `${server}\n${url}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.preview;

  const preview = fetchFromPreviewServer(server, token, url).catch(() => {
    // Don't keep failures (or the fallback) cached for the preview server.
    if (cache.get(key)?.preview === preview) cache.delete(key);
    return mx.getUrlPreview(url, ts);
  });

  cache.delete(key);
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, preview });
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return preview;
};
