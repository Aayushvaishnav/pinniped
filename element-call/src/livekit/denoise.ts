/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type LocalAudioTrack } from "livekit-client";
import { type Logger } from "matrix-js-sdk/lib/logger";
import { combineLatest } from "rxjs";

import type { DeepFilterNoiseFilterProcessor } from "deepfilternet3-noise-filter";
import { denoiseMode as denoiseModeSetting } from "../settings/settings";
import { type Behavior } from "../state/Behavior";
import { type ObservableScope } from "../state/ObservableScope";

/**
 * Client-side noise suppression for the microphone track: DeepFilterNet 3
 * (`deepfilternet3-noise-filter`) running in an AudioWorklet on the published
 * track. Pure denoising — no EQ, AGC or compression is bolted on, and the
 * model weights are self-hosted under `public/df3/`.
 *
 * The browser's own noise suppression and AGC are disabled in every mode
 * (see ConnectionFactory): the mic is captured raw, and echo cancellation
 * stays with the browser because it needs the far-end reference signal.
 */

export type DenoiseMode = "off" | "deepfilternet";

/** Cheap synchronous capability estimate; downloads nothing. */
export function denoiseSupported(): boolean {
  return (
    typeof AudioWorkletNode !== "undefined" &&
    typeof WebAssembly === "object" &&
    typeof WebAssembly.compileStreaming === "function"
  );
}

/**
 * DeepFilterNet's maximum attenuation in dB. Upstream default; higher values
 * remove more noise but sound more gated.
 */
const DenoiseAttenuationLimitDb = 40;

let module:
  | Promise<{
      DeepFilterNoiseFilterProcessor: typeof DeepFilterNoiseFilterProcessor;
    }>
  | undefined;
async function load(): Promise<{
  DeepFilterNoiseFilterProcessor: typeof DeepFilterNoiseFilterProcessor;
}> {
  module ??= import("deepfilternet3-noise-filter");
  return module;
}

/** Tracks we already flipped, so repeat emissions stay no-ops. */
const applied = new WeakMap<LocalAudioTrack, DenoiseMode>();

async function applyDenoise(
  track: LocalAudioTrack,
  mode: DenoiseMode,
): Promise<void> {
  if (mode === "deepfilternet" && denoiseSupported()) {
    const { DeepFilterNoiseFilterProcessor } = await load();
    await track.setProcessor(
      new DeepFilterNoiseFilterProcessor({
        enabled: true,
        noiseReductionLevel: DenoiseAttenuationLimitDb,
        assetConfig: { cdnUrl: "df3" },
      }),
    );
  } else {
    await track.stopProcessor();
  }
}

/**
 * Keeps the microphone track of a room in sync with the denoise mode.
 * Mirrors trackProcessorSync (background blur) for audio.
 */
export function denoiseSync(
  scope: ObservableScope,
  audioTrack$: Behavior<LocalAudioTrack | null>,
  logger: Logger,
): void {
  let previous: LocalAudioTrack | null = null;
  combineLatest([audioTrack$, denoiseModeSetting.value$])
    .pipe(scope.bind())
    .subscribe(([track, mode]) => {
      // A replaced track is stopped by LiveKit without destroying a processor
      // still attached to it; the processor's AudioContext must be closed.
      if (
        previous !== null &&
        previous !== track &&
        applied.get(previous) === "deepfilternet"
      ) {
        void previous.stopProcessor().catch(() => {});
      }
      previous = track;
      if (track === null) return;
      if ((applied.get(track) ?? "off") === mode) return;
      applied.set(track, mode);
      applyDenoise(track, mode).catch((e) =>
        logger.error("Failed to apply denoise mode", e),
      );
    });
}
