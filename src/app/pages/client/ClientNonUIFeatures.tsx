import { useAtomValue } from 'jotai';
import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatrixEvent, MatrixEventEvent, Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import LogoSVG from '../../../../public/res/svg/pinniped.svg';
import LogoUnreadSVG from '../../../../public/res/svg/pinniped-unread.svg';
import LogoHighlightSVG from '../../../../public/res/svg/pinniped-highlight.svg';
import NotificationSound from '../../../../public/sound/notification.ogg';
import InviteSound from '../../../../public/sound/invite.ogg';
import { notificationPermission, setFavicon } from '../../utils/dom';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getInboxInvitesPath } from '../pathUtils';
import {
  getEventBodyForNotification,
  getMemberAvatarMxc,
  getMemberDisplayName,
  getNotificationType,
  isNotificationEvent,
} from '../../utils/room';
import { NotificationType } from '../../../types/matrix/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { useInboxNotificationsSelected } from '../../hooks/router/useInbox';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { migrateLegacyAccountData } from '../../state/accountDataMigration';
import { migrateGifFavorites } from '../../state/gifFavorites';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { mDirectAtom } from '../../state/mDirectList';
import { useSpaceAutoJoinGlobal } from '../../hooks/useSpaceAutoJoinGlobal';
import { useRoomNavShortcuts } from '../../hooks/useRoomNavShortcuts';
import { useRoomNavHistory } from '../../hooks/useRoomNavHistory';
import { renderBadgeOverlay } from '../../utils/desktopBadge';

function GifFavoritesMigration() {
  const mx = useMatrixClient();

  useEffect(() => {
    // failed writes keep the legacy store, so we retry on next launch
    // legacy im.kibby.* types must be copied first so the localStorage merge
    // lands on top of the migrated favourites
    migrateLegacyAccountData(mx)
      .then(() => migrateGifFavorites(mx))
      .catch(() => undefined);
  }, [mx]);

  return null;
}

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function PageZoomFeature() {
  const [pageZoom] = useSetting(settingsAtom, 'pageZoom');

  if (pageZoom === 100) {
    document.documentElement.style.removeProperty('font-size');
  } else {
    document.documentElement.style.setProperty('font-size', `calc(1em * ${pageZoom / 100})`);
  }

  return null;
}

function FaviconUpdater() {
  const roomToUnread = useAtomValue(roomToUnreadAtom);

  useEffect(() => {
    let notification = false;
    let highlight = false;
    roomToUnread.forEach((unread) => {
      if (unread.total > 0) {
        notification = true;
      }
      if (unread.highlight > 0) {
        highlight = true;
      }
    });

    if (notification) {
      setFavicon(highlight ? LogoHighlightSVG : LogoUnreadSVG);
    } else {
      setFavicon(LogoSVG);
    }
  }, [roomToUnread]);

  return null;
}

function DesktopBadgeFeature() {
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const directs = useAtomValue(mDirectAtom);

  useEffect(() => {
    const bridge = window.cinnyDesktop;
    if (!bridge?.setBadgeCount) return;

    let count = 0;
    let hasUnread = false;
    roomToUnread.forEach((unread, roomId) => {
      // Space entries aggregate their children; count each actual room once.
      if (unread.from !== null) return;
      hasUnread = true;
      count += directs.has(roomId) ? Math.max(unread.total, unread.highlight) : unread.highlight;
    });

    const overlay =
      bridge.platform === 'win32' && hasUnread ? renderBadgeOverlay(count) : undefined;
    bridge.setBadgeCount(count, overlay, hasUnread);
  }, [roomToUnread, directs]);

  useEffect(() => () => window.cinnyDesktop?.setBadgeCount?.(0, undefined, false), []);

  return null;
}

function InviteNotifications() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const invites = useAtomValue(allInvitesAtom);
  const perviousInviteLen = usePreviousValue(invites.length, 0);
  const mx = useMatrixClient();

  const navigate = useNavigate();
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');

  const notify = useCallback(
    (count: number) => {
      const noti = new window.Notification('Invitation', {
        icon: LogoSVG,
        badge: LogoSVG,
        body: `You have ${count} new invitation request.`,
        silent: true,
      });

      noti.onclick = (event) => {
        event.preventDefault();
        if (!window.closed) {
          window.cinnyDesktop?.showWindow?.();
          window.focus();
          navigate(getInboxInvitesPath());
        }
        noti.close();
      };
    },
    [navigate]
  );

  const playSound = useCallback(() => {
    const audioElement = audioRef.current;
    audioElement?.play();
  }, []);

  useEffect(() => {
    if (invites.length > perviousInviteLen && mx.getSyncState() === 'SYNCING') {
      if (showNotifications && notificationPermission('granted')) {
        notify(invites.length - perviousInviteLen);
      }

      if (notificationSound) {
        playSound();
      }
    }
  }, [mx, invites, perviousInviteLen, showNotifications, notificationSound, notify, playSound]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} style={{ display: 'none' }}>
      <source src={InviteSound} type="audio/ogg" />
    </audio>
  );
}

