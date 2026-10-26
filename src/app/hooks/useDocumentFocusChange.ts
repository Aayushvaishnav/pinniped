import { useEffect } from 'react';
import { isUserActive, subscribeIdle } from '../state/idle';

/** Fires when the user becomes able/unable to see the app: window focus or idleness changes. */
export const useDocumentFocusChange = (onChange: (focus: boolean) => void) => {
  useEffect(() => {
    let localFocus = isUserActive();

    const handleFocus = () => {
      const focus = isUserActive();
      if (focus === localFocus) return;
      localFocus = focus;
      onChange(localFocus);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    const unsubscribe = subscribeIdle(handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
      unsubscribe();
    };
  }, [onChange]);
};
