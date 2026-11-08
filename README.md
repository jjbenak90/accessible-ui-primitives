# accessible-ui-primitives

A lightweight, enterprise-grade suite of headless React accessibility hooks and dialog primitives engineered to satisfy **WCAG 2.2 Level AA/AAA**, the **W3C WAI-ARIA Authoring Practices Guide (APG)**, and rigorous **Deque axe-core** automated audit suites with zero violations.

---

## Architectural Highlights

- **Pure Semantic WAI-ARIA APG Compliance:** Implements the formal [W3C WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) with strict accessible naming contracts, container-level semantics (`role="dialog"`, `aria-modal="true"`), and bidirectional identifier linkages.
- **Deterministic Focus Trap & Lifecycle Synchronization:** Custom `useFocusTrap` hook eliminates common timing and race conditions in concurrent UI rendering through next-frame paint scheduling (`requestAnimationFrame`), manual `focusin` cancellation, dynamic DOM mutation reconciliation, and multi-portal sibling awareness.
- **True Non-Modal Background Freezing (`useInert`):** Uses the standard HTML `inert` attribute to isolate outside page trees (including testing roots, app shells, and Storybook hosts) without colliding with portaled sibling dialogs.
- **Reference-Counted Layout Preservation (`useScrollLock`):** Handles viewport locking across nested layers without cumulative layout shift (CLS) via scrollbar gap compensation and multi-instance reference counters.
- **DOM-Ordered Multi-Modal Escape Stack (LIFO):** Combines focused-container checks with fallback DOM traversal (`[role="dialog"]`) to dismiss stacked modals in proper order, even when React effect ordering or delayed event loops disrupt traditional component stack states.

---

## Core Primitives & Hooks

### `Modal` (`src/components/Modal/Modal.tsx`)

A portaled dialog primitive rendering directly into `document.body`.

- **Accessible Naming API:** Strict TypeScript discriminated unions require one of three mutually exclusive accessible name paths:
  1. Visual `title` mapped automatically via `aria-labelledby`.
  2. External `aria-labelledby` referencing a custom element ID.
  3. Headless `aria-label` string when no visual heading element is rendered.
- **Accessible Description API:** Optional `description` automatically mapped via `aria-describedby`, with support for explicit overrides.
- **Click-Outside & Dismissal Safety:** Employs pointer lifecycle tracking (`onMouseDown` + `onMouseUp`) to verify click events both originate and terminate on the backdrop before triggering `onClose`, preventing accidental dismissals when selecting text inside the dialog.
- **Topmost Global Escape Routing:** Manages a shared, DOM-synchronized modal stack that captures the Escape key, prevents default propagation, and dismisses only the topmost active dialog.

### `useFocusTrap` (`src/hooks/useFocusTrap.ts`)

- **Interactive Element Querying:** Evaluates standard tabbable selectors (`a[href]`, `button:not([disabled])`, `input:not([disabled])`, `select`, `textarea`, `[tabindex]`, `[contenteditable]`) while omitting disabled nodes and elements with negative tabindices (`tabindex="-1"`).
- **Real Geometry Visibility Checking:** Validates element presence via `getClientRects().length > 0` and CSS `visibility !== 'hidden'`, avoiding `offsetParent === null` bugs inside fixed portal wrappers.
- **Bidirectional Tab Trapping & Capture Interception:** Traps Tab and Shift+Tab keydown events in the capture phase. Wraps from container focus or first element to the last, and from the last element back to the first.
- **Focus Rescue & Active Element Deletion:** Automatically catches orphaned browser focus (such as when a focused element inside the dialog unmounts or is removed via mutation) and returns focus to the initial target.
- **Sibling Awareness:** Defers initial focus with `requestAnimationFrame` and guards against stealing focus if a child dialog portal rendered above it has already claimed active focus.

### `useFocusReturn` (`src/hooks/useFocusReturn.ts`)

- Caches `document.activeElement` synchronously using `useLayoutEffect` before layout paint and DOM mutations occur.
- Returns focus to the invoking trigger button upon modal dismissal or component unmount, ensuring keyboard users never lose their place on the page.

