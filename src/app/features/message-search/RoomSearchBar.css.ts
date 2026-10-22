import { globalStyle, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const SearchForm = style({
  position: 'relative',
  width: toRem(240),
});

export const Suggestions = style({
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: config.space.S100,
  width: toRem(300),
  maxHeight: toRem(360),
  overflowY: 'auto',
  zIndex: 10,
  padding: config.space.S100,
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E200,
});

export const SuggestionTitle = style({
  padding: `${config.space.S100} ${config.space.S200}`,
});

globalStyle(`${SearchForm} input`, {
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 0,
});
