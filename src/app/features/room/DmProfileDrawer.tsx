import React from 'react';
import { Box, Scroll, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useUserPresence } from '../../hooks/useUserPresence';
import { useUserRichPresence } from '../../hooks/useUserRichPresence';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { guessDmRoomUserId, mxcUrlToHttp } from '../../utils/matrix';
import { UserBiography } from '../../components/user-profile/UserBiography';
import {
  getProfileBanner,
  getProfileBiography,
  getProfilePronouns,
} from '../../../types/matrix/profile';
import { UserHero, UserHeroName } from '../../components/user-profile/UserHero';
import { IgnoredUserAlert, MutualRoomsChip } from '../../components/user-profile/UserChips';
import { UserRichPresence } from '../../components/user-profile/UserRichPresence';

type DmProfileDrawerProps = {
  room: Room;
};

/**
 * Replaces the member list in the right sidebar for direct message rooms.
 * Shows the DM partner's profile card (banner, avatar, name, bio, presence,
 * mutual rooms) so the conversation feels personal instead of presenting a
 * one-entry member list. Mirrors the curated subset of `UserRoomProfile`
 * without the room-moderation controls that are irrelevant to a 1:1 DM.
 */
export function DmProfileDrawer({ room }: DmProfileDrawerProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const myUserId = mx.getSafeUserId();

  // Resolve the DM partner. Prefer the SDK's avatar fallback member so the
  // profile matches whoever the header avatar shows, then fall back to a best
  // guess (and finally to ourselves for self-chats).
  const fallbackMember = room.getAvatarFallbackMember();
  const userId = fallbackMember?.userId ?? guessDmRoomUserId(room, myUserId);

  const ignoredUsers = useIgnoredUsers();
  const ignored = ignoredUsers.includes(userId);

  const displayName = getMemberDisplayName(room, userId);
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = (avatarMxc && mxcUrlToHttp(mx, avatarMxc, useAuthentication)) ?? undefined;

  const presence = useUserPresence(userId);
  const richPresence = useUserRichPresence(userId);
  const profile = useUserProfile(userId);
  const pronouns = getProfilePronouns(profile.extended)
    .map((pronoun) => pronoun.summary)
    .join(', ');
  const bannerMxc = getProfileBanner(profile.extended);
  const biography = getProfileBiography(profile.extended);
  const bannerUrl = bannerMxc
    ? (mxcUrlToHttp(mx, bannerMxc, useAuthentication) ?? undefined)
    : undefined;

  return (
    <Box className={ContainerColor({ variant: 'Background' })} grow="Yes" direction="Column">
      <Box grow="Yes" style={{ position: 'relative', overflow: 'hidden' }}>
        <Scroll variant="Background" size="300" visibility="Hover" hideTrack>
          <Box direction="Column">
            <UserHero
              userId={userId}
              avatarUrl={avatarUrl}
              bannerUrl={bannerUrl}
              profileLoaded={profile.loaded}
              presence={presence && presence.lastActiveTs !== 0 ? presence : undefined}
            />
            <Box direction="Column" gap="500" style={{ padding: config.space.S400 }}>
              <Box direction="Column" gap="400">
                <UserHeroName displayName={displayName} userId={userId} pronouns={pronouns} />
                {userId !== myUserId && <MutualRoomsChip userId={userId} />}
              </Box>
              {biography && <UserBiography biography={biography} />}
              {richPresence && <UserRichPresence presence={richPresence} />}
              {ignored && <IgnoredUserAlert />}
            </Box>
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
