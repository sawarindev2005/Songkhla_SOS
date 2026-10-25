export function validatePlaceForm(type, form, position) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'กรุณากรอกชื่อ';
  if (!position) errors.position = 'กรุณาคลิกบนแผนที่เพื่อเลือกตำแหน่ง';
  if (type === 'shelter') {
    for (const key of ['capacity', 'current_occupancy']) {
      const value = form[key];
      const number = Number(value);
      // Match the signed INT columns without silently truncating or clamping people.
      if (value == null || String(value).trim() === '' || !Number.isInteger(number) || number < 0 || number > 2147483647) {
        errors[key] = number > 2147483647 ? 'จำนวนคนเกินขีดจำกัดของระบบ' : 'กรอกจำนวนเต็มตั้งแต่ 0 ขึ้นไป';
      }
    }
  }
  return errors;
}
