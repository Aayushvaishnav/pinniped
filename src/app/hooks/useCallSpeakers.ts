import { useEffect, useState } from 'react';
import { CallEmbed } from '../plugins/call';
import { isUserId } from '../utils/matrix';
import { useCallJoined } from './useCallEmbed';

export const useCallParticipantActivity = (callEmbed?: CallEmbed) => {
  const [speakers, setSpeakers] = useState(new Set<string>());
  const [screenSharers, setScreenSharers] = useState(new Set<string>());
  const [muted, setMuted] = useState(new Set<string>());
  const joined = useCallJoined(callEmbed);

  useEffect(() => {
    setSpeakers(new Set());
    setScreenSharers(new Set());
    setMuted(new Set());
    if (!callEmbed || !joined) return undefined;

    let observer: MutationObserver | undefined;
    const observeDocument = () => {
      observer?.disconnect();
      const { document } = callEmbed;
      if (!document) return;

      const updateSpeakers = () => {
        const next = new Set<string>();
        const sharing = new Set<string>();
        const mutedNow = new Set<string>();
        // Read every tile: a mutation batch need not include speakers whose state is unchanged.
        document.querySelectorAll('[data-video-fit]').forEach((element) => {
          const speaking = element.getAttribute('data-cinny-speaking') === 'true';
          const userId =
            element.getAttribute('data-cinny-user-id') ??
            Array.from(element.querySelectorAll('[aria-label]'))
              .map((el) => el.getAttribute('aria-label'))
              .find((label): label is string => !!label && isUserId(label));
          if (!userId) return;
          // Element Call identifies local and remote presentation tiles with this suffix.
          if (element.getAttribute('data-id')?.endsWith(':screen-share')) sharing.add(userId);
          else {
            if (speaking) next.add(userId);
            if (element.getAttribute('data-cinny-muted') === 'true') mutedNow.add(userId);
          }
        });
        setMuted((previous) =>
          previous.size === mutedNow.size && Array.from(mutedNow).every((id) => previous.has(id))
            ? previous
            : mutedNow
        );
        setScreenSharers((previous) =>
          previous.size === sharing.size && Array.from(sharing).every((id) => previous.has(id))
            ? previous
            : sharing
        );
        setSpeakers((previous) =>
          previous.size === next.size && Array.from(next).every((id) => previous.has(id))
            ? previous
            : next
        );
      };

      // Tiles can mount after joining and be replaced when the call layout changes.
      observer = new MutationObserver(updateSpeakers);
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          'data-cinny-speaking',
          'data-cinny-muted',
          'data-cinny-user-id',
          'aria-label',
          'data-id',
        ],
      });
      updateSpeakers();
    };

    observeDocument();
    callEmbed.iframe.addEventListener('load', observeDocument);
    return () => {
      observer?.disconnect();
      callEmbed.iframe.removeEventListener('load', observeDocument);
    };
  }, [callEmbed, joined]);

  return {
    speakers: callEmbed && joined ? speakers : new Set<string>(),
    screenSharers: callEmbed && joined ? screenSharers : new Set<string>(),
    muted: callEmbed && joined ? muted : new Set<string>(),
  };
};

export const useCallSpeakers = (callEmbed?: CallEmbed): Set<string> =>
  useCallParticipantActivity(callEmbed).speakers;
