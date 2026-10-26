// Whether the user has been without input for a while. Kept outside React so
// non-hook code (receipts, notifications) can read it synchronously.
let idle = false;
const listeners = new Set<() => void>();

export const isUserIdle = (): boolean => idle;

/** Window is focused and the user isn't idle: they can actually see new messages. */
export const isUserActive = (): boolean => document.hasFocus() && !idle;

export const setUserIdle = (value: boolean) => {
  if (idle === value) return;
  idle = value;
  listeners.forEach((listener) => listener());
};

export const subscribeIdle = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
