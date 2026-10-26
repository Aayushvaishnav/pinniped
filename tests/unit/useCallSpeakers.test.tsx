import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeAll, expect, it, vi } from 'vitest';
import type { CallEmbed } from '../../src/app/plugins/call';
import type { CallActivity } from '../../src/app/plugins/call/activity';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
vi.mock('../../src/app/hooks/useCallEmbed', () => ({
  useCallJoined: (embed?: CallEmbed) => !!embed,
}));

let useCallParticipantActivity: typeof import('../../src/app/hooks/useCallSpeakers').useCallParticipantActivity;
beforeAll(async () => {
  ({ useCallParticipantActivity } = await import('../../src/app/hooks/useCallSpeakers'));
});

const activity = (
  speaking: string[],
  muted: string[] = [],
  sharing: string[] = []
): CallActivity => ({
  speakers: new Set(speaking),
  muted: new Set(muted),
  screenSharers: new Set(sharing),
});

/** A call embed whose widget reports activity through `report`. */
const fakeEmbed = () => {
  const listeners = new Set<() => void>();
  const embed = {
    activity: activity([]),
    onActivity: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    embed: embed as unknown as CallEmbed,
    listeners,
    report: (next: CallActivity) => {
      embed.activity = next;
      listeners.forEach((listener) => listener());
    },
  };
};

it('shows what the widget reports, updating as people start and stop speaking, mute and share', () => {
  const { embed, report } = fakeEmbed();
  let result!: ReturnType<typeof useCallParticipantActivity>;
  function Harness({ call }: { call?: CallEmbed }) {
    result = useCallParticipantActivity(call);
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<Harness call={embed} />);
  });
  expect(result.speakers.size).toBe(0);

  act(() => report(activity(['@alice:example.org', '@bob:example.org'])));
  expect([...result.speakers]).toEqual(['@alice:example.org', '@bob:example.org']);

  act(() => report(activity(['@alice:example.org'], ['@bob:example.org'])));
  expect([...result.speakers]).toEqual(['@alice:example.org']);
  expect([...result.muted]).toEqual(['@bob:example.org']);

  act(() => report(activity([], [], ['@bob:example.org', '@carol:example.org'])));
  expect([...result.screenSharers]).toEqual(['@bob:example.org', '@carol:example.org']);
  expect(result.speakers.size).toBe(0);

  act(() => renderer.unmount());
});

it('shows nothing without a call, and stops listening when the call goes away', () => {
  const { embed, listeners, report } = fakeEmbed();
  let result!: ReturnType<typeof useCallParticipantActivity>;
  function Harness({ call }: { call?: CallEmbed }) {
    result = useCallParticipantActivity(call);
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<Harness call={embed} />);
  });
  act(() => report(activity(['@alice:example.org'])));
  expect(result.speakers.size).toBe(1);
  expect(listeners.size).toBe(1);

  act(() => renderer.update(<Harness />));
  expect(result.speakers.size).toBe(0);
  expect(listeners.size).toBe(0);
  act(() => renderer.unmount());
});
