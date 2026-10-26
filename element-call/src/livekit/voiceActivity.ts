/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { Observable, distinctUntilChanged, of, switchMap } from "rxjs";

/** Level (RMS, 0..1) above which someone starts being heard as speaking. */
export const VOICE_OPEN_LEVEL = 0.008;
/** Level below which the voice counts as quiet again; under OPEN so a steady voice does not flutter. */
export const VOICE_CLOSE_LEVEL = 0.005;
/** How long to keep showing speech after the last loud moment, bridging gaps between words. */
export const VOICE_HOLD_MS = 250;

/**
 * Decides from a stream of audio levels whether someone is speaking: opens
 * immediately on a loud sample, then stays open until the level has been below
 * the close threshold for the hold time.
 */
export class VoiceGate {
  private open = false;
  private lastLoudAt = -Infinity;

  public constructor(
    private readonly openLevel = VOICE_OPEN_LEVEL,
    private readonly closeLevel = VOICE_CLOSE_LEVEL,
    private readonly holdMs = VOICE_HOLD_MS,
  ) {}

  /** Feed one level measured at `now` (ms); returns whether speech is on. */
  public update(level: number, now: number): boolean {
    if (level >= (this.open ? this.closeLevel : this.openLevel))
      this.lastLoudAt = now;
    this.open = now - this.lastLoudAt <= this.holdMs;
    return this.open;
  }
}

const POLL_MS = 40;

// Browsers cap the number of AudioContexts, so every meter shares one.
let sharedContext: AudioContext | undefined;
const context = (): AudioContext | undefined => {
  if (typeof AudioContext === "undefined") return undefined;
  sharedContext ??= new AudioContext();
  if (sharedContext.state === "suspended")
    sharedContext.resume().catch(() => {});
  return sharedContext;
};

/** Emits whether the audio in `track` is currently loud enough to be speech. */
function observeTrackVoice$(track: MediaStreamTrack): Observable<boolean> {
  return new Observable<boolean>((subscriber) => {
    const ctx = context();
    if (ctx === undefined) {
      subscriber.next(false);
      return undefined;
    }
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser); // not to the destination: this only measures
    const samples = new Float32Array(analyser.fftSize);
    const gate = new VoiceGate();
    subscriber.next(false);
    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += s * s;
      subscriber.next(gate.update(Math.sqrt(sum / samples.length), Date.now()));
    }, POLL_MS);
    return (): void => {
      clearInterval(id);
      source.disconnect();
      analyser.disconnect();
    };
  });
}

/**
 * Measures speech from the audio itself, as it is sent or received, rather than
 * waiting for the server's speaker updates, which are coarse and delayed.
 * Emits false until a track is available.
 */
export function observeVoiceActivity$(
  track$: Observable<MediaStreamTrack | undefined>,
): Observable<boolean> {
  return track$.pipe(
    distinctUntilChanged(),
    switchMap((track) => (track ? observeTrackVoice$(track) : of(false))),
    distinctUntilChanged(),
  );
}
