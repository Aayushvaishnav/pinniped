import React, { CSSProperties, KeyboardEvent, PointerEvent, useRef } from 'react';
import { color, config } from 'folds';

type VoiceGateMeterProps = {
  /** The live microphone level on the gate scale, 0-1. */
  level: number;
  /** Fixed threshold, 0-1. Without it (automatic) the meter only shows the level. */
  threshold?: number;
  onThreshold?: (threshold: number) => void;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * A level meter for the voice gate. With a threshold it can be dragged: the meter is orange
 * while the level is under it (nothing is sent) and green once it is over.
 */
export function VoiceGateMeter({ level, threshold, onThreshold }: VoiceGateMeterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sending = threshold === undefined || level >= threshold;

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
