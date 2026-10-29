import { useCallback, DragEventHandler, RefObject, useState, useEffect, useRef } from 'react';
import { getDataTransferFiles } from '../utils/dom';

export const useFileDropHandler = (onDrop: (file: File[]) => void): DragEventHandler =>
  useCallback(
    (evt) => {
      const files = getDataTransferFiles(evt.dataTransfer);
      if (files) onDrop(files);
    },
    [onDrop]
  );

export const useFileDropZone = (
  zoneRef: RefObject<HTMLElement | null>,
  onDrop: (file: File[]) => void
): boolean => {
  const dragStateRef = useRef<'start' | 'leave' | 'over'>(undefined);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const target = zoneRef.current;
    const handleDrop = (evt: DragEvent) => {
      evt.preventDefault();
      dragStateRef.current = undefined;
      setActive(false);
      if (!evt.dataTransfer) return;
      const files = getDataTransferFiles(evt.dataTransfer);
      if (files) onDrop(files);
    };

    target?.addEventListener('drop', handleDrop);
    return () => {
      target?.removeEventListener('drop', handleDrop);
    };
  }, [zoneRef, onDrop]);

  useEffect(() => {
    const target = zoneRef.current;
    const handleDragEnter = (evt: DragEvent) => {
      // Only react to external file drags. In-page element drags (e.g. dragging
      // a chat image) also report 'Files' when the src is a blob URL, but they
      // additionally carry 'text/html'; OS file drags never do.
      const types = evt.dataTransfer?.types;
      if (types?.includes('Files') && !types.includes('text/html')) {
        dragStateRef.current = 'start';
        setActive(true);
      }
    };
    const handleDragLeave = () => {
      if (dragStateRef.current !== 'over') return;
      dragStateRef.current = 'leave';
      setActive(false);
    };
    const handleDragOver = (evt: DragEvent) => {
      evt.preventDefault();
      dragStateRef.current = 'over';
    };

    target?.addEventListener('dragenter', handleDragEnter);
    target?.addEventListener('dragleave', handleDragLeave);
    target?.addEventListener('dragover', handleDragOver);
    return () => {
      target?.removeEventListener('dragenter', handleDragEnter);
      target?.removeEventListener('dragleave', handleDragLeave);
      target?.removeEventListener('dragover', handleDragOver);
    };
  }, [zoneRef]);

  return active;
};
