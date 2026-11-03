import React from 'react';

export interface ModalProps {
  /** Controls visibility state */
  isOpen: boolean;
  /** Callback fired when the dialog requests dismissal (Escape key, close button, backdrop click) */
  onClose: () => void;
  /** Accessible dialog title referenced by aria-labelledby */
	title: React.ReactNode;
	'aria-labelledby'?: string;
	'aria-label'?: string;
  /** Optional accessible description referenced by aria-describedby */
	description?: React.ReactNode;
	'aria-describedby'?: string;
  /** Dialog body content */
  children: React.ReactNode;
  /** Optional element to receive focus upon opening instead of the first interactive target */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Optional container style overrides */
  className?: string;
}