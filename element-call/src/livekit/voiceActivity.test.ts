/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { expect, test } from "vitest";

import { VoiceGate } from "./voiceActivity";

const gate = (): VoiceGate => new VoiceGate(0.01, 0.005, 200);

test("opens immediately on a loud sample and stays quiet below the open level", () => {
  const g = gate();
  expect(g.update(0.009, 0)).toBe(false);
  expect(g.update(0.02, 40)).toBe(true);
});

test("holds through short gaps, then closes once the hold has passed", () => {
  const g = gate();
  g.update(0.05, 0);
  expect(g.update(0, 100)).toBe(true);
  expect(g.update(0, 200)).toBe(true);
  expect(g.update(0, 240)).toBe(false);
});

test("a level between close and open keeps a speaker open but does not open the gate", () => {
  const g = gate();
  expect(g.update(0.007, 0)).toBe(false);
  g.update(0.05, 40);
  expect(g.update(0.007, 200)).toBe(true);
  expect(g.update(0.007, 380)).toBe(true); // still refreshes the hold
  expect(g.update(0.001, 700)).toBe(false);
});
