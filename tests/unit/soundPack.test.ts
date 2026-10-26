import { describe, expect, it } from 'vitest';
import { SoundPack } from '../../src/app/plugins/sound-pack/SoundPack';
import { newSoundId, withoutSound, withSound } from '../../src/app/plugins/sound-pack/utils';

describe('SoundPack', () => {
  const pack = new SoundPack('user', {
    pack: { display_name: 'Mine' },
    sounds: {
      zap: { url: 'mxc://hs/zap', name: 'Zap', emoji: '⚡', info: { duration: 1200 } },
      bonk: { url: 'mxc://hs/bonk' },
      broken: { url: 'https://example.org/not-mxc.ogg' },
    },
  });

  it('keeps only sounds with an mxc url, sorted by name', () => {
    expect(pack.sounds.map((s) => s.id)).toEqual(['bonk', 'zap']);
  });

  it('falls back to the id for the name and builds unique keys', () => {
    expect(pack.sounds[0]).toMatchObject({ name: 'bonk', key: 'user/bonk', emoji: undefined });
    expect(pack.sounds[1]).toMatchObject({ name: 'Zap', emoji: '⚡', duration: 1200 });
    expect(pack.name).toBe('Mine');
  });

  it('is empty for no content', () => {
    expect(new SoundPack('x', {}).sounds).toEqual([]);
  });
});

describe('sound pack content helpers', () => {
  it('adds and removes sounds without touching the rest', () => {
    const base = { pack: { display_name: 'P' }, sounds: { a: { url: 'mxc://hs/a' } } };
    const added = withSound(base, 'b', { url: 'mxc://hs/b' });
    expect(Object.keys(added.sounds ?? {})).toEqual(['a', 'b']);
    expect(added.pack).toEqual(base.pack);
    expect(Object.keys(withoutSound(added, 'a').sounds ?? {})).toEqual(['b']);
    expect(base.sounds).toEqual({ a: { url: 'mxc://hs/a' } });
  });

  it('derives ids from names and avoids collisions', () => {
    expect(newSoundId('Big Bonk!', () => false)).toBe('big-bonk');
    const taken = new Set(['big-bonk', 'big-bonk-2']);
    expect(newSoundId('Big Bonk', (id) => taken.has(id))).toBe('big-bonk-3');
    expect(newSoundId('!!!', () => false)).toMatch(/^[a-z]{6}$/);
  });
});
