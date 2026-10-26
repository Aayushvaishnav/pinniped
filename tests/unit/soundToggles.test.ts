import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../src/app/state/settings';

const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => stored.set(key, value),
  removeItem: (key: string) => stored.delete(key),
});
vi.stubGlobal('window', { location: { href: 'app://cinny/' } });

let toggles: typeof import('../../src/app/sound/toggles');
let play: typeof import('../../src/app/sound/play');

beforeAll(async () => {
  toggles = await import('../../src/app/sound/toggles');
  play = await import('../../src/app/sound/play');
});

const settings = (over: Partial<Settings> = {}) =>
  ({
    isNotificationSounds: true,
    eventSounds: false,
    soundToggles: {},
    notificationSoundBundle: 'skype',
    ...over,
  } as Settings);

describe('isSoundEnabled', () => {
  it('keeps the old defaults: event sounds follow the legacy switch, the rest are on', () => {
    expect(toggles.isSoundEnabled(settings(), 'message')).toBe(true);
    expect(toggles.isSoundEnabled(settings(), 'callJoin')).toBe(true);
    expect(toggles.isSoundEnabled(settings(), 'callStart')).toBe(true);
    expect(toggles.isSoundEnabled(settings(), 'sent')).toBe(false);
    expect(toggles.isSoundEnabled(settings({ eventSounds: true }), 'sent')).toBe(true);
  });

  it('lets a sound override its default either way', () => {
    expect(toggles.isSoundEnabled(settings({ soundToggles: { message: false } }), 'message')).toBe(
      false
    );
    expect(toggles.isSoundEnabled(settings({ soundToggles: { sent: true } }), 'sent')).toBe(true);
  });

  it('lists every sound once', () => {
    const kinds = toggles.SOUND_TOGGLES.map((t) => t.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe('call sounds', () => {
  it('replaces the call sounds the bundle has, except switched-off ones, which are muted', () => {
    const s = settings({ soundToggles: { callJoin: false } });
    expect(Object.keys(play.getCallSoundOverrides(s))).not.toContain('join');
    expect(Object.keys(play.getCallSoundOverrides(s))).toContain('left');
    expect(play.getMutedCallSounds(s)).toEqual(['join']);
  });

  it('leaves the call to play its own sounds when notification sounds are off', () => {
    const s = settings({ isNotificationSounds: false, soundToggles: { callJoin: false } });
    expect(play.getCallSoundOverrides(s)).toEqual({});
    expect(play.getMutedCallSounds(s)).toEqual([]);
  });
});

describe('end sound handoff', () => {
  const store = (over: Partial<Settings>) =>
    stored.set('settings', JSON.stringify({ isNotificationSounds: true, ...over }));

  it('hands off the end sounds Cinny plays, and the muted ones, so the call closes at once', () => {
    store({ notificationSoundBundle: 'skype', soundToggles: { callTimeout: false } });
    expect(play.getCallSoundHandoff().sort()).toEqual(['decline', 'timeout', 'user']);
  });

  it('hands off only the muted ones when the bundle has no end sounds', () => {
    store({ notificationSoundBundle: 'default', soundToggles: { callDeclined: false } });
    expect(play.getCallSoundHandoff()).toEqual(['decline']);
  });
});
