'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timer = useRef(undefined);
  const show = useCallback((m, ms = 2600) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), ms);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 top-3 z-[900] flex justify-center">
        {message && <p className="max-w-md flex-1 rounded-lg bg-ink px-3.5 py-3 font-medium text-white shadow-float">{message}</p>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
