import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useInert } from '../../hooks/useInert';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useFocusReturn } from '../../hooks/useFocusReturn';
import { useScrollLock } from '../../hooks/useScrollLock';
import { type ModalProps, type ModalStackEntry } from './Modal.types';

const modalStack: ModalStackEntry[] = [];

const handleGlobalEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || modalStack.length === 0) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  // 1. If focus is inside one of the modals, close that modal
  // Searching from the end of the array backwards (LIFO):
  for (let i = modalStack.length - 1; i >= 0; i--) {
    const entry = modalStack[i];
    if (
      entry.container.contains(document.activeElement) ||
      entry.backdrop.contains(document.activeElement)
    ) {
      entry.onClose();
      return;
    }
  }

  // 2. Fallback if focus is on body / hasn't settled yet:
  // modalStack[0] is the leaf / nested child modal!
  const deepestChildModal = modalStack[0];
  deepestChildModal.onClose();
};
export const _resetModalStackForTesting = (): void => {
  modalStack.length = 0;
  document.removeEventListener('keydown', handleGlobalEscape, true);
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  'aria-label': ariaLabel,
  'aria-labelledby': explicitLabelledBy,
  description,
  'aria-describedby': explicitDescribedBy,
  children,
  initialFocusRef,
  className = '',
  lockScroll = true,
}: ModalProps) => {
  const generatedTitleId = useId();
  const generatedDescId = useId();
  // Track whether the initial pointer down started directly on the backdrop
  const isMouseDownOnBackdrop = useRef(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Synchronized ID and attribute calculation
  const headingId = title ? (explicitLabelledBy ?? generatedTitleId) : undefined;
  const dialogLabelledBy = ariaLabel
    ? undefined
    : (explicitLabelledBy ?? (title ? headingId : undefined));
  const dialogLabel = dialogLabelledBy ? undefined : ariaLabel;
  const effectiveDescId = explicitDescribedBy ?? (description ? generatedDescId : undefined);

  // 1. Lock scroll on body when modal is open
  useScrollLock(isOpen && lockScroll);

  // 2. Maintain focus boundary and restoration
  useFocusReturn(isOpen);
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, initialFocusRef);

  // 3. Locks down #storybook-root, #root, and any sibling DOM nodes while open
  useInert(isOpen, backdropRef);

  // 4. Backdrop click dismissal: Only dismiss if both mousedown and mouseup occur on the backdrop
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only flag true if the target is the backdrop container itself
    isMouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Dismiss only if BOTH mouseDown and mouseUp occurred directly on the backdrop
    if (isMouseDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose();
    }
    isMouseDownOnBackdrop.current = false;
  };

  // 5. Global Escape key dismissal: Only the topmost modal in the stack should respond to Escape
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Register with DOM-ordered stack on document
  useEffect(() => {
    const backdrop = backdropRef.current;
    const container = containerRef.current;

    // Narrow both out of `null`
    if (!isOpen || !backdrop || !container) return;

    if (modalStack.length === 0) {
      document.addEventListener('keydown', handleGlobalEscape, true);
    }

    const entry: ModalStackEntry = {
      backdrop,
      container,
      onClose: () => onCloseRef.current(),
    };

    modalStack.push(entry);

    return () => {
      const idx = modalStack.indexOf(entry);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
      if (modalStack.length === 0) {
        document.removeEventListener('keydown', handleGlobalEscape, true);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        ref={containerRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={dialogLabelledBy}
        aria-label={dialogLabel}
        aria-describedby={effectiveDescId}
        tabIndex={-1}
        className={`relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 ${className}`}
      >
        <div
          className={`flex items-start ${title ? 'justify-between' : 'justify-end'} gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800`}
        >
          {title && (
            <h2
              id={headingId}
              className='text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50'
            >
              {title}
            </h2>
          )}
          <button
            type='button'
            onClick={onClose}
            aria-label='Close dialog'
            className='rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
          >
            <span aria-hidden='true' className='text-xl leading-none'>
              &times;
            </span>
          </button>
        </div>

        {description && (
          <p id={effectiveDescId} className='mt-2 text-sm text-neutral-600 dark:text-neutral-400'>
            {description}
          </p>
        )}

        <div className='mt-4'>{children}</div>
      </div>
    </div>,
    document.body
  );
};
