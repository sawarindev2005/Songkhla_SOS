'use client';

import { useEffect, useState } from 'react';
import { dismissCase, getDismissedCases, getMyCases } from '@/lib/format';
import { useMyCases } from './useMyCases';

// เคสของฉันที่ยังควรแสดง: ยังไม่จบ (รอ / มอบหมายทีม / กำลังช่วย) ก่อน เรียงล่าสุดก่อน
// จบแล้ว (ช่วยเหลือแล้ว / ยกเลิก) แสดงต่ออีก 24 ชม. นับจาก resolved_at แล้วซ่อน ไม่ให้การ์ดค้างตลอดไป
const ACTIVE_STATUS = ['pending', 'assigned', 'in_progress'];
const FINISHED_VISIBLE_MS = 24 * 60 * 60 * 1000;
const finishedAt = (c) => new Date(c.resolved_at || c.updated_at || c.created_at).getTime();

function visibleCases(cases, now, dismissed) {
  const active = cases.filter((c) => ACTIVE_STATUS.includes(c.status));
  const finished = cases.filter((c) =>
    ['rescued', 'cancelled'].includes(c.status) && !dismissed.includes(c.case_no) && now - finishedAt(c) < FINISHED_VISIBLE_MS
  );
  active.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  finished.sort((a, b) => finishedAt(b) - finishedAt(a));
  return [...active, ...finished];
}

/**
 * เคสที่เครื่องนี้แจ้งไว้ (จาก localStorage) พร้อมสถานะล่าสุด ใช้กับการ์ดลอย "เคสที่ฉันแจ้ง" ทุกหน้า
 * now = เวลาของรอบดึงข้อมูลล่าสุดของหน้า (ms) ใช้นับ 24 ชม. — 0 = ยังโหลดไม่เสร็จ ยังไม่ซ่อนเคสที่จบแล้ว
 */
export function useVisibleMyCases(now) {
  const [{ caseNos, dismissed }, setSaved] = useState({ caseNos: [], dismissed: [] });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage อ่านได้หลัง mount เท่านั้น (หน้าถูก prerender)
    setSaved({ caseNos: getMyCases(), dismissed: getDismissedCases() });
  }, []);

  const live = useMyCases(caseNos);

  function dismiss(caseNo) {
    dismissCase(caseNo);
    setSaved((prev) => ({ ...prev, dismissed: [...new Set([...prev.dismissed, caseNo])] }));
  }

  return { cases: visibleCases(live.cases, now, dismissed), dismiss };
}
