import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Modal } from "../components/Modal";

describe("Modal Primitive", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Test Dialog Title",
    description: "This is a description explaining dialog purpose.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", async () => {
    render(
      <Modal {...defaultProps} isOpen={false}>
        <p>Hidden Content</p>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with correct WAI-ARIA attributes when open", async () => {
    render(
      <Modal {...defaultProps}>
        <p>Dialog Body Content</p>
      </Modal>,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");

    // Verify title association via aria-labelledby
    const heading = await screen.findByRole("heading", {
      name: "Test Dialog Title",
    });
    expect(dialog).toHaveAttribute("aria-labelledby", heading.id);

    // Verify description association via aria-describedby
    const description = await screen.findByText(
      "This is a description explaining dialog purpose.",
    );
    expect(dialog).toHaveAttribute("aria-describedby", description.id);
  });

  describe("Modal Dismissal", () => {
    it("calls onClose when the close button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <Modal {...defaultProps}>
          <div>Content</div>
        </Modal>,
      );

      const closeBtn = await screen.findByRole("button", {
        name: /close dialog/i,
      });
      await user.click(closeBtn);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("triggers onClose when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <button type="button">Action</button>
        </Modal>,
      );

      await user.keyboard("{Escape}");
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking backdrop, but NOT when clicking modal content", async () => {
      const user = userEvent.setup();

      render(
        <Modal {...defaultProps}>
          <button type="button">Inside Button</button>
        </Modal>,
      );

      // Clicking inside the modal card should not close it
      await user.click(await screen.findByText("Inside Button"));
      expect(defaultProps.onClose).not.toHaveBeenCalled();

      // Clicking the outer backdrop directly triggers onClose
      const dialog = await screen.findByRole("dialog");
      const backdrop = dialog.parentElement as HTMLElement;
      await user.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("passes automated jest-axe audit with zero accessibility violations", async () => {
      const { baseElement } = render(
        <Modal {...defaultProps}>
          <div>
            <label htmlFor="modal-input">User Name</label>
            <input id="modal-input" type="text" />
            <button type="button">Save</button>
          </div>
        </Modal>,
      );

      // BaseElement evaluates the document.body portal target
      const results = await axe(baseElement);
      expect(results).toHaveNoViolations();
    });
  });
});
