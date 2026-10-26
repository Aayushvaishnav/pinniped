import { MatrixClient, Room } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { StateEvent } from '../../../types/matrix/room';
import { getAccountData, getStateEvent } from '../../utils/room';
import { randomStr } from '../../utils/common';
import { SoundPack } from './SoundPack';
import { MAX_SOUND_BYTES, MAX_SOUND_MS, PackSound, SoundPackContent } from './types';

export const USER_PACK_ID = 'user';

export const getUserSoundPack = (mx: MatrixClient): SoundPack => {
  const content = getAccountData(
    mx,
    AccountDataEvent.PinnipedUserSounds
  )?.getContent<SoundPackContent>();
  return new SoundPack(USER_PACK_ID, content ?? {});
};

/** A room's or space's pack; one per room, so the pack id is the room id. */
export const getRoomSoundPack = (room: Room): SoundPack => {
  const content = getStateEvent(
    room,
    StateEvent.PinnipedRoomSounds
  )?.getContent<SoundPackContent>();
  return new SoundPack(room.roomId, content ?? {}, { roomId: room.roomId });
};

export const withSound = (
  content: SoundPackContent,
  id: string,
  sound: PackSound
): SoundPackContent => ({ ...content, sounds: { ...content.sounds, [id]: sound } });

export const withoutSound = (content: SoundPackContent, id: string): SoundPackContent => {
  const sounds = { ...content.sounds };
  delete sounds[id];
  return { ...content, sounds };
};

export const newSoundId = (name: string, taken: (id: string) => boolean): string => {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || randomStr(6).toLowerCase();
  let id = base;
  for (let n = 2; taken(id); n += 1) id = `${base}-${n}`;
  return id;
};

/** Checks a picked file is a short, small audio clip and returns its duration in ms. */
export const readSoundFile = (file: File): Promise<{ duration: number }> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('audio/')) {
      reject(new Error('That is not an audio file.'));
      return;
    }
    if (file.size > MAX_SOUND_BYTES) {
      reject(new Error(`Sounds can be at most ${MAX_SOUND_BYTES / 1024 / 1024} MB.`));
      return;
    }
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    const done = () => URL.revokeObjectURL(objectUrl);
    audio.onloadedmetadata = () => {
      done();
      const duration = Math.round(audio.duration * 1000);
      if (!Number.isFinite(duration)) reject(new Error('Could not read the length of that file.'));
      else if (duration > MAX_SOUND_MS) {
        reject(new Error(`Sounds can be at most ${MAX_SOUND_MS / 1000} seconds long.`));
      } else resolve({ duration });
    };
    audio.onerror = () => {
      done();
      reject(new Error('That audio file could not be read.'));
    };
    audio.src = objectUrl;
  });
