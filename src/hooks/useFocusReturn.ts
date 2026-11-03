import { useEffect, useRef } from 'react';

/**
 * Caches the active element when an interactive layer opens and restores focus
 * when the layer closes or unmounts.
 *
 * @param isOpen - Whether the containing interactive primitive is active.
 */
export function useFocusReturn(isOpen: boolean): void {
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    } else if (previouslyFocusedElementRef.current) {
      // Validate element is still connected to the DOM before restoring focus
      if (previouslyFocusedElementRef.current.isConnected) {
        previouslyFocusedElementRef.current.focus();
      }
      previouslyFocusedElementRef.current = null;
    }
  }, [isOpen]);

  // Fallback cleanup if parent unmounts without isOpen transitioning to false
  useEffect(() => {
    return () => {
      if (previouslyFocusedElementRef.current?.isConnected) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, []);
}