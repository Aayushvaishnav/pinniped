/*
Copyright 2026 Cinny fork contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type LocalAudioTrack } from "livekit-client";
import { type Logger } from "matrix-js-sdk/lib/logger";
import { combineLatest } from "rxjs";

import type { VoiceClarityProcessor } from "denoise-voice-clarity";
import { getUrlParams } from "../UrlParams.ts";
import { voiceClarity as voiceClaritySetting } from "../settings/settings";
import { type Behavior } from "../state/Behavior";
import { type ObservableScope } from "../state/ObservableScope";

/**
 * Client-side speech enhancement (DeepFilterNet 3, `denoise-voice-clarity`).
 *
 * The model runs in an AudioWorklet on the microphone track before it is
 * published, replacing the browser's built-in noise suppression and AGC (which
 * both sound considerably worse and gate noise on/off). Echo cancellation
 * stays with the browser: it needs the far-end reference signal.
 */

/** Cheap synchronous capability estimate; downloads nothing. */
export function voiceClaritySupported(): boolean {
  return (
    typeof AudioWorkletNode !== "undefined" &&
    typeof WebAssembly === "object" &&
    typeof WebAssembly.compileStreaming === "function"
  );
}

/** Capture constraints used while the denoiser owns the microphone track. */
export const voiceClarityCapture = {
  autoGainControl: false,
  noiseSuppression: false,
} as const;

let module: Promise<{ VoiceClarityProcessor: typeof VoiceClarityProcessor }> | undefined;
async function load(): Promise<{ VoiceClarityProcessor: typeof VoiceClarityProcessor }> {
  module ??= import("denoise-voice-clarity");
  return module;
}

/** Tracks we already flipped, so repeat emissions stay no-ops. */
const applied = new WeakMap<LocalAudioTrack, boolean>();

function trackHasNativeProcessing(track: LocalAudioTrack): boolean {
  const settings = track.getSourceTrackSettings();
  return settings.noiseSuppression !== false && settings.autoGainControl !== false;
}

/** Recapture with the browser's own processing restored ( deviceId kept ). */
async function restartWithNativeProcessing(
  track: LocalAudioTrack,
): Promise<void> {
  const settings = track.getSourceTrackSettings();
  await track.restartTrack({
    deviceId: settings.deviceId,
    echoCancellation: settings.echoCancellation ?? true,
    noiseSuppression: getUrlParams().noiseSuppression,
    autoGainControl: true,
  });
}

async function restartWithoutNativeProcessing(
  track: LocalAudioTrack,
): Promise<void> {
  const settings = track.getSourceTrackSettings();
  await track.restartTrack({
    deviceId: settings.deviceId,
    echoCancellation: settings.echoCancellation ?? true,
    ...voiceClarityCapture,
  });
}

/**
 * Attach or detach the denoiser on a published microphone track.
 *
 * LiveKit restarts the processor itself on device switches, so this only
 * handles explicit (de)activation and the capture constraints flip that
 * belongs to it: browser processing must be off while the model runs to
 * avoid double processing, and back on when the model is detached.
 */
async function applyVoiceClarity(
  track: LocalAudioTrack,
  enabled: boolean,
): Promise<void> {
  if (!voiceClaritySupported()) return;

  if (enabled) {
    // The raw track must not carry browser noise suppression/AGC into the model.
    if (trackHasNativeProcessing(track)) {
      await restartWithoutNativeProcessing(track);
    }
    try {
      const { VoiceClarityProcessor } = await load();
      await track.setProcessor(new VoiceClarityProcessor());
    } catch (e) {
      // Fall back to the browser's own processing rather than a raw mic.
      await restartWithNativeProcessing(track).catch(() => {});
      throw e;
    }
  } else {
    await track.stopProcessor();
    if (!trackHasNativeProcessing(track)) {
      await restartWithNativeProcessing(track);
    }
  }
}

/**
 * Keeps the microphone track of a room in sync with the setting.
 * Mirrors trackProcessorSync (background blur) for audio.
 */
export function voiceClaritySync(
  scope: ObservableScope,
  audioTrack$: Behavior<LocalAudioTrack | null>,
  logger: Logger,
): void {
  let previous: LocalAudioTrack | null = null;
  combineLatest([audioTrack$, voiceClaritySetting.value$])
    .pipe(scope.bind())
    .subscribe(([track, enabled]) => {
      // A replaced track is stopped by LiveKit without destroying a processor
      // still attached to it; the engine's AudioContext must be closed.
      if (previous !== null && previous !== track && applied.get(previous)) {
        void previous.stopProcessor().catch(() => {});
      }
      previous = track;
      if (track === null) return;
      if (applied.get(track) === enabled) return;
      applied.set(track, enabled);
      applyVoiceClarity(track, enabled).catch((e) =>
        logger.error("Failed to apply voice clarity", e),
      );
    });
}
