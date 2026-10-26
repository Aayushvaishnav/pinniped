import { Room } from 'matrix-js-sdk';
import { SpaceAutoJoinContent, StateEvent } from '../../types/matrix/room';
import { getStateEvent } from './room';

/**
 * Whether a space asks members' clients to auto-join its rooms. The current
 * event wins when present, so turning it off overrides a leftover legacy
 * `im.kibby` event; the legacy event is only read when there is no current one.
 */
export const getSpaceAutoJoin = (space: Room): boolean => {
  const current = getStateEvent(space, StateEvent.SpaceAutoJoin);
  const event = current ?? getStateEvent(space, StateEvent.LegacySpaceAutoJoin);
  return event?.getContent<SpaceAutoJoinContent>().auto_join === true;
};
