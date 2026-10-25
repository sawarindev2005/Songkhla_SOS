// Compare editable values, treating numeric inputs like their initial API numbers.
export function formSnapshot(form, position = null) {
  return JSON.stringify([
    Object.keys(form).sort().map((key) => [key, String(form[key] ?? '')]),
    position ? [String(position.lat), String(position.lng)] : null,
  ]);
}
