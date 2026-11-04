import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Storybook iframe direct rendering URL for isolated component testing
const STORYBOOK_MODAL_URL = '/iframe.html?id=primitives-modal--default&viewMode=story';

test.describe('Modal Primitive (WAI-ARIA APG & Deque axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORYBOOK_MODAL_URL);
  });

  test('passes axe-core automated accessibility audits when opened', async ({ page }) => {
    // Open the modal
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Run axe audit targeting the rendered dialog container
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('adheres to WAI-ARIA APG attributes contract', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Verify aria-labelledby points to an existing heading element
    const labelledById = await dialog.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const heading = page.locator(`#${labelledById}`);
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/automated scan target/i);

    // Verify aria-describedby points to an existing description element
    const describedById = await dialog.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
    const description = page.locator(`#${describedById}`);
    await expect(description).toBeVisible();
  });

  test('enforces initial focus and circular focus trapping', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    // Initial focus should land on the first tabbable element (Close button or first input)
    const closeButton = page.getByRole('button', { name: /close dialog/i });
    await expect(closeButton).toBeFocused();

    // Tab sequentially through dialog controls
    const input = page.getByRole('textbox', { name: /target url/i });
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    const submitButton = page.getByRole('button', { name: /start ingestion/i });

    await page.keyboard.press('Tab');
    await expect(input).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(submitButton).toBeFocused();

    // Forward wrap: Tab from last interactive element should cycle back to the first
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    // Reverse wrap: Shift+Tab from first interactive element should wrap to the last
    await page.keyboard.press('Shift+Tab');
    await expect(submitButton).toBeFocused();
  });

  test('wraps backward to the last element when Shift+Tab is pressed directly from dialog container focus', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Explicitly focus dialog container to test the activeElement === container branch
    await dialog.focus();
    await expect(dialog).toBeFocused();

    // Shift+Tab from container must wrap to the last interactive element
    await page.keyboard.press('Shift+Tab');
    const submitButton = page.getByRole('button', { name: /start ingestion/i });
    await expect(submitButton).toBeFocused();
  });

  test('rescues focus back into the dialog when the active element is removed from the DOM', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();

    // Dynamically delete the active focused element
    await page.evaluate(() => {
      document.activeElement?.remove();
    });

    // Verify browser dropped focus to body
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(activeTagName).toBe('body');

    // Next Tab press must be intercepted in capture phase and rescued to firstElement
    await page.keyboard.press('Tab');
    const closeButton = page.getByRole('button', { name: /close dialog/i });
    await expect(closeButton).toBeFocused();
  });

  test('excludes disabled elements from boundary wrap calculations', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel/i });
    const closeButton = page.getByRole('button', { name: /close dialog/i });

    // In-place disable the last button (e.g., submitting state)
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find((b) => b.textContent?.includes('Start Ingestion'));
      if (submitBtn) submitBtn.disabled = true;
    });

    // Focus Cancel button (now the effective last interactive element)
    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();

    // Tabbing forward should skip the disabled button and wrap to Close button
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();
  });

  test('dismisses on Escape key and deterministically restores focus to trigger', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Hit Escape to dismiss
    await page.keyboard.press('Escape');

    // Dialog should unmount or hide
    await expect(dialog).toBeHidden();

    // Focus must be restored back to the invoking trigger
    await expect(trigger).toBeFocused();
  });

  test('dismisses when clicking outside the modal content boundary', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /open standard dialog/i });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click outside dialog bounding box (top-left backdrop area)
    await page.mouse.click(10, 10);

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
