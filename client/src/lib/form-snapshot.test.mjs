import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formSnapshot } from './form-snapshot.mjs';

test('unchanged and reverted forms need no discard warning', () => {
  const initial = formSnapshot({ name: 'ศูนย์พักพิง', capacity: 100, phone: null });
  assert.equal(formSnapshot({ phone: '', capacity: '100', name: 'ศูนย์พักพิง' }), initial);
  assert.notEqual(formSnapshot({ name: 'แก้ชื่อ', capacity: 100 }), initial);
  assert.equal(formSnapshot({ name: 'ศูนย์พักพิง', capacity: 100, phone: null }), initial);
});

test('map changes, clearing a position, and checkbox changes are unsaved changes', () => {
  const form = { name: 'ศูนย์พักพิง', is_active: true };
  const initial = formSnapshot(form, { lat: 7, lng: 100 });
  assert.equal(formSnapshot(form, { lat: '7', lng: '100' }), initial);
  assert.notEqual(formSnapshot(form, { lat: 7.1, lng: 100 }), initial);
  assert.notEqual(formSnapshot(form), initial);
  assert.notEqual(formSnapshot({ ...form, is_active: false }, { lat: 7, lng: 100 }), initial);
});
