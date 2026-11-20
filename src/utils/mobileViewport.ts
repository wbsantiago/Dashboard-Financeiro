/** Android's SystemBars already resizes the WebView for the keyboard. */
export function getUsableViewport(android: boolean, layoutHeight: number, visual?: { height: number; offsetTop: number } | null) {
  const height = android ? layoutHeight : visual && visual.height > 0 ? visual.height : layoutHeight;
  // Some rotation transitions briefly report no usable surface. Keep the last geometry.
  if (!Number.isFinite(height) || height <= 0) return null;
  return { height, top: android ? 0 : Math.max(0, visual?.offsetTop || 0) };
}

/** Reveal a field by scrolling its dialog, never the document or background header. */
export function revealDialogField(field: HTMLElement) {
  const dialog = field.closest<HTMLElement>('[role="dialog"],dialog');
  if (!dialog) return;
  let parent = field.parentElement;
  while (parent && dialog.contains(parent)) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
      const fieldRect = field.getBoundingClientRect(), parentRect = parent.getBoundingClientRect();
      const top = parentRect.top + parent.clientTop + 12;
      const bottom = parentRect.top + parent.clientTop + parent.clientHeight - 12;
      const delta = fieldRect.top < top ? fieldRect.top - top : fieldRect.bottom > bottom ? fieldRect.bottom - bottom : 0;
      if (delta) parent.scrollTop = Math.max(0, Math.min(parent.scrollHeight - parent.clientHeight, parent.scrollTop + delta));
    }
    if (parent === dialog) break;
    parent = parent.parentElement;
  }
}
