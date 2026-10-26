/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  AudioPresets,
  type LocalTrackPublication,
  type Room as LivekitRoom,
  Track,
} from "livekit-client";
import { type Logger } from "matrix-js-sdk/lib/logger";
import { Subject } from "rxjs";

/**
 * Soundboard commands from the embedding client (ElementWidgetActions.Soundboard).
 * `url` is a same-origin (blob:) URL of an audio file the client has already downloaded.
 */
export type SoundboardCommand =
  | { op: "play"; url: string; volume?: number }
  | { op: "stop" };

export const soundboardCommand$ = new Subject<SoundboardCommand>();

/**
 * Plays client-supplied sounds to the call: mixed into an audio track of its
 * own that every participant hears (and that the local user hears too).
 * The microphone track, and whatever processing it has, is not touched.
 *
 * The track is published on the first sound and stays up, silent in between
 * (DTX keeps that nearly free), until the room is left.
 */
export class Soundboard {
  // Created on the first sound: most calls never use the soundboard.
  private audio:
    | { ctx: AudioContext; destination: MediaStreamAudioDestinationNode }
    | undefined;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly playing = new Set<AudioBufferSourceNode>();
  private publication: Promise<LocalTrackPublication | undefined> | undefined;

  public constructor(
    private readonly room: LivekitRoom,
    private readonly logger: Logger,
  ) {}

  private get ctx(): AudioContext {
    return this.output.ctx;
  }

  private get output(): {
    ctx: AudioContext;
    destination: MediaStreamAudioDestinationNode;
  } {
    if (!this.audio) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      this.audio = { ctx, destination: ctx.createMediaStreamDestination() };
    }
    return this.audio;
  }

  private async decode(url: string): Promise<AudioBuffer> {
    let buffer = this.buffers.get(url);
    if (!buffer) {
      buffer = fetch(url)
        .then(async (r) => r.arrayBuffer())
        .then(async (data) => this.ctx.decodeAudioData(data));
      // A failed decode must not poison later attempts at the same URL.
      buffer.catch(() => this.buffers.delete(url));
      this.buffers.set(url, buffer);
    }
    return buffer;
  }

  private async publish(): Promise<LocalTrackPublication | undefined> {
    this.publication ??= this.room.localParticipant
      .publishTrack(this.output.destination.stream.getAudioTracks()[0], {
        source: Track.Source.Unknown,
        name: "soundboard",
        dtx: true,
        red: false,
        audioPreset: AudioPresets.musicHighQuality,
      })
      .catch((e) => {
        this.logger.error("Failed to publish the soundboard track", e);
        this.publication = undefined;
        return undefined;
      });
    return this.publication;
  }

  public async play(url: string, volume = 1): Promise<void> {
    await this.ctx.resume();
    const [buffer] = await Promise.all([this.decode(url), this.publish()]);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(volume, 1));
    source.connect(gain);
    // To the call, and to the local speakers so the user hears it too.
    gain.connect(this.output.destination);
    gain.connect(this.ctx.destination);
    this.playing.add(source);
    source.addEventListener("ended", () => {
      this.playing.delete(source);
      source.disconnect();
      gain.disconnect();
    });
    source.start();
  }

  public stop(): void {
    this.playing.forEach((source) => source.stop());
  }

  public async dispose(): Promise<void> {
    this.stop();
    const publication = await this.publication;
    if (publication?.track) {
      await this.room.localParticipant
        .unpublishTrack(publication.track)
        .catch(() => undefined);
    }
    await this.audio?.ctx.close().catch(() => undefined);
  }
}
