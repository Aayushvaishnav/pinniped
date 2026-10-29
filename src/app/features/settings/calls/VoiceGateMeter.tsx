import React, {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { color, config } from 'folds';
import { GATE_DB_SPAN } from '../../../hooks/useMicLevel';

type VoiceGateMeterProps = {
  /** The live microphone level on the gate scale, 0-1. */
  level: number;
  /** Fixed threshold, 0-1. Without it (automatic) the meter only shows the level. */
  threshold?: number;
  onThreshold?: (threshold: number) => void;
  /** How far below the threshold the gate may fall before closing, in dB, as set in the tuning. */
  hysteresisDb: number;
  /** How long the gate stays open after the last loud moment, ms. */
  holdMs: number;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * A level meter for the voice gate. With a threshold it can be dragged: the meter is orange
 * while the level is under it (nothing is sent) and green once it is over.
 */
export function VoiceGateMeter({
  level,
  threshold,
  onThreshold,
  hysteresisDb,
  holdMs,
}: VoiceGateMeterProps) {
  const hysteresis = hysteresisDb / GATE_DB_SPAN;
  const trackRef = useRef<HTMLDivElement>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const lastLoudAt = useRef(0);
  useEffect(() => {
    if (threshold === undefined) return;
    // The same hysteresis as the call: once open, only a level below the close edge lets go.
    const edge = gateOpen ? threshold - hysteresis : threshold;
    const now = Date.now();
    if (level >= edge) lastLoudAt.current = now;
    setGateOpen(now - lastLoudAt.current <= holdMs);
  }, [level, threshold, gateOpen, hysteresis, holdMs]);
  const sending = threshold === undefined || gateOpen;

  const move = (evt: PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !onThreshold) return;
    onThreshold(clamp((evt.clientX - rect.left) / rect.width));
  };

  const keys = (evt: KeyboardEvent<HTMLDivElement>) => {
    if (threshold === undefined || !onThreshold) return;
    const step = evt.shiftKey ? 0.1 : 0.02;
    if (evt.key === 'ArrowRight' || evt.key === 'ArrowUp') onThreshold(clamp(threshold + step));
    else if (evt.key === 'ArrowLeft' || evt.key === 'ArrowDown')
      onThreshold(clamp(threshold - step));
    else return;
    evt.preventDefault();
  };

  const fill = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: `${level * 100}%`,
        borderRadius: config.radii.Pill,
        background: sending ? color.Success.Main : color.Warning.Main,
        transition: 'width 40ms linear',
      }}
    />
  );
  const trackStyle: CSSProperties = {
    position: 'relative',
    height: 12,
    width: '100%',
    borderRadius: config.radii.Pill,
    background: color.SurfaceVariant.ContainerLine,
    touchAction: 'none',
    overflow: 'visible',
  };

  if (threshold === undefined || !onThreshold) {
    return (
      <div
        role="meter"
        aria-label="Microphone level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
        style={trackStyle}
      >
        {fill}
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Input sensitivity"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(threshold * 100)}
      tabIndex={0}
      onKeyDown={keys}
      onPointerDown={(evt) => {
        evt.currentTarget.setPointerCapture(evt.pointerId);
        move(evt);
      }}
      onPointerMove={(evt) => evt.buttons === 1 && move(evt)}
      style={{ ...trackStyle, cursor: 'pointer' }}
    >
      {fill}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${clamp(threshold - hysteresis) * 100}%`,
          width: `${(threshold - clamp(threshold - hysteresis)) * 100}%`,
          background: color.Surface.OnContainer,
          opacity: 0.18,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: `calc(${threshold * 100}% - 8px)`,
          width: 16,
          height: 20,
          borderRadius: config.radii.R300,
          background: color.Surface.OnContainer,
          boxShadow: `0 0 0 2px ${color.SurfaceVariant.Container}`,
        }}
      />
    </div>
  );
}
