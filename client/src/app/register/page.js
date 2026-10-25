'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/pk/Button';
import { Checkbox } from '@/components/pk/Checkbox';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Field, inputClass } from '@/components/pk/Field';
import { Stepper } from '@/components/pk/Stepper';
import {
  ArrowLeftIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, LifebuoyIcon, SignInIcon, UserPlusIcon,
} from '@/components/pk/icons';
import { api } from '@/lib/api';
import { EQUIPMENT } from '@/lib/format';

const EMPTY = {
  username: '',
  password: '',
  confirm: '',
  full_name: '',
  phone: '',
  team_name: '',
  team_size: 1,
  equipment: [],
  service_area: '',
};

// ตรงกับที่ server ตรวจใน routes/applications.js
function validate(form) {
  const errors = {};
  if (!/^[a-z0-9_.-]{3,50}$/.test(form.username.trim().toLowerCase())) {
    errors.username = 'ใช้ a-z, 0-9, _ . - ความยาว 3–50 ตัว';
  }
  if (form.password.length < 8) errors.password = 'อย่างน้อย 8 ตัวอักษร';
  else if (form.confirm !== form.password) errors.confirm = 'รหัสผ่านไม่ตรงกัน';
  if (!form.full_name.trim()) errors.full_name = 'กรุณากรอกชื่อ-นามสกุล';
  const digits = form.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 10) errors.phone = 'กรอกเบอร์โทร 9–10 หลัก เช่น 0812345678';
  if (!form.team_name.trim()) errors.team_name = 'กรุณากรอกชื่อทีมหรือหน่วยงาน';
  return errors;
}

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const setValue = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const set = (key) => (e) => setValue(key, e.target.value);
  const toggleEquipment = (key) => (checked) =>
    setValue('equipment', checked ? [...form.equipment, key] : form.equipment.filter((k) => k !== key));

  async function submit(e) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { confirm, ...body } = form;
      const username = form.username.trim().toLowerCase();
      await api('/applications', {
        method: 'POST',
        body: { ...body, username, phone: form.phone.replace(/\D/g, '') },
      });
      setDone(username);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-s1 px-4 py-6">
      <Link
        href="/login"
        className="flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-base font-semibold text-t2 hover:bg-s2 hover:text-ink"
      >
        <ArrowLeftIcon size={18} aria-hidden />
        กลับหน้าเข้าสู่ระบบ
      </Link>

      <div className="m-auto w-full max-w-lg py-6">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LifebuoyIcon size={48} weight="fill" className="text-red" aria-hidden />
          <div>
            <h1 className="text-6xl font-bold">สมัครเป็นอาสากู้ภัย</h1>
            <p className="text-base text-t2">ศูนย์บัญชาการจะตรวจสอบและอนุมัติก่อน จึงจะเข้าสู่ระบบได้</p>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-white p-6 text-center">
            <CheckCircleIcon size={48} weight="fill" className="text-ok" aria-hidden />
            <div className="flex flex-col gap-1" role="status">
              <h2 className="text-3xl font-bold">ส่งใบสมัครแล้ว</h2>
              <p className="text-base text-t2">
                รอศูนย์บัญชาการอนุมัติ อาจมีเจ้าหน้าที่โทรไปยืนยันตัวตน เมื่ออนุมัติแล้วเข้าสู่ระบบด้วยชื่อผู้ใช้{' '}
                <b className="text-ink">{done}</b> และรหัสผ่านที่ตั้งไว้
              </p>
            </div>
            <Button href="/login" icon={<SignInIcon size={20} weight="bold" aria-hidden />}>
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
            <Field label="ชื่อผู้ใช้ (สำหรับ login)" required error={errors.username} hint="a-z, 0-9, _ . - ความยาว 3–50 ตัว" className="sm:col-span-2">
              {(p) => (
                <input
                  {...p}
                  className={inputClass}
                  value={form.username}
                  onChange={set('username')}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              )}
            </Field>
            <Field label="รหัสผ่าน" required error={errors.password} hint="อย่างน้อย 8 ตัวอักษร">
              {(p) => (
                <div className="relative">
                  <input
                    {...p}
                    type={showPassword ? 'text' : 'password'}
                    className={`${inputClass} pr-12`}
                    value={form.password}
                    onChange={set('password')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-t2 hover:text-ink"
                  >
                    {showPassword ? <EyeSlashIcon size={20} aria-hidden /> : <EyeIcon size={20} aria-hidden />}
                  </button>
                </div>
              )}
            </Field>
            <Field label="ยืนยันรหัสผ่าน" required error={errors.confirm}>
              {(p) => (
                <input
                  {...p}
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass}
                  value={form.confirm}
                  onChange={set('confirm')}
                  autoComplete="new-password"
                />
              )}
            </Field>
            <Field label="ชื่อ-นามสกุล" required error={errors.full_name} className="sm:col-span-2">
              {(p) => <input {...p} className={inputClass} value={form.full_name} onChange={set('full_name')} autoComplete="name" />}
            </Field>
            <Field label="เบอร์โทร" required error={errors.phone} hint="ศูนย์บัญชาการใช้ติดต่อยืนยันตัวตน">
              {(p) => (
                <input
                  {...p}
                  type="tel"
                  inputMode="tel"
                  className={`${inputClass} tabular-nums`}
                  value={form.phone}
                  onChange={set('phone')}
                  autoComplete="tel"
                  placeholder="08x-xxx-xxxx"
                />
              )}
            </Field>
            <Field label="ชื่อทีม / หน่วยงาน" required error={errors.team_name} hint="เช่น มูลนิธิกู้ภัยหาดใหญ่ ทีม A">
              {(p) => <input {...p} className={inputClass} value={form.team_name} onChange={set('team_name')} />}
            </Field>
            <div className="flex flex-col gap-1.5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-base font-medium">จำนวนสมาชิกในทีม</span>
              <Stepper label="จำนวนสมาชิก" unit="คน" min={1} max={999} value={form.team_size} onChange={(v) => setValue('team_size', v)} />
            </div>
            <fieldset className="flex flex-col gap-1 sm:col-span-2">
              <legend className="mb-1 text-base font-medium">อุปกรณ์ที่มี (เลือกได้หลายข้อ)</legend>
              <div className="grid grid-cols-2 gap-x-3">
                {EQUIPMENT.map((eq) => (
                  <Checkbox
                    key={eq.key}
                    checked={form.equipment.includes(eq.key)}
                    onChange={toggleEquipment(eq.key)}
                    className="min-h-11 text-md font-medium"
                  >
                    {eq.label}
                  </Checkbox>
                ))}
              </div>
            </fieldset>
            <Field label="พื้นที่ที่รับผิดชอบ" hint="เช่น เทศบาลนครหาดใหญ่, ต.คลองแห" className="sm:col-span-2">
              {(p) => <input {...p} className={inputClass} value={form.service_area} onChange={set('service_area')} maxLength={255} />}
            </Field>
            <div className="sm:col-span-2">
              <ErrorBanner error={error} />
            </div>
            <Button type="submit" loading={loading} className="sm:col-span-2" icon={<UserPlusIcon size={20} weight="bold" aria-hidden />}>
              ส่งใบสมัคร
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
