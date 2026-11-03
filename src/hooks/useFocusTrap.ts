import { useEffect, useRef, type RefObject } from 'react';

// Defines the W3C recommendation for elements that naturally or explicitly participate 
// in sequential keyboard navigation (tab order)
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex^="-"])',
].join(', ');

/**
 * Validates element is actually rendered and not hidden via CSS.
 * Avoids offsetParent checks which evaluate to null inside position: fixed wrappers.
 */
function isFocusableVisible(element: HTMLElement): boolean {
  return (
    element.getClientRects().length > 0 &&
    window.getComputedStyle(element).visibility !== 'hidden'
  );
}

/**
 * Traps keyboard focus within the referenced element while active.
 *
 * @param isOpen - Active state of the trapped region.
 * @param initialFocusRef - Optional element to receive focus upon mounting.
 */
export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;

    // Collect visible, non-disabled interactive targets
    const getFocusables = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(isFocusableVisible);
    };

    // Set initial focus: designated element -> first focusable child -> container
    const focusables = getFocusables();
    if (initialFocusRef?.current && isFocusableVisible(initialFocusRef.current)) {
      initialFocusRef.current.focus();
    } else if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const currentFocusables = getFocusables();

      if (currentFocusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = currentFocusables[0];
      const lastElement = currentFocusables[currentFocusables.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        // Shift + Tab: Wrap from first element to last
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Wrap from last element to first
        if (activeElement === lastElement || !container.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Lock document scroll while trap is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, initialFocusRef]);

  return containerRef;
}