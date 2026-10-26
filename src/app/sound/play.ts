import { getSettings } from '../state/settings';
import { EventSoundKind, getSoundUrl } from './bundles';

// A sound that never ends (stalled load) must not hold up callers that await it, e.g. logout.
const MAX_WAIT_MS = 2000;

/** Plays the selected bundle's sound for an app event, if event sounds are enabled. */
export const playEventSound = (kind: EventSoundKind): Promise<void> => {
  const { isNotificationSounds, eventSounds, notificationSoundBundle, soundVolume } = getSettings();
  if (!isNotificationSounds || !eventSounds) return Promise.resolve();
  const url = getSoundUrl(notificationSoundBundle, kind);
  if (!url) return Promise.resolve();

  const audio = new Audio(url);
  audio.volume = soundVolume;
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, MAX_WAIT_MS);
    audio.onended = () => {
      window.clearTimeout(timer);
      resolve();
    };
    audio.play().catch(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });
};

// Element Call sound name -> bundle sound that replaces it.
const CALL_WIDGET_SOUNDS = {
  // Played once before the ringback loop starts: the call-start sound, then the ringing.
  waitingIntro: 'callStart',
  waiting: 'ringback',
  join: 'callJoin',
  left: 'callLeave',
  decline: 'callDeclined',
  timeout: 'callTimeout',
} as const satisfies Record<string, EventSoundKind>;

/**
 * URLs for the sounds the embedded call plays itself, so a bundle replaces them instead of
 * the call playing its own next to the bundle's. Call sounds follow the bundle whenever
 * notification sounds are on, independent of the event sounds toggle (which is for app
 * events). Empty (the call's own sounds) when notification sounds are off; sounds the
 * bundle lacks keep the call's own.
 */
export const getCallSoundOverrides = (): Record<string, string> => {
  const { isNotificationSounds, notificationSoundBundle } = getSettings();
  if (!isNotificationSounds) return {};
  const overrides: Record<string, string> = {};
  Object.entries(CALL_WIDGET_SOUNDS).forEach(([name, kind]) => {
    const url = getSoundUrl(notificationSoundBundle, kind);
    // The call runs in an iframe on another path, so relative URLs would not resolve.
    if (url) overrides[name] = new URL(url, window.location.href).href;
  });
  return overrides;
};

// Why a call ended (as the call widget reports it) -> the override that carries its sound.
const CALL_END_SOUND_OVERRIDES = {
  timeout: 'timeout',
  decline: 'decline',
  user: 'left',
} as const;

/**
 * The end reasons whose sound Cinny plays itself (see playCallEndSound), for the call to
 * close right away instead of staying on screen until its own sound has finished.
 */
export const getCallSoundHandoff = (): string[] => {
  const overrides = getCallSoundOverrides();
  return Object.entries(CALL_END_SOUND_OVERRIDES)
    .filter(([, override]) => overrides[override])
    .map(([reason]) => reason);
};

/** Plays the end-of-call sound for a reason in getCallSoundHandoff, after the call has closed. */
export const playCallEndSound = (reason: unknown): void => {
  if (typeof reason !== 'string' || !(reason in CALL_END_SOUND_OVERRIDES)) return;
  const url =
    getCallSoundOverrides()[
      CALL_END_SOUND_OVERRIDES[reason as keyof typeof CALL_END_SOUND_OVERRIDES]
    ];
  if (!url) return;
  const audio = new Audio(url);
  audio.volume = getSettings().soundVolume;
  audio.play().catch(() => undefined);
};
