import React, { useState } from 'react';
import { Icon, IconButton, Icons, PopOut, RectCords, Text } from 'folds';
import { EmojiBoard } from '../../components/emoji-board';

type EmojiPickerButtonProps = {
  value?: string;
  onChange: (emoji: string | undefined) => void;
};
/**
 * Picks one emoji with the app's emoji picker. Shows the chosen emoji; clicking it clears it,
 * clicking the empty button opens the picker.
 */
export function EmojiPickerButton({ value, onChange }: EmojiPickerButtonProps) {
  const [anchor, setAnchor] = useState<RectCords>();

  return (
    <>
      <IconButton
        type="button"
        size="400"
        radii="300"
        variant="Secondary"
        fill="Soft"
        outlined
        aria-label={value ? 'Remove emoji' : 'Pick emoji'}
        aria-pressed={!!anchor}
        onClick={(evt) => {
          if (value) onChange(undefined);
          else setAnchor(evt.currentTarget.getBoundingClientRect());
        }}
      >
        {value ? (
          <Text as="span" size="T400">
            {value}
          </Text>
        ) : (
          <Icon size="100" src={Icons.Smile} />
        )}
      </IconButton>
      <PopOut
        anchor={anchor}
        position="Bottom"
        align="Start"
        content={
          <EmojiBoard
            imagePackRooms={[]}
            returnFocusOnDeactivate={false}
            allowTextCustomEmoji={false}
            onEmojiSelect={(unicode) => {
              onChange(unicode);
              setAnchor(undefined);
            }}
            requestClose={() => setAnchor(undefined)}
          />
        }
      />
    </>
  );
}
