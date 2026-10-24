'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export const POLL_MS = 15000;

const EMPTY = { path: null, data: null, error: null, updatedAt: null };

// ดึงข้อมูลจาก API ซ้ำทุก 15 วินาที (หยุดเมื่อแท็บถูกซ่อน)
export function usePolling(path, { interval = POLL_MS, enabled = true } = {}) {
  const active = Boolean(path && enabled);
  // ผลลัพธ์ผูกกับ path ที่ขอ เปลี่ยน path แล้ว (เช่นค้นเลขเคสใหม่) จะไม่แสดงข้อมูลของ path เดิมค้าง
  const [result, setResult] = useState(EMPTY);
  const inFlightRef = useRef(null);

  const load = useCallback(
    async ({ restart }) => {
      if (!active) return;
      if (inFlightRef.current) {
        // รอบตามเวลา: รอบก่อนยังโหลดไม่เสร็จ (เน็ตช้า) ปล่อยให้โหลดต่อ ถ้ายกเลิกแล้วเริ่มใหม่ทุกรอบ ข้อมูลจะไม่มาเลย
        if (!restart) return;
        inFlightRef.current.abort();
      }
      const controller = new AbortController();
      inFlightRef.current = controller;
      try {
        const data = await api(path, { signal: controller.signal });
        setResult({ path, data, error: null, updatedAt: new Date() });
      } catch (err) {
        if (err.name !== 'AbortError') {
          // โหลดซ้ำไม่สำเร็จ: เก็บข้อมูลล่าสุดของ path เดิมไว้ แล้วแจ้ง error
          setResult((prev) => (prev.path === path ? { ...prev, error: err } : { ...EMPTY, path, error: err }));
        }
      } finally {
        if (inFlightRef.current === controller) inFlightRef.current = null;
      }
    },
    [active, path]
  );

  // เรียกเองหลังแก้ข้อมูล: ต้องได้ข้อมูลใหม่ จึงยกเลิกรอบที่ค้างอยู่แล้วโหลดใหม่
  const refresh = useCallback(() => load({ restart: true }), [load]);

  useEffect(() => {
    if (!active) return;
    load({ restart: true });
    const tick = () => document.visibilityState === 'visible' && load({ restart: false });
    const id = setInterval(tick, interval);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [active, interval, load]);

  const current = result.path === path;
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: active && !current,
    updatedAt: current ? result.updatedAt : null,
    refresh,
  };
}
