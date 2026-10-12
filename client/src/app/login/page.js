'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, LifeBuoy, LogIn } from 'lucide-react';
import { Button, ErrorBanner, Field, inputClass } from '@/components/ui';
import { ROLE_HOME, useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน URL หลัง mount (หน้าถูก prerender)
    setExpired(new URLSearchParams(window.location.search).has('expired'));
  }, []);

  useEffect(() => {
    if (ready && user) router.replace(ROLE_HOME[user.role] || '/');
  }, [ready, user, router]);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const u = await login(username.trim(), password);
      router.replace(ROLE_HOME[u.role] || '/');
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-ink px-4 py-6">
      <Link
        href="/"
        className="flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-slate-300 hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        กลับหน้าแผนที่
      </Link>

      <div className="m-auto w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center text-white">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand">
            <LifeBuoy className="size-7" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold">เข้าสู่ระบบเจ้าหน้าที่</h1>
            <p className="text-sm text-slate-300">อาสากู้ภัย · ศูนย์บัญชาการ · ผู้ดูแลระบบ</p>
          </div>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-xl">
          {expired && !error && (
            <p className="rounded-xl bg-warn-soft p-3 text-sm text-ink">เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง</p>
          )}
          <Field label="ชื่อผู้ใช้">
            {(p) => (
              <input
                {...p}
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Field>
          <Field label="รหัสผ่าน">
            {(p) => (
              <div className="relative">
                <input
                  {...p}
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted hover:text-ink"
                >
                  {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              </div>
            )}
          </Field>
          <ErrorBanner error={error} />
          <Button type="submit" variant="dark" size="lg" loading={loading}>
            {!loading && <LogIn className="size-5" aria-hidden />}
            เข้าสู่ระบบ
          </Button>
          <p className="text-center text-sm text-muted">ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบเพื่อขอสร้างบัญชี</p>
        </form>
      </div>
    </main>
  );
}
