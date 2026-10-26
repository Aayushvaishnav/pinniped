/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type AudioProcessorOptions,
  type Track,
  type TrackProcessor,
} from "livekit-client";

import {
  AdaptiveVoiceGate,
  VoiceGate,
  measureLevel,
  voiceGateLevels,
} from "./voiceActivity";

type AudioProcessor = TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>;

const POLL_MS = 20;
/** Audio is delayed by this much so the gate is open before the first syllable arrives. */
const LOOKAHEAD_S = 0.02;
const HOLD_MS = 300;
/** Gain smoothing time constants: open fast, close gently, so neither clicks. */
const OPEN_TC_S = 0.004;
const CLOSE_TC_S = 0.05;

/**
 * Sends the microphone only while it is picking up speech. It wraps the
 * denoiser (if there is one) and sits after it: the denoiser keeps processing
 * everything, so its noise model keeps adapting while the gate is closed, and
 * the gate listens to the cleaned signal, so room noise does not open it.
 */
export class VoiceGateProcessor implements AudioProcessor {
  public readonly name = "voice-gate";
  public processedTrack?: MediaStreamTrack;

  private teardown?: () => void;

  /**
   * @param inner - the denoiser to run before the gate, if any
   * @param settings - the current gate settings, read as the gate runs:
   *   `auto` follows the noise floor, otherwise `threshold` (0-1) applies
   */
  public constructor(
    private readonly inner: AudioProcessor | undefined,
    private readonly settings: () => { auto: boolean; threshold: number },
  ) {}

  public async init(opts: AudioProcessorOptions): Promise<void> {
    await this.inner?.init(opts);
    this.build(this.inner?.processedTrack ?? opts.track, opts.audioContext);
  }

  public async restart(opts: AudioProcessorOptions): Promise<void> {
    this.teardown?.();
    await this.inner?.restart(opts);
    this.build(this.inner?.processedTrack ?? opts.track, opts.audioContext);
  }

  public async destroy(): Promise<void> {
    this.teardown?.();
    this.teardown = undefined;
    this.processedTrack = undefined;
    await this.inner?.destroy();
  }

  private build(source: MediaStreamTrack, ctx: AudioContext): void {
    ctx.resume().catch(() => {});
    const input = ctx.createMediaStreamSource(new MediaStream([source]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const delay = ctx.createDelay(LOOKAHEAD_S * 2);
    delay.delayTime.value = LOOKAHEAD_S;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const output = ctx.createMediaStreamDestination();
    input.connect(analyser);
    input.connect(delay);
    delay.connect(gain);
    gain.connect(output);
    this.processedTrack = output.stream.getAudioTracks()[0];

    const samples = new Float32Array(analyser.fftSize);
    const fixed = new VoiceGate(undefined, undefined, HOLD_MS);
    const adaptive = new AdaptiveVoiceGate(HOLD_MS);
    let open = false;
    const id = setInterval(() => {
      const { auto, threshold } = this.settings();
      const levels = voiceGateLevels(threshold);
      fixed.setLevels(levels.open, levels.close);
      const next = (auto ? adaptive : fixed).update(
        measureLevel(analyser, samples),
        Date.now(),
      );
      if (next === open) return;
      open = next;
      gain.gain.setTargetAtTime(
        open ? 1 : 0,
        ctx.currentTime,
        open ? OPEN_TC_S : CLOSE_TC_S,
      );
    }, POLL_MS);

    this.teardown = (): void => {
      clearInterval(id);
      input.disconnect();
      analyser.disconnect();
      delay.disconnect();
      gain.disconnect();
      this.processedTrack?.stop();
    };
  }
}
