// Keyboard navigation, focus trap, and ARIA helpers for the widget.

let trapRoot: HTMLElement | null = null;

export function trapFocus(root: HTMLElement): void {
  trapRoot = root;
  root.addEventListener("keydown", handleTrapKeydown);
  // Focus first focusable element
  const first = getFocusable(root)[0];
  if (first) (first as HTMLElement).focus();
}

export function releaseFocus(): void {
  if (trapRoot) {
    trapRoot.removeEventListener("keydown", handleTrapKeydown);
    trapRoot = null;
  }
}

function handleTrapKeydown(e: KeyboardEvent): void {
  if (e.key !== "Tab" || !trapRoot) return;

  const focusable = getFocusable(trapRoot);
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;
  const active = trapRoot.getRootNode() instanceof ShadowRoot
    ? (trapRoot.getRootNode() as ShadowRoot).activeElement
    : document.activeElement;

  if (e.shiftKey) {
    if (active === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function getFocusable(root: HTMLElement): Element[] {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll(selector));
}

// Announce text to screen readers via a live region
let liveRegion: HTMLElement | null = null;

export function initLiveRegion(shadowRoot: ShadowRoot): void {
  liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "yay-sr-only";
  shadowRoot.appendChild(liveRegion);
}

export function announce(text: string): void {
  if (!liveRegion) return;
  liveRegion.textContent = "";
  // Force reflow so screen readers pick up the change
  void liveRegion.offsetHeight;
  liveRegion.textContent = text;
}
