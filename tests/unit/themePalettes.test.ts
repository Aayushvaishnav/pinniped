import { describe, expect, it } from 'vitest';
import { contrastRatio, deriveColorData } from '../../src/app/themes/fork/derive';
import { forkThemeRegistry } from '../../src/app/themes/fork/registry';

const HEX = /^#[0-9a-fA-F]{6}$/;
const RGBA = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/;

const paletteOf = (themeId: string) => {
  const entry = forkThemeRegistry.find((candidate) => candidate.id === themeId);
  if (!entry) throw new Error(`missing palette: ${themeId}`);
  return entry.palette;
};

const colorGroups = (themeId: string) => deriveColorData(paletteOf(themeId));

const SURFACE_GROUPS = ['Background', 'Surface', 'SurfaceVariant'] as const;
const ACCENT_GROUPS = ['Primary', 'Secondary', 'Success', 'Warning', 'Critical'] as const;
const COLORED_GROUPS = [...SURFACE_GROUPS, ...ACCENT_GROUPS] as const;

const groupKeys = [
  'Container',
  'ContainerHover',
  'ContainerActive',
  'ContainerLine',
  'OnContainer',
];
const accentKeys = [
  'Main',
  'MainHover',
  'MainActive',
  'MainLine',
  'OnMain',
  'Container',
  'ContainerHover',
  'ContainerActive',
  'ContainerLine',
  'OnContainer',
];

describe('fork theme palettes', () => {
  it('defines the complete Folds token contract for every theme', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      expect(Object.keys(data).sort()).toEqual(
        [
          'Background',
          'Critical',
          'Other',
          'Primary',
          'Secondary',
          'Success',
          'Surface',
          'SurfaceVariant',
          'Warning',
        ].sort()
      );
      SURFACE_GROUPS.forEach((group) => {
        expect(Object.keys(data[group]).sort()).toEqual([...groupKeys].sort());
      });
      ACCENT_GROUPS.forEach((group) => {
        expect(Object.keys(data[group]).sort()).toEqual([...accentKeys].sort());
      });
      expect(Object.keys(data.Other).sort()).toEqual(['FocusRing', 'Overlay', 'Shadow'].sort());
    });
  });

  it('uses valid color values everywhere', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      COLORED_GROUPS.forEach((group) => {
        Object.entries(data[group]).forEach(([key, value]) => {
          expect(value, `${id}.${group}.${key}`).toMatch(HEX);
        });
      });
      Object.entries(data.Other).forEach(([key, value]) => {
        expect(value, `${id}.Other.${key}`).toMatch(RGBA);
      });
    });
  });

  it('keeps text readable on all normal surface levels (WCAG AA)', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      SURFACE_GROUPS.forEach((group) => {
        expect(
          contrastRatio(data[group].OnContainer, data[group].Container),
          `${id}.${group}`
        ).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('keeps text readable on hovered and pressed surface states', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      SURFACE_GROUPS.forEach((group) => {
        expect(
          contrastRatio(data[group].OnContainer, data[group].ContainerHover),
          `${id}.${group}.hover`
        ).toBeGreaterThanOrEqual(4);
        expect(
          contrastRatio(data[group].OnContainer, data[group].ContainerActive),
          `${id}.${group}.active`
        ).toBeGreaterThanOrEqual(3.5);
      });
    });
  });

  it('keeps on-accent text readable on normal and interacted accent states', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      ACCENT_GROUPS.forEach((group) => {
        const accent = data[group];
        expect(
          contrastRatio(accent.OnMain, accent.Main),
          `${id}.${group}.OnMain`
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(accent.OnMain, accent.MainHover),
          `${id}.${group}.OnMain.hover`
        ).toBeGreaterThanOrEqual(3.5);
        expect(
          contrastRatio(accent.OnMain, accent.MainActive),
          `${id}.${group}.OnMain.active`
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(accent.OnContainer, accent.Container),
          `${id}.${group}.OnContainer`
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(accent.OnContainer, accent.ContainerHover),
          `${id}.${group}.OnContainer.hover`
        ).toBeGreaterThanOrEqual(4);
      });
    });
  });

  it('keeps accent controls visible against the background (3:1 non-text)', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      (['Primary', 'Success', 'Warning', 'Critical'] as const).forEach((group) => {
        expect(
          contrastRatio(data[group].Main, data.Background.Container),
          `${id}.${group}.Main`
        ).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it('derives distinct surfaces for each hard/medium/soft and flavor variant', () => {
    const backgroundsOf = (prefix: string) =>
      forkThemeRegistry
        .filter((entry) => entry.id.startsWith(prefix))
        .map((entry) => colorGroups(entry.id).Background.Container);

    (['everforest-dark', 'gruvbox-dark', 'catppuccin', 'tokyo-night'] as const).forEach(
      (prefix) => {
        const backgrounds = backgroundsOf(prefix);
        expect(new Set(backgrounds).size).toBe(backgrounds.length);
      }
    );
  });

  it('keeps success, warning, and critical visually distinct from primary', () => {
    forkThemeRegistry.forEach(({ id }) => {
      const data = colorGroups(id);
      const mains = [data.Primary.Main, data.Success.Main, data.Warning.Main, data.Critical.Main];
      expect(new Set(mains).size).toBe(mains.length);
    });
  });

  it('focus ring, shadow, and overlay match the built-in dark behavior', () => {
    forkThemeRegistry.forEach(({ id }) => {
      expect(colorGroups(id).Other).toEqual({
        FocusRing: 'rgba(255, 255, 255, 0.5)',
        Shadow: 'rgba(0, 0, 0, 1)',
        Overlay: 'rgba(0, 0, 0, 0.8)',
      });
    });
  });
});
