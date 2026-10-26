import React, { CSSProperties } from 'react';
import classNames from 'classnames';
import * as css from './Slider.css';

type SliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  'aria-label': string;
  disabled?: boolean;
  className?: string;
};
export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: SliderProps) {
  const fill = ((value - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      className={classNames(css.Slider, className)}
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(evt) => onChange(Number(evt.currentTarget.value))}
      style={{ '--fill': `${fill}%` } as CSSProperties}
    />
  );
}
