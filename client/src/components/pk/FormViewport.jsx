'use client';

import { useEffect } from 'react';
import { formViewportState, isEditable, revealField } from '@/lib/form-viewport.mjs';

/** Keep the existing form scrollers inside the area above a mobile keyboard. */
export function FormViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    let shouldReveal = false;
    let focusTimer;
    let baselineHeight = window.innerHeight;
    let baselineWidth = window.innerWidth;
    let keyboardOpen = false;
    function clearViewport() {
      root.style.removeProperty('--form-viewport-height');
      root.style.removeProperty('--form-viewport-top');
      root.style.removeProperty('--form-layout-height');
      root.style.removeProperty('--form-content-height');
      delete root.dataset.formOccluded;
    }
    function update() {
      const reveal = shouldReveal;
      shouldReveal = false;
      const field = document.activeElement;
      const editing = isEditable(field);
      const height = viewport?.height ?? window.innerHeight;
      if (window.innerWidth !== baselineWidth || (!keyboardOpen && !editing)) {
        baselineWidth = window.innerWidth;
        baselineHeight = window.innerHeight;
      }
      const state = formViewportState({
        width: window.innerWidth, layoutHeight: window.innerHeight, visualHeight: height,
        baselineHeight, editing, wasOpen: keyboardOpen, scale: viewport?.scale ?? 1,
      });
      keyboardOpen = state.keyboard;
      root.toggleAttribute('data-form-short', state.short);
      // Leave desktop and pinch zoom to the browser, including its native panning.
      if ((!editing && !keyboardOpen) || window.innerWidth >= 1024 || Math.abs((viewport?.scale ?? 1) - 1) > 0.05) {
        clearViewport();
        return;
      }
      root.style.setProperty('--form-viewport-height', `${height}px`);
      root.style.setProperty('--form-viewport-top', `${viewport?.offsetTop ?? 0}px`);
      if (keyboardOpen) root.style.setProperty('--form-layout-height', `${state.shellHeight}px`);
      else root.style.removeProperty('--form-layout-height');
      root.toggleAttribute('data-form-occluded', keyboardOpen);
      const main = document.querySelector('[data-form-main]');
      if (main && keyboardOpen) {
        const available = (viewport?.offsetTop ?? 0) + height - main.getBoundingClientRect().top - 12;
        root.style.setProperty('--form-content-height', `${Math.max(0, available)}px`);
      } else root.style.removeProperty('--form-content-height');
      if (reveal && editing) revealField(field, viewport);
    }
    function schedule(event) {
      // Viewport panning can be the user's scroll to another field. Do not pull
      // the old field back into view while that next tap is still in progress.
      shouldReveal ||= event.type !== 'scroll';
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    function cancelSettling() {
      clearTimeout(focusTimer);
    }
    function focusChanged(event) {
      cancelSettling();
      schedule(event);
      const field = document.activeElement;
      if (event.type !== 'focusout' && isEditable(field)) {
        // Some browsers finish their own focus scrolling after the first frame.
        focusTimer = setTimeout(() => {
          if (document.activeElement === field) schedule(event);
        }, 120);
      }
    }
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('focusout', focusChanged);
    document.addEventListener('pointerdown', cancelSettling, true);
    document.addEventListener('touchmove', cancelSettling, { passive: true });
    document.addEventListener('wheel', cancelSettling, { passive: true });
    window.addEventListener('resize', focusChanged);
    viewport?.addEventListener('resize', focusChanged);
    viewport?.addEventListener('scroll', schedule);
    schedule({ type: 'mount' });
    return () => {
      cancelAnimationFrame(frame);
      cancelSettling();
      clearViewport();
      delete root.dataset.formShort;
      document.removeEventListener('focusin', focusChanged);
      document.removeEventListener('focusout', focusChanged);
      document.removeEventListener('pointerdown', cancelSettling, true);
      document.removeEventListener('touchmove', cancelSettling);
      document.removeEventListener('wheel', cancelSettling);
      window.removeEventListener('resize', focusChanged);
      viewport?.removeEventListener('resize', focusChanged);
      viewport?.removeEventListener('scroll', schedule);
    };
  }, []);
  return null;
}
