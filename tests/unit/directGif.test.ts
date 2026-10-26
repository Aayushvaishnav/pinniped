import { describe, expect, it } from 'vitest';
import { isDirectGifUrl } from '../../src/app/utils/directGif';
import { isMediaAutoEmbedUrl } from '../../src/app/utils/mediaAutoEmbed';

const bridgeUrl =
  'https://bridge.agiadn.org/download/discordcdn/1370776315266859131/1549720052788494416/PrimeTime.gif';
const gifUrl = 'https://nyafiles.de/files/PrimeTime.gif';

describe('direct GIF URLs', () => {
  it('embeds GIF links from the allowed hosts instead of requesting a static URL preview', () => {
    expect(isMediaAutoEmbedUrl(gifUrl)).toBe(true);
    expect(isMediaAutoEmbedUrl('https://pissdichal.de/a.gif')).toBe(true);
  });

  it('does not auto-load GIFs from other hosts', () => {
    expect(isMediaAutoEmbedUrl(bridgeUrl)).toBe(false);
    expect(isMediaAutoEmbedUrl('https://cdn.discordapp.com/a/b/animation.gif')).toBe(false);
  });

  it('preserves the existing video host restrictions', () => {
    expect(isMediaAutoEmbedUrl('https://nyafiles.de/video.mp4')).toBe(true);
    expect(isMediaAutoEmbedUrl('https://pissdichal.de/video.webm')).toBe(true);
    expect(isMediaAutoEmbedUrl('https://example.org/video.mp4')).toBe(false);
  });

  it.each([
    gifUrl,
    `${gifUrl}?ex=123&hm=abc#preview`,
    'https://pissdichal.de/attachments/1/2/animation.GIF',
    'http://nyafiles.de/animation.gif',
  ])('recognizes %s', (url) => {
    expect(isDirectGifUrl(url)).toBe(true);
  });

  it.each([
    'not a URL',
    // eslint-disable-next-line no-script-url
    'javascript:animation.gif',
    'data:image/gif;base64,AAAA',
    'ftp://example.org/animation.gif',
    bridgeUrl,
    'https://example.org/animation.gif',
    'https://nyafiles.de/animation.mp4',
    'https://nyafiles.de/animation.gif.html',
    'https://nyafiles.de/animation.gif/other',
    'https://nyafiles.de/?file=animation.gif',
    'https://nyafiles.de/#animation.gif',
    'https://user:password@nyafiles.de/animation.gif',
  ])('leaves %s as a normal link', (url) => {
    expect(isDirectGifUrl(url)).toBe(false);
  });
});
