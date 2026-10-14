# Fork dark themes

Self-contained module providing the 20 fork-only dark themes. Registry totals after integration:
24 themes (2 light, 22 dark). Built-ins (Light, Silver, Dark, Butter) are untouched and stay in
`src/colors.css.ts` / `src/app/hooks/useTheme.ts`.

## Layout

| File | Role |
| --- | --- |
| `palettes/*.ts` | Verified palette source data per family, with per-role provenance comments |
| `derive.ts` | Pure `ForkPalette` → full Folds color-token derivation and contrast helpers |
| `registry.ts` | Ordered `{ id, name, palette }` metadata; IDs are stable once released |
| `themes.css.ts` | One `createTheme(color, deriveColorData(palette))` per registry entry |
| `darkVariables.ts` | `on-dark-variables` body class constant |
| `index.ts` | Module exports consumed by `useTheme.ts` |

`registry.ts` and everything it imports are pure data (no Vanilla Extract), so tests can evaluate
the full registry and derivation in Node. `useTheme.ts` maps `forkThemes` into `Theme` entries with
`ThemeKind.Dark` and exposes `allThemes` / `themeDisplayNames` module constants next to the
existing hooks.

Every fork theme's `classNames` are `[<id>, <token class>, onDarkFontWeight, 'prism-dark',
'on-dark-variables']`. Dark and Butter carry `on-dark-variables` as well; the variables themselves
live once in `src/index.css` under `.dark-theme, .butter-theme, .on-dark-variables`.

## Palette provenance

All values were verified against the upstream sources below (fetched October 2026). All four
licenses permit redistribution of the color values with attribution; none require payment or
non-commercial terms. Palettes are embedded locally; nothing is downloaded at runtime.

| Family | Source | License | Notes on role mapping |
| --- | --- | --- | --- |
| Ayu | <https://github.com/ayu-theme/ayu-colors> (`themes/dark.yaml`, `themes/mirage.yaml`) | MIT | `surface.base/lift`, `ui.panel.bg`, `editor.fg`, base palette accents (ayu computes ramp steps at runtime, so stored base hexes are used) |
| Catppuccin | <https://github.com/catppuccin/palette> (`palette.json`) | MIT | `base/surface0/surface1` surfaces, `text` foreground, `blue` primary, `peach` warning |
| Dracula | <https://github.com/dracula/dracula-theme> (README palette table) | MIT | Only Background/Current Line are surfaces (SurfaceVariant derived); `purple` is primary (no blue in the palette) |
| Everforest | <https://github.com/sainnhe/everforest> (`palette.md`) | MIT | `bg0/bg1/bg2` per hard/medium/soft; accents shared across variants |
| Gruvbox | <https://github.com/morhetz/gruvbox> (`colors/gruvbox.vim`) | MIT/X11 | `dark0_hard/soft` per variant; bright accent tier, matching the colorscheme's dark-mode mapping |
| Kanagawa | <https://github.com/rebelot/kanagawa.nvim> (`lua/kanagawa/colors.lua`, `themes.lua`) | MIT | Wave: sumiInk3/4/5 + diagnostics accents. Dragon: dragonBlack3/2/4 + dragon syntax accents |
| Nord | <https://www.nordtheme.com/docs/colors-and-palettes> | Nord (MIT-based) | Polar Night surfaces, `nord9` frost primary, Aurora status colors |
| Rosé Pine | <https://github.com/rose-pine/neovim> (`lua/rose-pine/palette.lua`) | MIT | `base/surface/overlay`, `text`; `iris` primary, `foam` success (the dimmer `pine` fails visibility on the dark base) |
| Tokyo Night | <https://github.com/folke/tokyonight.nvim> (`lua/tokyonight/colors/{night,storm,moon}.lua`) | Apache-2.0 | `bg` + `bg_highlight` surfaces (no third level defined, derived); `night` inherits storm accents upstream |

## Token derivation

`deriveColorData()` maps each `ForkPalette` to the complete Folds contract:

- **Background / Surface / SurfaceVariant** use `bg0`/`bg1`/`bg2` directly (`bg2` is derived as
  `lighten(bg1, 5%)` when a palette defines no third level). Hover/active/line states are
  `lighten(+5%/+10%/+15%)` toward white, mirroring the built-in dark theme's stepped surfaces.
- **Accent groups** (Primary/Success/Warning/Critical) use `accent`/`green`/`orange ?? yellow`/
  `red` as `Main`. Interactions shift CIE L* by -5/-10/-15 (accents with L* >= 50 darken like the
  built-ins; darker accents lighten instead). `Container` is the accent mixed 72% into `bg0`,
  with hover/active/line at 66/60/54%.
- **OnMain** is chosen by measured contrast: hue-conserved dark tones (L*-48/-56), then a
  near-neutral dark mix, guaranteeing >= 4.5:1 (light branch for future very dark accents).
- **OnContainer** takes the lightest of the accent tinted with white (55/70/85%) that reaches
  4.5:1 on its container.
- **Secondary** is a neutral ramp derived from the palette's own `fg`/`bg0` (Main = fg, OnMain =
  bg0, containers mix 16-28%).
- **Other**: FocusRing/Shadow/Overlay match the built-in dark theme.

## Measured contrast (WCAG 2.1, worst case across all 20 themes)

| Pair | Minimum | Where |
| --- | --- | --- |
| fg on Background (normal text, AA needs 4.5) | 6.65:1 | everforest-dark-soft |
| fg on Surface/SurfaceVariant | 5.75:1 / 4.68:1 | everforest-dark-soft / catppuccin-frappe |
| fg on hovered / pressed surfaces | 4.13:1 / 3.63:1 | catppuccin-frappe SurfaceVariant |
| OnMain on Main (buttons, badges) | 4.69:1 | nord Critical |
| OnMain on hovered/pressed Main | 3.93:1 / 3.27:1 | nord Critical |
| Accent Main vs background (non-text, 3:1) | 3.05:1 | nord Critical |
| OnContainer on Container (+ hover) | 4.69:1 / 4.28:1 | everforest-dark-soft Secondary |

These minimums are enforced by `tests/unit/themePalettes.test.ts`. Known accepted deviation: the
pressed-state accent pairs sit between 3:1 and 4.5:1 for a few palettes (worse: nord Critical at
3.27:1). This matches the built-in dark theme's own pressed-state contrast (~3.8:1); fixing it
would require departing from the upstream palettes.

`--tc-link` and the `--mx-uc-*` user colors keep the shared dark values (75-80% lightness), which
read on every fork background (all base backgrounds are at or below L* 25). Per-theme overrides
can be added later via a theme-specific CSS block if a future palette needs them.

Prism code blocks use the shared `prism-dark` palette for all new themes; per-theme syntax
palettes are explicitly out of scope.

## Adding another dark theme

1. Add the verified palette to the family file in `palettes/` with source and role comments.
2. Add the `{ id, name, palette }` entry to `forkThemeRegistry` (append; never reorder or reuse
   IDs — stored user settings reference them).
3. Extend the expected ID/name lists in `tests/unit/themeRegistry.test.ts` and check
   `tests/unit/themePalettes.test.ts` passes (contrast + completeness are automatic).
4. Run `npm run test:unit` and `npm run build`; verify the theme in the Appearance settings.

Keep `ForkPalette` imports/exports type-only (`import type`, `export type`). The dev server
serves modules as raw ESM, so a type re-exported as a value compiles but crashes the browser at
boot with "does not provide an export named 'ForkPalette'" — production builds and Vitest do not
catch it.

## Tests

- `tests/unit/themeRegistry.test.ts` — registry shape, IDs, names, classes, selection resolver.
- `tests/unit/themePalettes.test.ts` — token completeness, validity, contrast minimums, variant
  distinctness.
- `tests/unit/ThemeManager.test.tsx` — body class application/cleanup, system-mode selection,
  persistence, unrelated-setting isolation.

Both hook-side test files stub `@vanilla-extract/css` and `localStorage` because the app's
`.css.ts` modules and settings store are not Node-safe; the palette/registry tests run without
stubs.
