"use client";

const PRIORITY_BOUNDARY_SELECTOR = "td,th,li,blockquote,p,pre";

function getContentBoxWidth(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  const paddingLeft = Number.parseFloat(style.paddingLeft || "0") || 0;
  const paddingRight = Number.parseFloat(style.paddingRight || "0") || 0;
  const contentWidth = element.clientWidth - paddingLeft - paddingRight;
  return Math.max(0, Math.floor(contentWidth));
}

export function getResizeBoundaryWidth(
  container: HTMLElement | null,
  fallbackWidth: number
): number {
  if (!container || typeof window === "undefined") return fallbackWidth;

  const preferred = container.closest(PRIORITY_BOUNDARY_SELECTOR) as HTMLElement | null;
  if (preferred && preferred !== container) {
    const preferredWidth = getContentBoxWidth(preferred);
    if (preferredWidth > 0) return preferredWidth;
  }

  let ancestor = container.parentElement;
  while (ancestor) {
    const ancestorWidth = getContentBoxWidth(ancestor);
    const display = window.getComputedStyle(ancestor).display;
    if (ancestorWidth > 0 && display !== "inline") {
      return ancestorWidth;
    }
    ancestor = ancestor.parentElement;
  }

  return fallbackWidth;
}

export function clampToContainerWidth(
  nextWidth: number,
  maxWidth: number,
  minWidth: number
): number {
  const safeMaxWidth = Math.max(1, Math.floor(maxWidth));
  const safeMinWidth = Math.max(1, Math.floor(minWidth));
  const effectiveMinWidth = Math.min(safeMinWidth, safeMaxWidth);
  return Math.max(effectiveMinWidth, Math.min(safeMaxWidth, nextWidth));
}
