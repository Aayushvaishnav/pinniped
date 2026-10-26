import React, { useCallback } from 'react';
import { Box, Text } from 'folds';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { SoundPackContent } from '../../plugins/sound-pack';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useUserSoundPack } from '../../hooks/useSoundPacks';
import { SoundPackEditor } from './SoundPackEditor';

/** The user's own soundboard sounds (account data), shown in Settings → Calls. */
export function UserSoundPack() {
  const mx = useMatrixClient();
  const pack = useUserSoundPack();

  const handleUpdate = useCallback(
    (content: SoundPackContent) => mx.setAccountData(AccountDataEvent.PinnipedUserSounds, content),
    [mx]
  );

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Soundboard</Text>
      <SoundPackEditor pack={pack} canEdit onUpdate={handleUpdate} />
    </Box>
  );
}
