import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const ExportBar = style([
  DefaultReset,
  {
    backgroundColor: color.Primary.Container,
    color: color.Primary.OnContainer,
  },
]);

export const ExportBarText = style({
  flexGrow: 1,
});

export const AnchorMark = style([
  DefaultReset,
  {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: config.borderWidth.B700,
    backgroundColor: color.Primary.Main,
  },
]);

export const AnchorMarkStart = style({
  borderTopRightRadius: config.radii.R300,
});

export const AnchorMarkEnd = style({
  borderBottomRightRadius: config.radii.R300,
});
