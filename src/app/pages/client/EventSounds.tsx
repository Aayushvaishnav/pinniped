import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { EventType, MatrixEvent, RelationType, RoomEvent, User, UserEvent } from 'matrix-js-sdk';
import { EventStatus } from 'matrix-js-sdk/lib/models/event-status';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { callEmbedAtom } from '../../state/callEmbed';
import { playEventSound } from '../../sound/play';

/** Opt-in bundle sounds for events the app has no notification for. */
export function EventSounds() {
  const mx = useMatrixClient();
  const callEmbed = useAtomValue(callEmbedAtom);
  const hadCallRef = useRef(false);

  useEffect(() => {
    playEventSound('signin');
  }, []);

  useEffect(() => {
    const hasCall = callEmbed !== undefined;
    if (hasCall !== hadCallRef.current) {
      hadCallRef.current = hasCall;
      playEventSound(hasCall ? 'callStart' : 'callEnd');
    }
  }, [callEmbed]);

  useEffect(() => {
    const onLocalEcho = (mEvent: MatrixEvent) => {
      if (mEvent.getSender() !== mx.getUserId()) return;
      if (mEvent.status !== EventStatus.SENT) return;
      if (mEvent.getType() !== EventType.RoomMessage) return;
      if (mEvent.isRelation(RelationType.Replace)) return;
      playEventSound('sent');
    };
    mx.on(RoomEvent.LocalEchoUpdated, onLocalEcho);
    return () => {
      mx.removeListener(RoomEvent.LocalEchoUpdated, onLocalEcho);
    };
  }, [mx]);

  useEffect(() => {
    // Only contacts you have a DM with: presence for every user on the server would be noise.
    const lastOnline = new Map<string, boolean>();
    const onPresence = (_event: MatrixEvent | undefined, user: User) => {
      if (user.userId === mx.getUserId()) return;
      const online = user.presence === 'online';
      const was = lastOnline.get(user.userId);
      lastOnline.set(user.userId, online);
      if (was === undefined || was === online) return;
      const direct = mx.getAccountData(EventType.Direct)?.getContent() ?? {};
      if (!(user.userId in direct)) return;
      playEventSound(online ? 'online' : 'offline');
    };
    mx.on(UserEvent.Presence, onPresence);
    return () => {
      mx.removeListener(UserEvent.Presence, onPresence);
    };
  }, [mx]);

  return null;
}
