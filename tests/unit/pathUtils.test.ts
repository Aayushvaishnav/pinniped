import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  getDirectRoomPath,
  getHomeRoomPath,
  getRoomsRoomPath,
  getSpaceRoomPath,
} from '../../src/app/pages/pathUtils';
import { HOME_ROOM_PATH } from '../../src/app/pages/paths';

const roomId = '!xjwvalofZaiaIXRVHc:stablecat.club';

describe('room paths', () => {
  it('percent-encodes the room ID exactly once', () => {
    expect(getHomeRoomPath(roomId)).toBe('/home/!xjwvalofZaiaIXRVHc%3Astablecat.club');
    expect(getRoomsRoomPath(roomId)).toContain('!xjwvalofZaiaIXRVHc%3Astablecat.club');
    expect(getDirectRoomPath(roomId)).toContain('!xjwvalofZaiaIXRVHc%3Astablecat.club');
    expect(getSpaceRoomPath(roomId, roomId)).not.toContain('%25');
  });

  it('round-trips the room ID and event ID through the router', () => {
    const eventId = '$abc/def+ghi:stablecat.club';
    const path = getHomeRoomPath(roomId, eventId);
    const matches = matchRoutes([{ path: HOME_ROOM_PATH }], path);
    expect(matches?.[0].params).toEqual({ roomIdOrAlias: roomId, eventId });
  });
});
