import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useScrollLock } from '../hooks/useScrollLock';

const ScrollLockHarness: React.FC<{
  initialLocked?: boolean;
  reserveScrollBarGap?: boolean;
}> = ({ initialLocked = false, reserveScrollBarGap = true }) => {
  const [locked, setLocked] = useState(initialLocked);
  useScrollLock(locked, { reserveScrollBarGap });

  return (
    <button type='button' onClick={() => setLocked((prev) => !prev)}>
      Toggle Lock
    </button>
  );
};

const NestedModalsHarness: React.FC = () => {
  const [modalOneOpen, setModalOneOpen] = useState(false);
  const [modalTwoOpen, setModalTwoOpen] = useState(false);

  useScrollLock(modalOneOpen);
  useScrollLock(modalTwoOpen);

  return (
    <div>
      <button type='button' onClick={() => setModalOneOpen((prev) => !prev)}>
        Toggle Modal 1
      </button>
      <button type='button' onClick={() => setModalTwoOpen((prev) => !prev)}>
        Toggle Modal 2
      </button>
    </div>
  );
};

describe('useScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('locks body scroll when active and restores previous overflow on toggle', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'auto';

    render(<ScrollLockHarness initialLocked={false} />);
    const toggleButton = await screen.findByRole('button', { name: /toggle lock/i });

    expect(document.body.style.overflow).toBe('auto');

    // Lock
    await user.click(toggleButton);
    expect(document.body.style.overflow).toBe('hidden');

    // Unlock
    await user.click(toggleButton);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores body overflow when component unmounts while locked', () => {
    document.body.style.overflow = 'visible';

    const { unmount } = render(<ScrollLockHarness initialLocked />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('visible');
  });

  it('handles nested modal locks via reference counting without early unlocking', async () => {
    const user = userEvent.setup();
    render(<NestedModalsHarness />);

    const btn1 = await screen.findByRole('button', { name: /toggle modal 1/i });
    const btn2 = await screen.findByRole('button', { name: /toggle modal 2/i });

    expect(document.body.style.overflow).toBe('');

    // Open first modal
    await user.click(btn1);
    expect(document.body.style.overflow).toBe('hidden');

    // Open second modal (stacked)
    await user.click(btn2);
    expect(document.body.style.overflow).toBe('hidden');

    // Close second modal - body should remain locked because modal 1 is still open
    await user.click(btn2);
    expect(document.body.style.overflow).toBe('hidden');

    // Close first modal - now body should unlock
    await user.click(btn1);
    expect(document.body.style.overflow).toBe('');
  });

  it('applies scrollbar padding gap if scrollbar exists and reserveScrollBarGap is true', () => {
    // Simulate scrollbar presence in jsdom: innerWidth > clientWidth
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1008,
      configurable: true,
    });

    const { unmount } = render(<ScrollLockHarness initialLocked reserveScrollBarGap />);

    // Expected gap = 1024 - 1008 = 16px
    expect(document.body.style.paddingRight).toBe('16px');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.paddingRight).toBe('');
    expect(document.body.style.overflow).toBe('');
  });
});
