// Hosts trusted to be auto-loaded as media; anywhere else a .gif link stays a
// normal link, so a message can't make every reader's client fetch from it.
export const MEDIA_AUTO_EMBED_HOSTS = new Set(['nyafiles.de', 'pissdichal.de']);

export const isDirectGifUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      MEDIA_AUTO_EMBED_HOSTS.has(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname.toLowerCase().endsWith('.gif')
    );
  } catch {
    return false;
  }
};