### `useInert` (`src/hooks/useInert.ts`)

- Identifies all direct children of `document.body` outside the active modal container.
- Filters out sibling portaled dialogs and applies the HTML `inert` attribute to background roots (`#root`, `#storybook-root`).
- Ensures screen readers and assistive technology cannot access background elements while a modal is open.

### `useScrollLock` (`src/hooks/useScrollLock.ts`)

- Locks document scrolling by toggling `overflow: hidden` on `document.body`.
- Calculates real viewport scrollbar dimensions (`window.innerWidth - document.documentElement.clientWidth`) and adds dynamic `paddingRight` compensation to prevent layout jank.
- Uses module-level reference counting to support multiple nested modals without prematurely unlocking the page when intermediate modals close.

---

## Verification & Test Suites

The repository enforces accessibility and stability across unit, integration, and end-to-end automation layers.

### 1. Vitest & React Testing Library (`src/tests/`)

- **Unit Testing (`useScrollLock.test.tsx`):**
  - Verifies `overflow: hidden` assignment and scroll restoration.
  - Validates reference counting across nested/stacked components.
  - Verifies scrollbar width gap calculation in simulated viewports.
- **Unit Testing (`useFocusTrap.test.tsx`):**
  - Verifies initial focus acquisition on dynamically rendered child targets.
  - Tests forward circular Tab wrapping (last $\rightarrow$ first).
  - Tests reverse circular Shift+Tab wrapping (first $\rightarrow$ last).
- **Integration Testing (`Modal.test.tsx`):**
  - **Structure:** Verifies conditional unmounting and WAI-ARIA attribute relationships (`aria-modal`, `aria-labelledby`, `aria-describedby`).
  - **Dismissal:** Tests Close button invocation, Escape keypress dismissal, and background click prevention.
  - **Multi-Modal LIFO:** Confirms Escape key dismisses only the topmost dialog across 2-modal and 3-modal nested portal stacks.
  - **Boundary Trapping:** Verifies backward wrap directly from container focus and ensures `disabled` buttons are excluded from the boundary calculation.
  - **Focus Recovery:** Confirms focus is automatically rescued when an active focused button unmounts from the DOM.
  - **Automated Accessibility Audit:** Executes in-memory `jest-axe` scans asserting zero accessibility violations (`toHaveNoViolations()`) against the rendered dialog tree.
  - **Naming Contract:** Validates accessible name resolution across explicit IDs and title props.

### 2. Playwright & `@axe-core/playwright` (`e2e/modal.spec.ts`)

Executes real browser runs (Chromium, Firefox, WebKit) against the isolated Storybook environment:

- Runs `@axe-core/playwright` audits across the full rendered dialog scope.
- Tests live keyboard navigation, DOM element removal focus recovery, container-focus wrapping, and trigger focus restoration.
- Validates pointer bounding box clipping and backdrop click dismissal.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm, pnpm, or yarn

### Installation

```bash
npm install
```

### Development Scripts

```bash
# Start Vite development server
npm run dev

# Run Vitest unit & integration test suites
npx vitest run

# Start Storybook component workbench
npm run storybook

# Run Playwright end-to-end accessibility test suites
npx playwright test
```

---

## Roadmap & Enterprise Accessibility Next Steps

1. **WAI-ARIA Alert Dialog Primitive (`AlertDialog`):**
   - Introduce a specialized alert modal pattern adhering to `role="alertdialog"`.
   - Configure initial focus to land on the least destructive element (e.g., "Cancel" rather than "Confirm/Delete").
2. **Accessible Toast & Live Region Notifications:**
   - Implement an ARIA live region manager (`aria-live="polite"` and `aria-live="assertive"`, `role="status"`, `role="alert"`) for non-modal dynamic updates.
3. **WCAG 2.2 Drag-and-Drop & Pointer Cancellation Primitives:**
   - Add alternative keyboard controls for complex drag operations to support WCAG 2.2 Success Criterion 2.5.7 (Dragging Movements).
4. **Automated Continuous Accessibility Reporting in CI/CD:**
   - Export axe-core SARIF test reports to GitHub Code Scanning and establish zero-regression gates for automated accessibility regressions.
