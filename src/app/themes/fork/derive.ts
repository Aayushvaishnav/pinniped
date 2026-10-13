import chroma from 'chroma-js';

/**
 * Raw palette roles sourced from each upstream theme family. State colors
 * (hover/active/line/containers) are derived deterministically from these;
 * see README.md for the derivation rules.
 */
export type ForkPalette = {
  /** Base background. */
  bg0: string;
  /** Elevated surface (panels, sidebars, cards). */
  bg1: string;
  /** Further elevated surface (inputs, menus); derived when absent. */
  bg2?: string;
  /** Primary accent: interactive controls and highlights. */
  accent: string;
  /** Success accent. */
  green: string;
  /** Warning accent; falls back to `yellow` when the palette has no distinct orange. */
  orange?: string;
  yellow: string;
  /** Critical accent. */
  red: string;
  /** Main text color. */
  fg: string;
};

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** WCAG 2.1 contrast ratio between two colors. */
export const contrastRatio = (a: string, b: string): number => chroma.contrast(a, b);

const mix = (from: string, to: string, amount: number): string =>
  chroma.mix(from, to, amount, 'rgb').hex();

const lighten = (hex: string, amount: number): string => mix(hex, WHITE, amount);

/** Shift CIE L* while keeping hue and chroma, clamped to a usable dark-theme range. */
const shiftLightness = (hex: string, delta: number): string => {
  const [l, a, b] = chroma(hex).lab();
  return chroma.lab(Math.min(96, Math.max(12, l + delta)), a, b).hex();
};

const surfaceData = (container: string, fg: string) => ({
  Container: container,
  ContainerHover: lighten(container, 0.05),
  ContainerActive: lighten(container, 0.1),
  ContainerLine: lighten(container, 0.15),
  OnContainer: fg,
});

/**
 * Light accents (L* >= 50) darken toward black on interaction, matching the
 * built-in dark theme; darker accents lighten away from the background so
 * hover states stay visible. Every accent in the current fork palettes
 * darkens; the branch exists for future muted dark palettes.
 */
const darkenOnInteract = (accent: string): boolean => chroma(accent).lab()[0] >= 50;

const mostReadable = (accent: string, candidates: string[]): string =>
  candidates.reduce((best, candidate) =>
    contrastRatio(candidate, accent) > contrastRatio(best, accent) ? candidate : best
  );

/** Darkest readable tone of the accent's own hue, falling back to a neutral tone. */
const darkOnCandidates = (accent: string): string[] => [
  shiftLightness(accent, -48),
  shiftLightness(accent, -56),
  mix(accent, BLACK, 0.88),
  mix(accent, BLACK, 0.96),
];

/** Lightest readable tone of the accent's own hue, falling back to near-white. */
const lightOnCandidates = (accent: string): string[] => [
  shiftLightness(accent, 28),
  shiftLightness(accent, 36),
  mix(accent, WHITE, 0.85),
  mix(accent, WHITE, 0.95),
];

const firstReadable = (accent: string, candidates: string[]): string => {
  const readable = candidates.find((candidate) => contrastRatio(candidate, accent) >= 4.5);
  return readable ?? mostReadable(accent, candidates);
};

/** Readable text tone for an accent surface: dark on light accents, light on dark ones. */
const onAccentMain = (accent: string): string => {
  const candidates =
    chroma(accent).lab()[0] >= 50
      ? firstReadable(accent, darkOnCandidates(accent))
      : firstReadable(accent, lightOnCandidates(accent));
  return candidates;
};

/** Lightest tone of the accent hue that stays readable on its dark container. */
const onAccentContainer = (accent: string, container: string): string => {
  const candidates = [0.55, 0.7, 0.85].map((amount) => mix(accent, WHITE, amount));
  const readable = candidates.find((candidate) => contrastRatio(candidate, container) >= 4.5);
  return readable ?? candidates[candidates.length - 1];
};

const accentData = (accent: string, bg: string) => {
  const darken = darkenOnInteract(accent);
  const shift = (delta: number) => shiftLightness(accent, darken ? -delta : delta);
  const container = mix(accent, bg, 0.72);

  return {
    Main: accent,
    MainHover: shift(5),
    MainActive: shift(10),
    MainLine: shift(15),
    OnMain: onAccentMain(accent),
    Container: container,
    ContainerHover: mix(accent, bg, 0.66),
    ContainerActive: mix(accent, bg, 0.6),
    ContainerLine: mix(accent, bg, 0.54),
    OnContainer: onAccentContainer(accent, container),
  };
};

/** Neutral gray ramp derived from the palette's own foreground and background. */
const secondaryData = (fg: string, bg: string) => ({
  Main: fg,
  MainHover: mix(fg, bg, 0.1),
  MainActive: mix(fg, bg, 0.2),
  MainLine: mix(fg, bg, 0.3),
  OnMain: bg,
  Container: mix(bg, fg, 0.16),
  ContainerHover: mix(bg, fg, 0.2),
  ContainerActive: mix(bg, fg, 0.24),
  ContainerLine: mix(bg, fg, 0.28),
  OnContainer: fg,
});

export const deriveColorData = (palette: ForkPalette) => {
  const { bg0, bg1 } = palette;
  const bg2 = palette.bg2 ?? lighten(bg1, 0.05);

  return {
    Background: surfaceData(bg0, palette.fg),
    Surface: surfaceData(bg1, palette.fg),
    SurfaceVariant: surfaceData(bg2, palette.fg),
    Primary: accentData(palette.accent, bg0),
    Secondary: secondaryData(palette.fg, bg0),
    Success: accentData(palette.green, bg0),
    Warning: accentData(palette.orange ?? palette.yellow, bg0),
    Critical: accentData(palette.red, bg0),
    Other: {
      FocusRing: 'rgba(255, 255, 255, 0.5)',
      Shadow: 'rgba(0, 0, 0, 1)',
      Overlay: 'rgba(0, 0, 0, 0.8)',
    },
  };
};
