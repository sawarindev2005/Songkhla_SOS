'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { POLL_MS } from './usePolling';

// ดึงสถานะล่าสุดของเคสที่เครื่องนี้แจ้งไว้ทุกเคสพร้อมกัน ทุก 15 วินาที (หยุดเมื่อแท็บถูกซ่อน)
// คืน { cases: ข้อมูลจาก /requests/track/:caseNo ตามลำดับเลขเคส, loading }
// เคสที่รอบนี้ดึงไม่ได้ (เน็ตหลุด) ใช้ข้อมูลรอบก่อนแทน การ์ด "เคสที่ฉันแจ้ง" จึงไม่หายตอนเน็ตไม่ดี
// เคสที่ยังไม่เคยดึงได้เลยจะยังไม่แสดง
export function useMyCases(caseNos) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(caseNos.length > 0);
  const key = caseNos.join(',');

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (list.length === 0) return;
    let alive = true;
    const load = async () => {
      const results = await Promise.allSettled(list.map((no) => api(`/requests/track/${no}`)));
      if (!alive) return;
      setCases((prev) => {
        const last = new Map(prev.map((c) => [c.case_no, c]));
        return results
          .map((r, i) => (r.status === 'fulfilled' ? r.value : last.get(list[i])))
          .filter(Boolean);
      });
      setLoading(false);
    };
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [key]);

  return { cases: key ? cases : [], loading: key ? loading : false };
}
