import { useEffect, useState } from 'react';
import { ClientEvent, MatrixClient, UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
  extended: Record<string, unknown>;
  loaded: boolean;
};
// Every message and member row asks for its sender's profile. Share one request
// per user and remember failures for a while, so an unreachable homeserver costs
// one request instead of one per row and per remount.
const PROFILE_FAILURE_TTL_MS = 5 * 60 * 1000;
const profileFailures = new Map<string, number>();
const profileRequests = new Map<string, Promise<Record<string, unknown>>>();

const hasRecentProfileFailure = (userId: string): boolean => {
  const failedAt = profileFailures.get(userId);
  if (failedAt === undefined) return false;
  if (Date.now() - failedAt < PROFILE_FAILURE_TTL_MS) return true;
  profileFailures.delete(userId);
  return false;
};

const fetchExtendedProfile = (
  mx: MatrixClient,
  userId: string
): Promise<Record<string, unknown>> => {
  const pending = profileRequests.get(userId);
  if (pending) return pending;

  const request = mx
    .getExtendedProfile(userId)
    .catch((err) => {
      profileFailures.set(userId, Date.now());
      throw err;
    })
    .finally(() => profileRequests.delete(userId));
  profileRequests.set(userId, request);
  return request;
};

export const useUserProfile = (userId: string): UserProfile => {
  const mx = useMatrixClient();

  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = mx.getUser(userId);
    return {
      avatarUrl: user?.avatarUrl,
      displayName: user?.displayName,
      extended: {},
      loaded: false,
    };
  });

  useEffect(() => {
    const user = mx.getUser(userId);
    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatarUrl: myUser.avatarUrl,
      }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        displayName: myUser.displayName,
      }));
    };
    const onProfileUpdate = (
      updatedUserId: string,
      updatedProfile: Record<string, unknown> | null
    ) => {
      if (updatedUserId !== userId) return;
      setProfile((current) => ({
        ...current,
        extended: updatedProfile === null ? {} : { ...current.extended, ...updatedProfile },
        loaded: true,
      }));
    };

    if (hasRecentProfileFailure(userId)) {
      setProfile((current) => ({ ...current, loaded: true }));
    } else {
      fetchExtendedProfile(mx, userId).then(
        (info) =>
          setProfile({
            avatarUrl: typeof info.avatar_url === 'string' ? info.avatar_url : undefined,
            displayName: typeof info.displayname === 'string' ? info.displayname : undefined,
            extended: info,
            loaded: true,
          }),
        () => setProfile((current) => ({ ...current, loaded: true }))
      );
    }

    mx.on(ClientEvent.UserProfileUpdate, onProfileUpdate);
    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);
    return () => {
      mx.removeListener(ClientEvent.UserProfileUpdate, onProfileUpdate);
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId]);

  return profile;
};
