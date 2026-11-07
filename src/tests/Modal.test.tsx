import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useState } from 'react';
import { Modal } from '../components/Modal';
import { _resetModalStackForTesting } from '../components/Modal/Modal';

describe('Modal Primitive', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Dialog Title',
    description: 'This is a description explaining dialog purpose.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', async () => {
    render(
      <Modal {...defaultProps} isOpen={false}>
        <p>Hidden Content</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with correct WAI-ARIA attributes when open', async () => {
    render(
      <Modal {...defaultProps}>
        <p>Dialog Body Content</p>
      </Modal>
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Verify title association via aria-labelledby
    const heading = await screen.findByRole('heading', {
      name: 'Test Dialog Title',
    });
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);

    // Verify description association via aria-describedby
    const description = await screen.findByText('This is a description explaining dialog purpose.');
    expect(dialog).toHaveAttribute('aria-describedby', description.id);
  });

  describe('Modal Dismissal', () => {
    beforeEach(() => {
      // Purge any lingering DOM elements from prior test portals
      document.body.innerHTML = '';
      _resetModalStackForTesting();
    });

    afterEach(() => {
      cleanup();
      document.body.innerHTML = '';
      _resetModalStackForTesting();
    });

    it('calls onClose when the close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Modal {...defaultProps}>
          <div>Content</div>
        </Modal>
      );

      const closeBtn = await screen.findByRole('button', {
        name: /close dialog/i,
      });
      await user.click(closeBtn);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <button type='button'>Action</button>
        </Modal>
      );

      await user.keyboard('{Escape}');
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking backdrop, but NOT when clicking modal content', async () => {
      const user = userEvent.setup();

      render(
        <Modal {...defaultProps}>
          <button type='button'>Inside Button</button>
        </Modal>
      );

      // Clicking inside the modal card should not close it
      await user.click(await screen.findByText('Inside Button'));
      expect(defaultProps.onClose).not.toHaveBeenCalled();

      // Clicking the outer backdrop directly triggers onClose
      const dialog = await screen.findByRole('dialog');
      const backdrop = dialog.parentElement as HTMLElement;
      await user.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('dismisses only the topmost modal when Escape is pressed on two nested modals', async () => {
      const user = userEvent.setup();
      const handleCloseParent = vi.fn();
      const handleCloseChild = vi.fn();

      render(
        <Modal isOpen onClose={handleCloseParent} title='Parent Modal'>
          <Modal isOpen onClose={handleCloseChild} title='Nested Modal'>
            <button type='button'>Child Target</button>
          </Modal>
        </Modal>
      );

      // Wait for the nested modal to be rendered and focused in the DOM
      const nestedDialog = await screen.findByRole('dialog', { name: 'Nested Modal' });

      // Explicitly ensure the child target has focus, or check native containment:
      const childTarget = await screen.findByRole('button', { name: 'Child Target' });
      childTarget.focus();

      await waitFor(() => {
        expect(nestedDialog.contains(document.activeElement)).toBe(true);
      });

      // Now that child has focus, Escape will bubble through child's container
      await user.keyboard('{Escape}');

      // Only the top-most modal callback should be invoked
      expect(handleCloseChild).toHaveBeenCalledTimes(1);
      expect(handleCloseParent).not.toHaveBeenCalled();
    });

    it('dismisses only the topmost modal when Escape is pressed on three nested modals', async () => {
      const user = userEvent.setup();
      const handleCloseGrandparent = vi.fn();
      const handleCloseParent = vi.fn();
      const handleCloseChild = vi.fn();

      render(
        <Modal isOpen onClose={handleCloseGrandparent} title='Grandparent Modal'>
          <Modal isOpen onClose={handleCloseParent} title='Parent Modal'>
            <Modal isOpen onClose={handleCloseChild} title='Nested Modal'>
              <button type='button'>Child Target</button>
            </Modal>
          </Modal>
        </Modal>
      );

      // Wait for the nested modal to be rendered and focused in the DOM
      const nestedDialog = await screen.findByRole('dialog', { name: 'Nested Modal' });

      // Explicitly ensure the child target has focus, or check native containment:
      const childTarget = await screen.findByRole('button', { name: 'Child Target' });
      childTarget.focus();

      await waitFor(() => {
        expect(nestedDialog.contains(document.activeElement)).toBe(true);
      });

      // Now that child has focus, Escape will bubble through child's container
      await user.keyboard('{Escape}');

      // Only the top-most modal callback should be invoked
      expect(handleCloseChild).toHaveBeenCalledTimes(1);
      expect(handleCloseParent).not.toHaveBeenCalled();
      expect(handleCloseGrandparent).not.toHaveBeenCalled();
    });
  });

  describe('Focus Management & Dynamic Mutations', () => {
    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => {
        return {
          length: 1,
          item: () => null,
          [Symbol.iterator]: function* () {
            yield {} as DOMRect;
          },
        } as DOMRectList;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('wraps backward to the last element when Shift+Tab is pressed from container focus', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <button type='button'>First Action</button>
          <button type='button'>Last Action</button>
        </Modal>
      );

      const dialog = await screen.findByRole('dialog');
      dialog.focus();
      expect(document.activeElement).toBe(dialog);

      // Shift+Tab from container should wrap directly to Last Action
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last Action' }));
    });

    it('excludes disabled elements when computing the last boundary element', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <button type='button'>Active Last</button>
          <button type='button' disabled>
            Disabled Submission
          </button>
        </Modal>
      );

      const activeLast = screen.getByRole('button', { name: 'Active Last' });
      activeLast.focus();
      expect(document.activeElement).toBe(activeLast);

      // Tab forward should wrap to Close button instead of focusing disabled button
      await user.tab();
      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      expect(document.activeElement).toBe(closeBtn);
    });

    it('rescues focus when the currently active element unmounts from the DOM', async () => {
      const user = userEvent.setup();

      const DynamicModalContent = () => {
        const [showCancel, setShowCancel] = useState(true);
        return (
          <Modal {...defaultProps}>
            <button type='button'>Primary Action</button>
            {showCancel && (
              <button type='button' onClick={() => setShowCancel(false)}>
                Remove Me
              </button>
            )}
          </Modal>
        );
      };

      render(<DynamicModalContent />);

      const removeBtn = screen.getByRole('button', { name: 'Remove Me' });
      removeBtn.focus();
      await user.click(removeBtn);

      // Element unmounts and focus defaults to document.body
      expect(screen.queryByRole('button', { name: 'Remove Me' })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(document.body);

      // Tab key intercepted by capture phase and recovered to Close button
      await user.tab();
      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      expect(document.activeElement).toBe(closeBtn);
    });
  });

  describe('Accessibility', () => {
    it('passes automated jest-axe audit with zero accessibility violations', async () => {
      const { baseElement } = render(
        <Modal {...defaultProps}>
          <div>
            <label htmlFor='modal-input'>User Name</label>
            <input id='modal-input' type='text' />
            <button type='button'>Save</button>
          </div>
        </Modal>
      );

      // BaseElement evaluates the document.body portal target
      const results = await axe(baseElement);
      expect(results).toHaveNoViolations();
    });

    it('computes the correct accessible name when explicitLabelledBy is provided alongside a title', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title='Settings & Privacy'
          aria-labelledby='custom-title-id'
        >
          <p>Dialog body content</p>
        </Modal>
      );

      // 1. Inspect what aria-labelledby is pointing to:
      const dialog = screen.getByRole('dialog', { hidden: true });
      expect(dialog.getAttribute('aria-labelledby')).toBe('custom-title-id');

      // 2. Inspect the rendered heading in the original code:
      const heading = screen.getByRole('heading', { level: 2 });

      // 3. Assertheading.id is equal to the aria-labelledby value
      expect(heading.id).toBe('custom-title-id');

      // 4. Assert the dialog has the correct accessible name, which is the Modal's title
      expect(screen.getByRole('dialog', { name: 'Settings & Privacy' })).toBeInTheDocument();
    });
  });
});
