import { useEffect, useRef, useState } from 'react';

export type Vec2 = { x: number; y: number };

export type MagnifierState = {
  visible: boolean;
  lensPos: Vec2;
  imgPos: Vec2;
  zoom: number;
  size: number;
  boxSize: Vec2;
};

// Defaults mirror Vencord's ImageZoom plugin: 2x lens, 200px radius,
// inverted scroll (scroll up zooms in), 0.5x speed.
const DEFAULT_ZOOM = 2;
const DEFAULT_SIZE = 200;
const MIN_ZOOM = 1;
const MIN_SIZE = 50;
const MAX_SIZE = 1000;
const ZOOM_SPEED = 0.5;
// Inverted scroll: scrolling up (negative deltaY) increases zoom.
const SCROLL_DIRECTION = -1;

/**
 * Vencord-style image magnifier lens.
 *
 * While the left mouse button is held down over the referenced image, a
 * circular lens follows the cursor and renders a zoomed copy of the image
 * centred on the cursor. The scroll wheel adjusts the lens zoom; holding
 * Shift and scrolling adjusts the lens size.
 *
 * Only active while `enabled` is true so it can coexist with pan (which takes
 * over when the image is persistently zoomed via the header controls).
 */
export const useMagnifier = (
  imgRef: React.RefObject<HTMLImageElement | null>,
  enabled: boolean
): MagnifierState => {
  const [visible, setVisible] = useState(false);
  const [lensPos, setLensPos] = useState<Vec2>({ x: 0, y: 0 });
  const [imgPos, setImgPos] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [boxSize, setBoxSize] = useState<Vec2>({ x: 0, y: 0 });

  // Refs mirror state so the document-level listeners never go stale.
  const zoomRef = useRef(zoom);
  const sizeRef = useRef(size);
  const shiftRef = useRef(false);
  const downRef = useRef(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      downRef.current = false;
      return () => {
        // no listeners attached while disabled
      };
    }

    const update = (clientX: number, clientY: number) => {
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const offset = sizeRef.current / 2;
      const x = -((clientX - rect.left) * zoomRef.current - offset);
      const y = -((clientY - rect.top) * zoomRef.current - offset);
      setLensPos({ x: clientX - offset, y: clientY - offset });
      setImgPos({ x, y });
      setBoxSize({ x: rect.width, y: rect.height });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftRef.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!downRef.current) return;
      // Primary button no longer held: the mouseup was lost somewhere.
      if (e.buttons % 2 === 0) {
        downRef.current = false;
        setVisible(false);
        return;
      }
      update(e.clientX, e.clientY);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) return;
      downRef.current = true;
      update(e.clientX, e.clientY);
      setVisible(true);
    };

    const onMouseUp = () => {
      downRef.current = false;
      setVisible(false);
    };

    // A mouseup can be lost (alt-tab, release over an iframe or outside the
    // window). Without this the lens stays stuck and every wheel event on
    // the page keeps getting swallowed.
    const onBlur = () => {
      onMouseUp();
      shiftRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!downRef.current) return;
      e.preventDefault();
      if (!shiftRef.current) {
        const val = zoomRef.current + (e.deltaY / 100) * SCROLL_DIRECTION * ZOOM_SPEED;
        const clamped = Math.max(MIN_ZOOM, val);
        zoomRef.current = clamped;
        setZoom(clamped);
      } else {
        const val = sizeRef.current + e.deltaY * SCROLL_DIRECTION * ZOOM_SPEED;
        const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, val));
        sizeRef.current = clamped;
        setSize(clamped);
      }
      update(e.clientX, e.clientY);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('blur', onBlur);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      downRef.current = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('wheel', onWheel);
    };
  }, [enabled, imgRef]);

  return { visible, lensPos, imgPos, zoom, size, boxSize };
};
