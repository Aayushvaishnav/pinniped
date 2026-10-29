import React, { VideoHTMLAttributes, forwardRef, useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames';
import * as css from './media.css';
import { getPersistedMediaVolume, updatePersistedMediaVolume } from '../../utils/mediaVolume';

export const Video = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(
  ({ className, ...props }, ref) => {
    const mediaRef = useRef<HTMLVideoElement | null>(null);

    const setRefs = useCallback(
      (el: HTMLVideoElement | null) => {
        mediaRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      },
      [ref]
    );

    useEffect(() => {
      const el = mediaRef.current;
      const handleChange = () => {
        if (!el) return;
        updatePersistedMediaVolume({ volume: Math.max(0, Math.min(el.volume, 1)) });
      };
      if (el) {
        // Apply the persisted volume to a freshly mounted video. Videos use
        // native controls, so only the level is persisted (mute is
        // caller-controlled, e.g. GIF auto-play relies on being muted).
        el.volume = getPersistedMediaVolume().volume;
        el.addEventListener('volumechange', handleChange);
      }
      return () => {
        el?.removeEventListener('volumechange', handleChange);
      };
    }, []);

    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video className={classNames(css.Video, className)} {...props} ref={setRefs} />
    );
  }
);
