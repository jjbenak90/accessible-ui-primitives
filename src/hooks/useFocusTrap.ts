import { useEffect, useRef, type RefObject } from 'react';

// Defines the W3C recommendation for elements that naturally or explicitly participate
// in sequential keyboard navigation (tab order)
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  'summary:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"]):not([tabindex="-1"])',
].join(', ');

/**
 * Validates element is actually rendered and not hidden via CSS.
 * Avoids offsetParent checks which evaluate to null inside position: fixed wrappers.
 */
function isFocusableVisible(element: HTMLElement): boolean {
  return (
    element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden'
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
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasFocusedRef.current = false;
      return;
    }
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Collect visible, non-disabled interactive targets
    const getFocusables = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        isFocusableVisible
      );
    };

    // Defer initial focus via requestAnimationFrame to:
    // 1. Ensure portaled DOM nodes, transitions, and layout geometry are painted.
    // 2. Allow nested child modals mounting in the same tick to mount, paint,
    //    and claim focus first (preventing parent traps from stealing focus).
    // 3. Give manual autofocus or consumer focusin handlers a tick to cancel
    //    this frame before the fallback sequence runs.
    let frameId: number | null = null;
    if (!hasFocusedRef.current) {
      frameId = window.requestAnimationFrame(() => {
        if (!containerRef.current || hasFocusedRef.current) return;
        hasFocusedRef.current = true;
        // Don't steal focus if focus is already inside this container
        // OR if a child portal/dialog inside us already took focus!
        if (
          document.activeElement &&
          document.activeElement !== document.body &&
          document.activeElement !== document.documentElement &&
          (containerRef.current.contains(document.activeElement) ||
            document
              .querySelector('[role="dialog"]:last-of-type')
              ?.contains(document.activeElement))
        ) {
          return;
        }

        const focusables = getFocusables();
        if (initialFocusRef?.current && isFocusableVisible(initialFocusRef.current)) {
          initialFocusRef.current.focus();
        } else if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          container.focus();
        }
      });
    }

    const handleFocusIn = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      hasFocusedRef.current = true;
    };

    container.addEventListener('focusin', handleFocusIn);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const currentFocusables = getFocusables();

      // If the modal has no interactive elements, prevent tabbing anywhere
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
        if (
          activeElement === firstElement ||
          activeElement === container ||
          !container.contains(activeElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Wrap from last element to first
        if (
          activeElement === lastElement ||
          activeElement === container ||
          !container.contains(activeElement)
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  return containerRef;
}
