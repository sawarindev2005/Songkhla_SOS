import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formViewportState, isEditable, revealDelta, revealField } from './form-viewport.mjs';

test('keyboard resizing never raises the public shell bottom', () => {
  for (const layoutHeight of [844, 360]) {
    const state = formViewportState({ width: 390, layoutHeight, visualHeight: 360, baselineHeight: 844, editing: true });
    assert.equal(state.keyboard, true);
    assert.equal(state.shellHeight, 844);
  }
});

test('keyboard dismissal waits for restored height; desktop and zoom keep native layout', () => {
  assert.equal(formViewportState({ width: 390, layoutHeight: 360, visualHeight: 360, baselineHeight: 844, editing: false, wasOpen: true }).shellHeight, 844);
  assert.equal(formViewportState({ width: 390, layoutHeight: 844, visualHeight: 844, baselineHeight: 844, editing: false, wasOpen: true }).keyboard, false);
  for (const options of [{ width: 1440, scale: 1 }, { width: 390, scale: 2 }]) {
    assert.equal(formViewportState({ ...options, layoutHeight: 844, visualHeight: 360, baselineHeight: 844, editing: true }).keyboard, false);
  }
});

test('fields above/below a keyboard move only as far as needed', () => {
  assert.equal(revealDelta({ top: 400, bottom: 444, height: 44 }, 12, 300), 144);
  assert.equal(revealDelta({ top: 4, bottom: 48, height: 44 }, 12, 300), -8);
  assert.equal(revealDelta({ top: 100, bottom: 144, height: 44 }, 12, 300), 0);
  assert.equal(revealDelta({ top: 40, bottom: 440, height: 400 }, 12, 300), 28);
  assert.equal(revealDelta({ top: 40, bottom: 84, height: 44 }, 100, 50), 0);
});

test('all form input kinds are covered without moving checkbox/button focus', () => {
  for (const type of ['text', 'search', 'tel', 'password', 'number', 'time']) {
    assert.equal(isEditable({ tagName: 'INPUT', type }), true);
  }
  for (const tagName of ['TEXTAREA', 'SELECT']) assert.equal(isEditable({ tagName }), true);
  for (const type of ['checkbox', 'radio', 'submit', 'file']) assert.equal(isEditable({ tagName: 'INPUT', type }), false);
  assert.equal(isEditable({ tagName: 'INPUT', type: 'text', readOnly: true }), false);
  assert.equal(isEditable(null), false);
});

test('a modal field scrolls its body above the keyboard without scrolling the inert page', () => {
  let fieldTop = 600;
  const root = {};
  const body = {
    parentElement: root, clientTop: 0, clientHeight: 250, scrollHeight: 800,
    getBoundingClientRect: () => ({ top: 80 }),
    scrollBy: ({ top }) => { fieldTop -= top; },
  };
  const field = {
    parentElement: body, ownerDocument: { scrollingElement: root },
    getBoundingClientRect: () => ({ top: fieldTop, bottom: fieldTop + 44, height: 44 }),
    closest: (selector) => selector === 'dialog[open]' ? {} : null,
  };
  revealField(field, { height: 400, offsetTop: 0 }, {
    getComputedStyle: () => ({ overflowY: 'auto' }),
    scrollBy: () => assert.fail('must not scroll behind the modal'),
  });
  assert.equal(fieldTop + 44, 326);
});

test('visual viewport offset and a protruding bottom control bound document scrolling', () => {
  let moved = 0;
  const root = {};
  const field = {
    parentElement: root,
    ownerDocument: {
      scrollingElement: root,
      querySelectorAll: () => [{ getBoundingClientRect: () => ({ top: 390, bottom: 454, left: 120, right: 184, width: 64, height: 64 }) }],
    },
    getBoundingClientRect: () => ({ top: 500, bottom: 544, height: 44, left: 20, right: 300 }),
    closest: () => null,
  };
  revealField(field, { height: 400, offsetTop: 80 }, {
    scrollBy: ({ top }) => { moved = top; },
  });
  assert.equal(moved, 162); // bottom 544 -> 8px above the overlay at 390
});

test('public form focus scrolls only its body so navigation stays stationary', () => {
  let fieldTop = 500;
  const root = {};
  const body = {
    parentElement: root, clientTop: 0, clientHeight: 292, scrollHeight: 900,
    getBoundingClientRect: () => ({ top: 56 }),
    scrollBy: ({ top }) => { fieldTop -= top; },
  };
  const field = {
    parentElement: body, ownerDocument: { scrollingElement: root },
    getBoundingClientRect: () => ({ top: fieldTop, bottom: fieldTop + 44, height: 44 }),
    closest: (selector) => selector === '[data-form-main]' ? {} : null,
  };
  revealField(field, { height: 360, offsetTop: 0 }, {
    getComputedStyle: () => ({ overflowY: 'auto' }),
    scrollBy: () => assert.fail('must not move the document/navbar'),
  });
  assert.equal(fieldTop + 44, 344);
});

test('a visible field keeps its label without moving the document unnecessarily', () => {
  let moved;
  const root = {};
  const field = {
    parentElement: root, ownerDocument: { scrollingElement: root },
    labels: [{ getBoundingClientRect: () => ({ top: 90 }) }],
    getBoundingClientRect: () => ({ top: 120, bottom: 164, height: 44 }),
    closest: () => null,
  };
  revealField(field, { height: 400, offsetTop: 80 }, { scrollBy: ({ top }) => { moved = top; } });
  assert.equal(moved, -2); // 12px clearance includes the label at the viewport's upper edge
});
