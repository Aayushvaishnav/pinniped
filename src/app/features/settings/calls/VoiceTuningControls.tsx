import React, { useState } from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { SettingTile } from '../../../components/setting-tile';
import { Slider } from '../../../components/slider';
import {
  VoiceTuning,
  VoiceTuningSpec,
  defaultVoiceTuning,
  formatTuningValue,
} from '../../../plugins/call/voiceTuning';

type VoiceTuningControlsProps = {
  /** The label of the button that unfolds the sliders. */
  label: string;
  specs: VoiceTuningSpec[];
  tuning: VoiceTuning;
  onChange: (key: keyof VoiceTuning, value: number) => void;
  /** Puts every slider in `specs` back to its default. */
  onReset: (keys: (keyof VoiceTuning)[]) => void;
};

/** A folded group of tuning sliders, each with its value and a plain-language description. */
export function VoiceTuningControls({
  label,
  specs,
  tuning,
  onChange,
  onReset,
}: VoiceTuningControlsProps) {
  const [open, setOpen] = useState(false);
  const modified = specs.some((s) => tuning[s.key] !== defaultVoiceTuning[s.key]);

  return (
    <Box direction="Column" gap="300">
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Button
          size="300"
          variant="Secondary"
          fill="Soft"
          radii="300"
          aria-expanded={open}
          after={<Icon size="100" src={open ? Icons.ChevronTop : Icons.ChevronBottom} />}
          onClick={() => setOpen(!open)}
        >
          <Text size="B300">{label}</Text>
        </Button>
        {open && (
          <Button
            size="300"
            variant="Secondary"
            fill="None"
            radii="300"
            disabled={!modified}
            onClick={() => onReset(specs.map((s) => s.key))}
          >
            <Text size="B300">Reset to defaults</Text>
          </Button>
        )}
      </Box>
      {open &&
        specs.map((spec) => (
          <SettingTile
            key={spec.key}
            title={spec.title}
            description={spec.description}
            after={
              <Box alignItems="Center" gap="200">
                <Slider
                  aria-label={spec.title}
                  value={tuning[spec.key]}
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  onChange={(value) => onChange(spec.key, value)}
                />
                <Text size="T300" style={{ minWidth: '7ch', textAlign: 'right' }}>
                  {formatTuningValue(spec, tuning[spec.key])}
                </Text>
              </Box>
            }
          />
        ))}
    </Box>
  );
}
