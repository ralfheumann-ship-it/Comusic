// Suppress browser text selection for the duration of an in-progress pointer
// gesture. The caller should already have preventDefault()'d the triggering
// pointerdown so the browser doesn't kick off a native text-drag of any
// existing selection. Cleanup runs on the first window pointerup/cancel,
// regardless of whether the drag ever crossed a threshold.
export function suppressSelectionUntilPointerUp() {
  const prevUserSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'
  window.getSelection()?.removeAllRanges()
  const restore = () => {
    window.removeEventListener('pointerup', restore)
    window.removeEventListener('pointercancel', restore)
    document.body.style.userSelect = prevUserSelect
  }
  window.addEventListener('pointerup', restore)
  window.addEventListener('pointercancel', restore)
}
