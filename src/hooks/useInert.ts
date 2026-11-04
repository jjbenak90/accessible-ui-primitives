import { useEffect, type RefObject } from 'react';

export const useInert = (
  isOpen: boolean,
  portalRef: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    if (!isOpen || !portalRef.current || typeof document === 'undefined') return;

    const portalElement = portalRef.current;
    
    // Find all other elements attached to document.body (like #root or #storybook-root)
    const siblings = Array.from(document.body.children).filter(
      (el): el is HTMLElement => 
        el !== portalElement && 
        el instanceof HTMLElement &&
        !['SCRIPT', 'STYLE'].includes(el.tagName)
    );

    // Apply inert to completely freeze them from screen readers and pointers
    siblings.forEach((el) => {
      el.setAttribute('inert', '');
    });

    return () => {
      // Remove inert when unmounting or closing
      siblings.forEach((el) => {
        el.removeAttribute('inert');
      });
    };
  }, [isOpen, portalRef]);
};