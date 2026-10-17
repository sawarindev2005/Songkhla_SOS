'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { POLL_MS } from './usePolling';

// ดึงสถานะล่าสุดของเคสที่เครื่องนี้แจ้งไว้ทุกเคสพร้อมกัน ทุก 15 วินาที (หยุดเมื่อแท็บถูกซ่อน)
// คืน { cases: ข้อมูลจาก /requests/track/:caseNo ตามลำดับเลขเคส (เคสที่ดึงไม่ได้ข้ามไป), loading }
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
      setCases(results.filter((r) => r.status === 'fulfilled').map((r) => r.value));
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
