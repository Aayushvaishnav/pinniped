import React from 'react';
import { Box, Switch, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { SOUND_TOGGLES, SoundToggleGroup, isSoundEnabled } from '../../../sound/toggles';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useSetSoundToggle } from '../../../hooks/useSoundToggle';
import { SequenceCardStyle } from '../styles.css';

const GROUPS: SoundToggleGroup[] = ['Notifications', 'App Events', 'Calls'];

/** One switch per sound the app plays. Needs notification sounds on, and a bundle that has the sound. */
export function SoundToggles() {
  const settings = useAtomValue(settingsAtom);
  const [masterOn] = useSetting(settingsAtom, 'isNotificationSounds');
  const setToggle = useSetSoundToggle();

  return (
    <>
      {GROUPS.map((group) => (
        <Box key={group} direction="Column" gap="100">
          <Text size="L400">{`${group} Sounds`}</Text>
          <SequenceCard
            className={SequenceCardStyle}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            {SOUND_TOGGLES.filter((t) => t.group === group).map((t) => (
              <SettingTile
                key={t.kind}
                title={t.title}
                description={t.description}
                after={
                  <Switch
                    disabled={!masterOn}
                    value={isSoundEnabled(settings, t.kind)}
                    onChange={(enabled) => setToggle(t.kind, enabled)}
                  />
                }
              />
            ))}
          </SequenceCard>
        </Box>
      ))}
    </>
  );
}
