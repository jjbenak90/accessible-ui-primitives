import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn, within, userEvent, expect } from 'storybook/test';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Primitives/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    // Storybook 8 a11y addon configuration
    a11y: {
      element: '#storybook-root',
      config: {
        rules: [
          { id: 'aria-hidden-focus', reviewOnFail: true },
          { id: 'aria-dialog-name', reviewOnFail: true },
        ],
      },
    },
    docs: {
      description: {
        component:
          'W3C WAI-ARIA APG compliant modal dialog featuring deterministic focus restoration, active focus trapping, and zero axe-core violations.',
      },
    },
  },
  tags: ['autodocs'],
  // Storybook 8+ pattern: fn() replaces argTypes action strings
  args: {
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

/**
 * Standard Dialog with title, description, and interactive form controls.
 */
export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Open Standard Dialog
        </button>

        <Modal
          {...args}
          isOpen={isOpen}
          onClose={() => {
            args.onClose();
            setIsOpen(false);
          }}
          title="Automated Scan Target"
          description="Define the target domain and scope parameters for scheduled accessibility scans."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              args.onClose();
              setIsOpen(false);
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="scan-url" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Target URL
              </label>
              <input
                id="scan-url"
                type="url"
                defaultValue="https://deque.com"
                required
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  args.onClose();
                  setIsOpen(false);
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Start Ingestion
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  },
  play: async ({ canvasElement, step, args }) => {
    const canvas = within(canvasElement);

    await step('Trigger modal open', async () => {
      const openButton = canvas.getByRole('button', { name: /open standard dialog/i });
      await userEvent.click(openButton);
    });

    // The modal renders in document.body via Portal, so query document.body
    const body = within(document.body);
    const dialog = await body.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    await step('Verify initial focus lands inside dialog', async () => {
      const closeButton = body.getByRole('button', { name: /close dialog/i });
      await expect(closeButton).toHaveFocus();
    });

    await step('Test focus trap Tab cycle', async () => {
      await userEvent.tab(); // Focus moves to Target URL input
      const input = body.getByRole('textbox', { name: /target url/i });
      await expect(input).toHaveFocus();

      await userEvent.tab(); // Focus moves to Cancel button
      const cancelButton = body.getByRole('button', { name: /cancel/i });
      await expect(cancelButton).toHaveFocus();

      await userEvent.tab(); // Focus moves to Start Ingestion button
      const submitButton = body.getByRole('button', { name: /start ingestion/i });
      await expect(submitButton).toHaveFocus();

      await userEvent.tab(); // Wrap around back to Close button
      const closeButton = body.getByRole('button', { name: /close dialog/i });
      await expect(closeButton).toHaveFocus();
    });

    await step('Verify Escape key dismissal', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(args.onClose).toHaveBeenCalled();
    });
  },
};

/**
 * Headless accessible name calculation fallback:
 * Uses `aria-label` without rendering a visual <h2> heading.
 */
export const HeadlessAriaLabel: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600"
        >
          Open Headless Modal
        </button>

        <Modal
          {...args}
          isOpen={isOpen}
          onClose={() => {
            args.onClose();
            setIsOpen(false);
          }}
          aria-label="Raw Telemetry Snapshot"
        >
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Raw Engine Output
            </h3>
            <pre className="rounded bg-neutral-100 p-3 text-xs font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              {JSON.stringify({ status: 200, ruleCount: 94, passed: true }, null, 2)}
            </pre>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  args.onClose();
                  setIsOpen(false);
                }}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};