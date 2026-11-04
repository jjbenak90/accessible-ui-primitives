import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useFocusReturn } from "../../hooks/useFocusReturn";
import { type ModalProps } from "./Modal.types";

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": explicitLabelledBy,
  description,
  "aria-describedby": explicitDescribedBy,
  children,
  initialFocusRef,
  className = "",
}: ModalProps) => {
  const generatedTitleId = useId();
  const generatedDescId = useId();
  // Track whether the initial pointer down started directly on the backdrop
  const isMouseDownOnBackdrop = useRef( false );
  
  // Resolve provided explicit IDs vs auto-generated IDs
  const effectiveTitleId =
    explicitLabelledBy || (title ? generatedTitleId : undefined);
  const effectiveDescId =
    explicitDescribedBy || (description ? generatedDescId : undefined);

  // 1. Maintain focus boundary and restoration
  useFocusReturn(isOpen);
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, initialFocusRef);

  // 2. WAI-ARIA keyboard requirement: Escape dismisses dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropMouseDown = ( e: React.MouseEvent<HTMLDivElement> ) => {
    // Only flag true if the target is the backdrop container itself
    isMouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = ( e: React.MouseEvent<HTMLDivElement> ) => {
    // Dismiss only if BOTH mouseDown and mouseUp occurred directly on the backdrop
    if (isMouseDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose();
    }
    isMouseDownOnBackdrop.current = false;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={ handleBackdropMouseDown }
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby={effectiveTitleId}
        aria-label={!effectiveTitleId ? ariaLabel : undefined}
        aria-describedby={effectiveDescId}
        tabIndex={-1}
        className={`relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 ${className}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
          {title ? (
            <h2
              id={generatedTitleId}
              className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
            >
              {title}
            </h2>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              &times;
            </span>
          </button>
        </div>

        {description && (
          <p
            id={generatedDescId}
            className="mt-2 text-sm text-neutral-600 dark:text-neutral-400"
          >
            {description}
          </p>
        )}

        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
