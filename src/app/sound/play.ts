import { getSettings } from '../state/settings';
import { EventSoundKind, getSoundUrl } from './bundles';

// A sound that never ends (stalled load) must not hold up callers that await it, e.g. logout.
const MAX_WAIT_MS = 2000;

/** Plays the selected bundle's sound for an app event, if event sounds are enabled. */
export const playEventSound = (kind: EventSoundKind): Promise<void> => {
  const { isNotificationSounds, eventSounds, notificationSoundBundle } = getSettings();
  if (!isNotificationSounds || !eventSounds) return Promise.resolve();
  const url = getSoundUrl(notificationSoundBundle, kind);
  if (!url) return Promise.resolve();

  const audio = new Audio(url);
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
