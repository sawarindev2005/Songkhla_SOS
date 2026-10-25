import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusFirstInvalid } from './focus-invalid.mjs';

function fixture() {
  let top = -150;
  let focused = false;
  const root = {};
  const body = {
    parentElement: root, clientTop: 0, clientHeight: 280, scrollHeight: 900,
    getBoundingClientRect: () => ({ top: 100 }),
    scrollBy: ({ top: delta }) => { top -= delta; },
  };
  const control = {
    ownerDocument: { scrollingElement: root }, parentElement: body,
    matches: (selector) => selector !== ':disabled',
    getClientRects: () => [{}],
    getBoundingClientRect: () => ({ top, bottom: top + 44, height: 44 }),
    closest: (selector) => selector === 'dialog[open]' ? {} : null,
    focus: (options) => { assert.equal(options.preventScroll, true); focused = true; },
  };
  const win = {
    visualViewport: { height: 400, offsetTop: 0 },
    getComputedStyle: () => ({ overflowY: 'auto' }),
    scrollBy: () => assert.fail('the background must stay still'),
  };
  return { control, win, top: () => top, focused: () => focused };
}

test('first invalid field above a scrolled modal is focused and revealed', () => {
  const f = fixture();
  const later = { matches: () => assert.fail('must stop at the first error') };
  assert.equal(focusFirstInvalid({ querySelectorAll: () => [f.control, later] }, f.win), true);
  assert.equal(f.focused(), true);
  assert.equal(f.top(), 104);
});

test('hidden and fieldset-disabled errors do not steal validation focus', () => {
  const f = fixture();
  const disabled = { matches: () => true };
  const hidden = { matches: (s) => s !== ':disabled', getClientRects: () => [] };
  assert.equal(focusFirstInvalid({ querySelectorAll: () => [disabled, hidden, f.control] }, f.win), true);
  assert.equal(f.focused(), true);
});

test('custom map targets and controls inside an error wrapper are supported', () => {
  for (const wrapped of [false, true]) {
    const f = fixture();
    const invalid = wrapped ? { matches: () => false, querySelector: () => f.control } : f.control;
    assert.equal(focusFirstInvalid({ querySelectorAll: () => [invalid] }, f.win), true);
    assert.equal(f.focused(), true);
  }
});

test('a valid or missing form leaves focus unchanged', () => {
  assert.equal(focusFirstInvalid(null), false);
  assert.equal(focusFirstInvalid({ querySelectorAll: () => [] }, {}), false);
});
