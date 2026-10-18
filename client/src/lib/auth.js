'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

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
    // token อยู่ในคุกกี้ HttpOnly ที่ JavaScript อ่านไม่ได้ จึงถาม server ว่ายังล็อกอินอยู่ไหม
    let cancelled = false;
    api('/auth/me', { redirectOn401: false })
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const { user } = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
      redirectOn401: false,
    });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    // ให้ server ลบคุกกี้ (JavaScript ลบคุกกี้ HttpOnly เองไม่ได้)
    await api('/auth/logout', { method: 'POST', redirectOn401: false }).catch(() => {});
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => ({ ...prev, ...patch }));
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
