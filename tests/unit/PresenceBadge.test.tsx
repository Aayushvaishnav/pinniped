import React from 'react';
import { create } from 'react-test-renderer';
import { Badge } from 'folds';
import chroma from 'chroma-js';
import { describe, expect, it, vi } from 'vitest';
import { PresenceBadge } from '../../src/app/components/presence/Presence';
import { Presence } from '../../src/app/hooks/useUserPresence';

vi.mock('../../src/app/components/presence/styles.css', () => ({}));
vi.mock('folds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('folds')>()),
  TooltipProvider: ({ children }: { children: (ref: undefined) => React.ReactNode }) =>
    children(undefined),
}));

describe('presence badge colors', () => {
  it('uses a theme-independent green for online presence', () => {
    const renderer = create(<PresenceBadge presence={Presence.Online} />);
    const badge = renderer.root.findByType(Badge);
    const background = badge.props.style?.backgroundColor;
    expect(background).toMatch(/^#[0-9a-f]{6}$/i);
    const [red, green, blue] = chroma(background).rgb();
    expect(green).toBeGreaterThan(red);
    expect(green).toBeGreaterThan(blue);
    renderer.unmount();
  });

  it.each([
    [Presence.Unavailable, 'Warning', 'Solid'],
    [Presence.Offline, 'Secondary', 'Soft'],
  ])('preserves themed styling for %s', (presence, variant, fill) => {
    const renderer = create(<PresenceBadge presence={presence as Presence} />);
    const badge = renderer.root.findByType(Badge);
    expect(badge.props.style?.backgroundColor).toBeUndefined();
    expect(badge.props.variant).toBe(variant);
    expect(badge.props.fill).toBe(fill);
    renderer.unmount();
  });
});
