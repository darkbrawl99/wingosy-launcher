/** True when running inside the Tauri webview (not Vite browser dev). */
export function isTauri() {
  return typeof window !== "undefined" && Boolean(window.__TAURI__);
}

/** Use with `data-tauri-drag-region` on the same element (Tauri frameless windows). */
export const tauriDragRegionSx = { WebkitAppRegion: "drag" };

/** Buttons, inputs, and links must opt out so clicks work. */
export const tauriNoDragSx = { WebkitAppRegion: "no-drag" };

export function tauriDragRegionProps() {
  if (!isTauri()) return {};
  return { "data-tauri-drag-region": true };
}

export function tauriNoDragProps() {
  if (!isTauri()) return {};
  return { "data-tauri-no-drag": true };
}

/**
 * `mousedown` / `pointerdown` `target` can be a `Text` node (e.g. title bar label).
 * `Element.closest` only exists on `Element`, so normalize before calling `closest`.
 */
export function mousedownTargetElement(target) {
  if (!target || typeof Node === "undefined") return null;
  if (target instanceof Element) return target;
  if (target instanceof Text && target.parentElement) return target.parentElement;
  return null;
}
