import React, { useCallback, useState } from 'react';
import {
  Box,
  config,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RadioButton,
  RectCords,
  Switch,
  Text,
  color,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import {
  CallEmbed,
  screenShareFrameRates,
  screenShareResolutions,
  ScreenShareQuality,
} from '../../plugins/call';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { stopPropagation } from '../../utils/keyboard';

type OptionProps = { label: string; selected: boolean; onSelect: () => void };
function Option({ label, selected, onSelect }: OptionProps) {
  return (
    <MenuItem
      size="300"
      radii="300"
      variant="Surface"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      after={<RadioButton variant="Primary" size="300" checked={selected} readOnly tabIndex={-1} />}
    >
      <Text size="T300">{label}</Text>
    </MenuItem>
  );
}

/**
 * Screen share quality: frame rate and resolution,
 * open before or during a share. Changes apply to a running share too.
 * Returns the chevron's click handler (given the button as anchor) and the menu to render.
 */
export const useScreenShareQualityMenu = (callEmbed: CallEmbed, sharing: boolean) => {
  const [quality, setQuality] = useSetting(settingsAtom, 'callScreenShare');
  const [shareAudio, setShareAudio] = useSetting(settingsAtom, 'callScreenShareAudio');
  const [anchor, setAnchor] = useState<RectCords>();

  const open = useCallback((button: HTMLElement) => {
    setAnchor(button.getBoundingClientRect());
  }, []);

  const update = (change: Partial<ScreenShareQuality>) => setQuality({ ...quality, ...change });

  const menu = (
    <PopOut
      anchor={anchor}
      position="Top"
      align="Center"
      offset={8}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setAnchor(undefined),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu style={{ minWidth: 220 }}>
            <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
              {sharing && (
                <>
                  <MenuItem
                    size="300"
                    radii="300"
                    variant="Critical"
                    onClick={() => {
                      setAnchor(undefined);
                      callEmbed.control.toggleScreenshare();
                    }}
                  >
                    <Text size="T300">Stop Streaming</Text>
                  </MenuItem>
                  <Line variant="Surface" size="300" />
                </>
              )}
              <MenuItem
                size="300"
                radii="300"
                variant="Surface"
                role="menuitemcheckbox"
                aria-checked={shareAudio}
                onClick={() => setShareAudio(!shareAudio)}
                after={<Switch variant="Primary" value={shareAudio} tabIndex={-1} />}
              >
                <Text size="T300">Share Audio</Text>
              </MenuItem>
              <Line variant="Surface" size="300" />
              <Text
                size="L400"
                style={{
                  padding: `${config.space.S100} ${config.space.S200}`,
                  color: color.Surface.OnContainer,
                }}
                priority="300"
              >
                Frame Rate
              </Text>
              {screenShareFrameRates.map((fps) => (
                <Option
                  key={fps}
                  label={`${fps} FPS`}
                  selected={quality.fps === fps}
                  onSelect={() => update({ fps })}
                />
              ))}
              <Line variant="Surface" size="300" />
              <Text
                size="L400"
                style={{ padding: `${config.space.S100} ${config.space.S200}` }}
                priority="300"
              >
                Resolution
              </Text>
              {screenShareResolutions.map((r) => (
                <Option
                  key={r.id}
                  label={r.name}
                  selected={quality.resolution === r.id}
                  onSelect={() => update({ resolution: r.id })}
                />
              ))}
            </Box>
          </Menu>
        </FocusTrap>
      }
    />
  );

  return [open, menu] as const;
};
