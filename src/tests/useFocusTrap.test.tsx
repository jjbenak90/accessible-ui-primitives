import React, { useState, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFocusTrap } from '../hooks/useFocusTrap';
import userEvent from '@testing-library/user-event';

// Harness 1: Reproduces dynamic / delayed child rendering
// Simulates a component that renders its interactive targets dynamically
// (e.g. data fetching, animated entrances, or portal-mounted form fields)
const DynamicContentModal: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Child fields mount after the initial render cycle (e.g., transition or data ready)
    setReady(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role='dialog'
      aria-label='Dynamic Content Modal'
      data-testid='trap-container'
      tabIndex={-1}
    >
      {ready ? (
        <button type='button' data-testid='child-button'>
          Click Me
        </button>
      ) : null}
    </div>
  );
};

// Harness 2: Tests keyboard Tab / Shift+Tab cycling boundaries
const FocusCycleHarness: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role='dialog' aria-label='Trapped Area' tabIndex={-1}>
      <button type='button'>First Target</button>
      <input type='text' placeholder='Middle Field' />
      <button type='button'>Last Target</button>
    </div>
  );
};

describe('useFocusTrap test suite', async () => {
  const originalGetClientRects = Element.prototype.getClientRects;

  beforeAll(() => {
    // Mock getClientRects on Element prototype so jsdom simulates rendered geometry
    Element.prototype.getClientRects = function () {
      return [
        {
          x: 0,
          y: 0,
          top: 0,
          bottom: 20,
          left: 0,
          right: 100,
          width: 100,
          height: 20,
          toJSON: () => {},
        },
      ] as unknown as DOMRectList;
    };
  });

  afterAll(() => {
    // Restore original prototype method
    Element.prototype.getClientRects = originalGetClientRects;
  });

  it('fails to focus the first interactive element when children mount dynamically', async () => {
    render(<DynamicContentModal isOpen={true} />);

    // Asynchronously query elements by their semantic accessible roles
    const dialog = await screen.findByRole('dialog', { name: /dynamic content modal/i });
    expect(dialog).toBeInTheDocument();

    const button = await screen.findByRole('button', { name: /click me/i });

    // waitFor polls until the requestAnimationFrame callback executes
    await waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
  });

  it('cycles focus to first element when Tab is pressed on the last element', async () => {
    const user = userEvent.setup();
    render(<FocusCycleHarness isOpen={true} />);

    const first = await screen.findByRole('button', { name: /first target/i });
    const last = await screen.findByRole('button', { name: /last target/i });

    // Wait for initial focus on first button
    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });

    // Move to input, then to last button
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(last);

    // Tab wrap-around: last -> first
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it('cycles focus to last element when Shift+Tab is pressed on the first element', async () => {
    const user = userEvent.setup();
    render(<FocusCycleHarness isOpen />);

    const first = await screen.findByRole('button', { name: /first target/i });
    const last = await screen.findByRole('button', { name: /last target/i });

    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });

    // Shift + Tab wrap-around: first -> last
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });
});