function MessageNotifications() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const pendingEventsRef = useRef<Map<MatrixEvent, Room>>(new Map());
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const mDirects = useAtomValue(mDirectAtom);
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');

  const { navigateRoom } = useRoomNavigate();
  const notificationSelected = useInboxNotificationsSelected();
  const selectedRoomId = useSelectedRoom();

  const notify = useCallback(
    ({
      title,
      body,
      icon,
      tag,
      roomId,
      eventId,
    }: {
      title: string;
      body: string;
      icon?: string;
      tag: string;
      roomId: string;
      eventId?: string;
    }) => {
      const noti = new window.Notification(title, {
        icon,
        badge: icon,
        body,
        tag,
        silent: true,
      });

      noti.onclick = (event) => {
        event.preventDefault();
        if (!window.closed) {
          window.cinnyDesktop?.showWindow?.();
          window.focus();
          navigateRoom(roomId, eventId);
        }
        noti.close();
      };
    },
    [navigateRoom]
  );

  const playSound = useCallback(() => {
    const audioElement = audioRef.current;
    audioElement?.play();
  }, []);

  useEffect(() => {
    const processEvent = (mEvent: MatrixEvent, room: Room) => {
      if (mx.getSyncState() !== 'SYNCING') return;
      if (document.hasFocus() && (selectedRoomId === room?.roomId || notificationSelected)) return;
      if (
        room.isSpaceRoom() ||
        !isNotificationEvent(mEvent) ||
        getNotificationType(mx, room.roomId) === NotificationType.Mute
      ) {
        return;
      }

      const sender = mEvent.getSender();
      const eventId = mEvent.getId();
      const userId = mx.getUserId();
      if (!sender || !eventId || !userId || sender === userId) return;
      if (seenEventsRef.current.has(eventId)) return;
      if (room.hasUserReadEvent(userId, eventId)) return;
      if (mEvent.getType() === 'm.room.encrypted' || mEvent.isDecryptionFailure()) {
        pendingEventsRef.current.set(mEvent, room);
        // Bound delayed-key events while retaining retries for recent messages.
        if (pendingEventsRef.current.size > 500) {
          const oldest = pendingEventsRef.current.keys().next().value;
          if (oldest) pendingEventsRef.current.delete(oldest);
        }
        return;
      }
      // Room counts can lag timeline events or stay unchanged within a sync batch.
      // Evaluate this message's push rules, including mention-only and silent rules.
      const actions = mx.getPushActionsForEvent(mEvent, true);
      if (!actions?.notify) return;
      seenEventsRef.current.add(eventId);
      if (seenEventsRef.current.size > 1000) {
        const oldest = seenEventsRef.current.values().next().value;
        if (oldest) seenEventsRef.current.delete(oldest);
      }

      if (showNotifications && notificationPermission('granted')) {
        const senderName = getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender;
        const senderAvatarMxc = getMemberAvatarMxc(room, sender) ?? room.getMxcAvatarUrl();
        const isDM = mDirects.has(room.roomId);

        let title: string;
        if (isDM) {
          title = senderName;
        } else {
          const roomName = room.name ?? 'Unknown';
          const parentRoomId = roomToParents.get(room.roomId)?.values().next().value;
          const parentName = parentRoomId ? mx.getRoom(parentRoomId)?.name : undefined;
          title = parentName
            ? `${senderName} (#${roomName}, ${parentName})`
            : `${senderName} (#${roomName})`;
        }

        notify({
          title,
          body: getEventBodyForNotification(mEvent),
          icon: senderAvatarMxc
            ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined
            : undefined,
          tag: room.roomId,
          roomId: room.roomId,
          eventId,
        });
      }

      if (notificationSound && actions.tweaks?.sound) {
        playSound();
      }
    };
    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      room,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (!room || !data.liveEvent || toStartOfTimeline || removed) return;
      processEvent(mEvent, room);
      if (pendingEventsRef.current.has(mEvent)) {
        mx.decryptEventIfNeeded(mEvent).catch(() => undefined);
      }
    };
    const handleDecrypted = (mEvent: MatrixEvent, error?: Error) => {
      const room = pendingEventsRef.current.get(mEvent);
      if (!room || error || mEvent.isDecryptionFailure()) return;
      pendingEventsRef.current.delete(mEvent);
      processEvent(mEvent, room);
    };
    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    mx.on(MatrixEventEvent.Decrypted, handleDecrypted);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
      mx.removeListener(MatrixEventEvent.Decrypted, handleDecrypted);
    };
  }, [
    mx,
    notificationSound,
    notificationSelected,
    showNotifications,
    playSound,
    notify,
    selectedRoomId,
    useAuthentication,
    roomToParents,
    mDirects,
  ]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} style={{ display: 'none' }}>
      <source src={NotificationSound} type="audio/ogg" />
    </audio>
  );
}

function SpaceAutoJoinFeature() {
  useSpaceAutoJoinGlobal();
  return null;
}

function RoomNavShortcutsFeature() {
  useRoomNavShortcuts();
  return null;
}

function RoomNavHistoryFeature() {
  useRoomNavHistory();
  return null;
}

type ClientNonUIFeaturesProps = {
  children: ReactNode;
};

export function ClientNonUIFeatures({ children }: ClientNonUIFeaturesProps) {
  return (
    <>
      <SystemEmojiFeature />
      <PageZoomFeature />
      <GifFavoritesMigration />
      <FaviconUpdater />
      <DesktopBadgeFeature />
      <InviteNotifications />
      <MessageNotifications />
      <SpaceAutoJoinFeature />
      <RoomNavShortcutsFeature />
      <RoomNavHistoryFeature />
      {children}
    </>
  );
}
