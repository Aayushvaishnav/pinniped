import { RefObject, useEffect } from 'react';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';

/** Keeps a bundle sound's <audio> element at the sound volume setting. */
export const useSoundVolume = (audioRef: RefObject<HTMLAudioElement | null>) => {
  const [volume] = useSetting(settingsAtom, 'soundVolume');

  useEffect(() => {
    const element = audioRef.current;
    if (element) element.volume = volume;
  }, [audioRef, volume]);
};
