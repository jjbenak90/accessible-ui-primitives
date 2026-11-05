import React from 'react';

/**
 * Ensures strict WAI-ARIA accessible naming compliance:
 * 1. Visual heading via `title` (optional explicit aria overrides permitted)
 * 2. Purely headless via `aria-label` (no visual title rendered)
 * 3. External referencing via `aria-labelledby` (no visual title rendered)
 */
type ModalAccessibleNameProps =
  | {
      /** Accessible dialog visual title referenced by aria-labelledby */
      title: React.ReactNode;
      'aria-labelledby'?: string;
      'aria-label'?: string;
    }
  | {
      title?: never;
      /** Headless string label used when no visual title is rendered */
      'aria-label': string;
      'aria-labelledby'?: never;
    }
  | {
      title?: never;
      'aria-label'?: never;
      /** ID of an external element providing the accessible label */
      'aria-labelledby': string;
    };

interface ModalBaseProps {
  /** Controls visibility state */
  isOpen: boolean;
  /** Callback fired when the dialog requests dismissal (Escape key, close button, backdrop click) */
  onClose: () => void;
  /** Optional accessible description referenced by aria-describedby */
  description?: React.ReactNode;
  'aria-describedby'?: string;
  /** Dialog body content */
  children: React.ReactNode;
  /** Optional boolean to indicate if scrolling should be locked */
  lockScroll?: boolean;
  /** Optional element to receive focus upon opening instead of the first interactive target */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Optional container style overrides */
  className?: string;
}

export type ModalProps = ModalBaseProps & ModalAccessibleNameProps;
