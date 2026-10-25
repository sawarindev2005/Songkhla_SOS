import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePlaceForm } from './place-validation.mjs';

const position = { lat: 7.0086, lng: 100.4747 };
const valid = { name: 'ที่พักทดสอบ', capacity: '200', current_occupancy: '76' };

test('shelter counts accept zero and whole people, including numeric API values', () => {
  for (const value of [0, '0', 200, '200', 2147483647]) {
    assert.deepEqual(validatePlaceForm('shelter', { ...valid, capacity: value, current_occupancy: value }, position), {});
  }
});

test('shelter counts reject negative, fractional, missing, and out-of-range values', () => {
  for (const value of [-10, '-10', 1.5, '1.5', '', '  ', undefined, null, NaN, Infinity, 'abc', 2147483648]) {
    const errors = validatePlaceForm('shelter', { ...valid, capacity: value, current_occupancy: value }, position);
    assert.ok(errors.capacity, `capacity must reject ${String(value)}`);
    assert.ok(errors.current_occupancy, `occupancy must reject ${String(value)}`);
  }
});

test('name and map validation remain in place; distribution has no shelter count requirement', () => {
  assert.deepEqual(Object.keys(validatePlaceForm('shelter', { ...valid, name: ' ' }, null)), ['name', 'position']);
  assert.deepEqual(validatePlaceForm('distribution', { name: 'จุดแจกทดสอบ' }, position), {});
});
