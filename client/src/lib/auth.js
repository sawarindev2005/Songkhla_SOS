'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession, getStoredUser, getToken, saveSession } from './api';

export const ROLE_HOME = {
  rescuer: '/rescuer',
  command: '/command',
  admin: '/admin',
};

export const ROLE_LABEL = {
  rescuer: 'อาสาสมัคร/กู้ภัย',
  command: 'เจ้าหน้าที่ศูนย์บัญชาการ',
  admin: 'ผู้ดูแลระบบ',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // อ่าน session จาก localStorage หลัง mount (ไม่มีบน server)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session อยู่ใน localStorage อ่านได้หลัง mount เท่านั้น
    setUser(getToken() ? getStoredUser() : null);
    setReady(true);
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, user } = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    saveSession(token, user);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      saveSession(getToken(), next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// กันหน้าเฉพาะ role ฝั่ง client (สิทธิ์จริงตรวจที่ server ทุก request)
export function useRequireRole(roles) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const allowed = ready && user && roles.includes(user.role);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (!roles.includes(user.role)) router.replace(ROLE_HOME[user.role] || '/');
  }, [ready, user, roles, router]);

  return { user, allowed };
}
