import { useEffect, useRef } from 'react';

export interface UseScrollLockOptions {
  /**
   * Element to lock scroll on. Defaults to `document.body` if undefined.
   */
  target?: HTMLElement | null;
  /**
   * Whether to compensate for scrollbar width on the document element/body to prevent layout shift.
   * Defaults to `true`.
   */
  reserveScrollBarGap?: boolean;
}

// Module-level counter to safely handle nested or stacked modal dialogs
let activeLockCount = 0;
let originalOverflowStyle = '';
let originalPaddingRightStyle = '';

/**
 * Calculates current scrollbar width of the viewport.
 */
function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}

/**
 * Custom hook to lock body or element scrolling when active.
 * Handles nested lock instances via reference counting and prevents layout shift.
 *
 * @param isLocked - Boolean state indicating if scrolling should be locked.
 * @param options - Configuration options for target element and scrollbar gap reservation.
 */
export function useScrollLock(isLocked: boolean, options: UseScrollLockOptions = {}): void {
  const { target, reserveScrollBarGap = true } = options;
  const isLockedRef = useRef(false);

  useEffect(() => {
    const targetElement = target ?? document.body;
    if (!targetElement) return;

    if (isLocked) {
      if (!isLockedRef.current) {
        isLockedRef.current = true;
        activeLockCount++;

        if (activeLockCount === 1) {
          originalOverflowStyle = targetElement.style.overflow;
          originalPaddingRightStyle = targetElement.style.paddingRight;

          const scrollbarWidth = getScrollbarWidth();

          if (reserveScrollBarGap && scrollbarWidth > 0) {
            const computedPaddingRight = window.getComputedStyle(targetElement).paddingRight;
            const currentPadding = parseFloat(computedPaddingRight) || 0;
            targetElement.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
          }

          targetElement.style.overflow = 'hidden';
        }
      }
    } else if (isLockedRef.current) {
      isLockedRef.current = false;
      activeLockCount = Math.max(0, activeLockCount - 1);

      if (activeLockCount === 0) {
        targetElement.style.overflow = originalOverflowStyle;
        targetElement.style.paddingRight = originalPaddingRightStyle;
      }
    }

    return () => {
      if (isLockedRef.current) {
        isLockedRef.current = false;
        activeLockCount = Math.max(0, activeLockCount - 1);

        if (activeLockCount === 0) {
          targetElement.style.overflow = originalOverflowStyle;
          targetElement.style.paddingRight = originalPaddingRightStyle;
        }
      }
    };
  }, [isLocked, target, reserveScrollBarGap]);
}
