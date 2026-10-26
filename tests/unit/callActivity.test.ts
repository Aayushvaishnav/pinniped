import { describe, expect, it } from 'vitest';
import { emptyCallActivity, parseCallActivity } from '../../src/app/plugins/call/activity';

describe('parseCallActivity', () => {
  it('reads the widget payload into sets of user ids', () => {
    const activity = parseCallActivity({
      speaking: ['@a:hs'],
      muted: ['@a:hs', '@b:hs'],
      screenSharing: ['@b:hs'],
    });
    expect([...activity.speakers]).toEqual(['@a:hs']);
    expect([...activity.muted].sort()).toEqual(['@a:hs', '@b:hs']);
    expect([...activity.screenSharers]).toEqual(['@b:hs']);
  });

  it('treats a missing or malformed payload as nobody', () => {
    [undefined, null, 'x', 5, { speaking: 'nope', muted: [1, null, '@c:hs'] }].forEach((bad) => {
      const activity = parseCallActivity(bad);
      expect(activity.speakers.size).toBe(0);
      expect(activity.screenSharers.size).toBe(0);
    });
    expect([...parseCallActivity({ muted: [1, null, '@c:hs'] }).muted]).toEqual(['@c:hs']);
  });

  it('starts empty', () => {
    expect(emptyCallActivity.speakers.size + emptyCallActivity.muted.size).toBe(0);
  });
});
