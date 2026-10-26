/*
Copyright 2026 Pinniped contributors

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type Participant,
  type Track,
  ParticipantEvent,
  TrackEvent,
} from "livekit-client";
import { Observable } from "rxjs";

import { voiceGate } from "../settings/settings";

/** An audio track a participant is sending, as something that can be measured. */
export interface BroadcastTrack {
  track: MediaStreamTrack;
  /**
   * The track is your own microphone behind the voice gate: it carries nothing
   * but what the gate lets through, so any sound on it is being broadcast.
   */
  gated: boolean;
}

const sameTracks = (a: BroadcastTrack[], b: BroadcastTrack[]): boolean =>
  a.length === b.length &&
  a.every((t, i) => t.track === b[i].track && t.gated === b[i].gated);

const TRACK_EVENTS = [
  ParticipantEvent.TrackPublished,
  ParticipantEvent.TrackUnpublished,
  ParticipantEvent.TrackSubscribed,
  ParticipantEvent.TrackUnsubscribed,
  ParticipantEvent.LocalTrackPublished,
  ParticipantEvent.LocalTrackUnpublished,
] as const;

/**
 * Every audio track a participant is currently sending: the microphone, but also
 * soundboard sounds and shared-screen audio, so the speaking indicator shows
 * whenever anything is broadcast. Re-emits when tracks come and go, when a
 * local microphone gets or loses a processor (the track to measure changes with
 * it), and when the voice gate is switched.
 */
export function observeBroadcastTracks$(
  participant: Participant,
): Observable<BroadcastTrack[]> {
  return new Observable<BroadcastTrack[]>((subscriber) => {
    const watched = new Map<Track, () => void>();
    let last: BroadcastTrack[] | undefined;

    const update = (): void => {
      const gating = participant.isLocal && voiceGate.getValue();
      const current: BroadcastTrack[] = [];
      const live = new Set<Track>();
      participant.audioTrackPublications.forEach((publication) => {
        const { track } = publication;
        if (!track?.mediaStreamTrack) return;
        live.add(track);
        current.push({
          track: track.mediaStreamTrack,
          gated: gating && publication.source === "microphone",
        });
        // A processor swaps the track that carries the audio.
        if (participant.isLocal && !watched.has(track)) {
          track.on(TrackEvent.TrackProcessorUpdate, update);
          watched.set(track, () =>
            track.off(TrackEvent.TrackProcessorUpdate, update),
          );
        }
      });
      watched.forEach((stop, track) => {
        if (live.has(track)) return;
        stop();
        watched.delete(track);
      });
      if (last === undefined || !sameTracks(last, current)) {
        last = current;
        subscriber.next(current);
      }
    };

    TRACK_EVENTS.forEach((event) => participant.on(event, update));
    const gateSubscription = voiceGate.value$.subscribe(update);
    update();
    return (): void => {
      TRACK_EVENTS.forEach((event) => participant.off(event, update));
      gateSubscription.unsubscribe();
      watched.forEach((stop) => stop());
      watched.clear();
    };
  });
}
