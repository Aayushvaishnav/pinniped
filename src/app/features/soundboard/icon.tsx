import React from 'react';
import { AudioLines } from 'lucide-react';
import type { IconSrc } from 'folds';

// folds IconSrc render function (not a component), like the lucide overrides in src/folds.
// eslint-disable-next-line react/function-component-definition
export const SoundboardIcon: IconSrc = () =>
  React.createElement(AudioLines, {
    width: '100%',
    height: '100%',
    fill: 'none',
    stroke: 'currentColor',
  });
