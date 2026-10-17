// เคสตัวอย่าง 1 เคสสำหรับส่วน "เคสที่ฉันแจ้ง" — ใช้เมื่อเครื่องนี้ยังไม่เคยแจ้งเคส (ไว้สาธิต ไม่มีป้ายกำกับ)
// เคสนี้ไม่มีอยู่จริงในฐานข้อมูล: แถวจึงไม่ลิงก์ไปหน้าติดตามเคส ถ้าจะใช้งานจริงควรเอาออก
// รูปแบบเดียวกับผลของ GET /requests/track/:caseNo  id ติดลบเพื่อไม่ชนกับเคสจริง
// สร้างตอนเรียกใช้ (หลัง mount) เวลา "แจ้งเมื่อ" จึงนับจากตอนเปิดหน้า

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

export function sampleMyCases() {
  return [
    {
      id: -1,
      case_no: 'HY-00012',
      people_count: 3,
      has_elderly: 1,
      has_children: 0,
      has_disabled: 0,
      has_patient: 0,
      urgency: 'high',
      description: 'น้ำท่วมถึงเอว มีผู้สูงอายุเดินไม่สะดวก',
      address_note: 'ซอยนิพัทธ์อุทิศ 3',
      lat: 7.0102,
      lng: 100.4688,
      status: 'pending',
      created_at: minutesAgo(35),
      rescuer_team: null,
    },
  ];
}
