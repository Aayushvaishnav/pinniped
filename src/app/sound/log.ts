type SoundEvent = 'play' | 'stop' | 'skip';

/** One console line per sound event, so what played (or why nothing did) can be traced. */
export const logSound = (event: SoundEvent, sound: string, detail?: string) => {
  // eslint-disable-next-line no-console
  console.info(`[sound] ${event} ${sound}${detail ? ` (${detail})` : ''}`);
};
