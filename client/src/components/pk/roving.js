export function nextValue(values, current, key) {
  if (!values.length) return null;
  const i = values.indexOf(current);
  if (i < 0) return ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key) ? values[0] : null;
  if (key === 'ArrowRight' || key === 'ArrowDown') return values[(i + 1) % values.length];
  if (key === 'ArrowLeft' || key === 'ArrowUp') return values[(i - 1 + values.length) % values.length];
  if (key === 'Home') return values[0];
  if (key === 'End') return values[values.length - 1];
  return null;
}
