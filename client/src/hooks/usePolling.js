'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export const POLL_MS = 15000;

// ดึงข้อมูลจาก API ซ้ำทุก 15 วินาที (หยุดเมื่อแท็บถูกซ่อน)
export function usePolling(path, { interval = POLL_MS, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(path && enabled));
  const [updatedAt, setUpdatedAt] = useState(null);
  const controllerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!path || !enabled) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await api(path, { signal: controller.signal });
      setData(result);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    if (!path || !enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() ตั้ง state หลัง await เท่านั้น
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, interval);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      controllerRef.current?.abort();
    };
  }, [path, enabled, interval, refresh]);

  return { data, error, loading, updatedAt, refresh, setData };
}
