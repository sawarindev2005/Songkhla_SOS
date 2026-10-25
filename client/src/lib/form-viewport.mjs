// Prefer the top of an oversized field, rather than oscillating between its edges.
export function revealDelta(rect, top, bottom) {
  if (bottom <= top) return 0;
  if (rect.top < top || rect.height > bottom - top) return rect.top - top;
  if (rect.bottom > bottom) return rect.bottom - bottom;
  return 0;
}

export function isEditable(element) {
  if (!element || element.disabled || element.readOnly) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true;
  return element.tagName === 'INPUT' &&
    !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file', 'hidden'].includes(element.type);
}

export function revealField(element, viewport, win = window) {
  const top = (viewport?.offsetTop ?? 0) + 12;
  let bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? win.innerHeight) - 12;
  const root = element.ownerDocument.scrollingElement;
  const inDialog = element.closest('dialog[open]');
  if (!inDialog) {
    const field = element.getBoundingClientRect();
    for (const overlay of element.ownerDocument.querySelectorAll?.('[data-form-occluder]') ?? []) {
      const cover = overlay.getBoundingClientRect();
      if (cover.height && cover.width && cover.right > field.left && cover.left < field.right && cover.bottom > top) {
        bottom = Math.min(bottom, cover.top - 8);
      }
    }
  }
  function fieldRect(availableHeight) {
    const control = element.closest('[data-form-control]') ?? element;
    const rect = control.getBoundingClientRect();
    const label = element.labels?.[0]?.getBoundingClientRect();
    // Keep the label with its control when both fit; a tall textarea takes priority.
    if (label && label.top < rect.top && rect.bottom - label.top <= availableHeight) {
      return { top: label.top, bottom: rect.bottom, height: rect.bottom - label.top };
    }
    return rect;
  }
  for (let parent = element.parentElement; parent && parent !== root; parent = parent.parentElement) {
    const style = win.getComputedStyle(parent);
    if (!/(auto|scroll)/.test(style.overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
    const box = parent.getBoundingClientRect();
    let visibleTop = Math.max(top, box.top + parent.clientTop + 4);
    let visibleBottom = Math.min(bottom, box.top + parent.clientTop + parent.clientHeight - 4);
    // A nested scroller may itself be clipped by a surrounding panel/dialog.
    for (let clip = parent.parentElement; clip && clip !== root; clip = clip.parentElement) {
      if (!/(auto|scroll|hidden|clip)/.test(win.getComputedStyle(clip).overflowY)) continue;
      const bounds = clip.getBoundingClientRect();
      visibleTop = Math.max(visibleTop, bounds.top + clip.clientTop);
      visibleBottom = Math.min(visibleBottom, bounds.top + clip.clientTop + clip.clientHeight);
    }
    parent.scrollBy({ top: revealDelta(fieldRect(visibleBottom - visibleTop), visibleTop, visibleBottom), behavior: 'instant' });
  }
  // The document stays inert behind a native modal; only its own scrollers should move.
  if (!inDialog && !element.closest('[data-form-main]')) {
    win.scrollBy({ top: revealDelta(fieldRect(bottom - top), top, bottom), behavior: 'instant' });
  }
}
export function formViewportState({ width, layoutHeight, visualHeight, baselineHeight, editing, wasOpen = false, scale = 1 }) {
  const mobile = width < 1024 && Math.abs(scale - 1) <= 0.05;
  const keyboard = mobile && (editing || wasOpen) && Math.max(layoutHeight, baselineHeight) - visualHeight > 100;
  return {
    keyboard,
    short: mobile && visualHeight < 500,
    // Preserve the pre-keyboard bottom edge even when a browser resizes layout.
    shellHeight: keyboard ? Math.max(layoutHeight, baselineHeight) : layoutHeight,
  };
}
