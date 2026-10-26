/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { expect, test } from "vitest";

import { defaultVoiceTuning, normalizeVoiceTuning } from "./voiceTuning";

test("missing, malformed and non-object input falls back to the defaults", () => {
  expect(normalizeVoiceTuning(undefined)).toEqual(defaultVoiceTuning);
  expect(normalizeVoiceTuning("nope")).toEqual(defaultVoiceTuning);
  expect(normalizeVoiceTuning({ holdMs: "long", fadeInMs: NaN })).toEqual(
    defaultVoiceTuning,
  );
});

test("keeps valid values, fills the rest and clamps to the range", () => {
  const t = normalizeVoiceTuning({
    holdMs: 500,
    hysteresisDb: 99,
    lookaheadMs: -3,
  });
  expect(t.holdMs).toBe(500);
  expect(t.hysteresisDb).toBe(12);
  expect(t.lookaheadMs).toBe(0);
  expect(t.fadeOutMs).toBe(defaultVoiceTuning.fadeOutMs);
});
