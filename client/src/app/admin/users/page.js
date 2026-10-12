'use client';

import { useState } from 'react';
import { Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/StaffShell';
import { Badge, Button, ErrorBanner, Field, Modal, Spinner, cx, inputClass } from '@/components/ui';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { ROLE_LABEL, useAuth } from '@/lib/auth';
import { formatDateTime, timeAgo } from '@/lib/format';

const ROLE_TONE = { admin: 'brand', command: 'safety', rescuer: 'shelter' };
const EMPTY = { username: '', full_name: '', phone: '', role: 'rescuer', team_name: '', password: '', is_active: true };

function validate(form, isNew) {
  const errors = {};
  if (isNew && !/^[a-z0-9_.-]{3,50}$/.test(form.username.trim().toLowerCase())) {
    errors.username = 'ใช้ a-z, 0-9, _ . - ความยาว 3–50 ตัว';
  }
  if (!form.full_name.trim()) errors.full_name = 'กรุณากรอกชื่อ-นามสกุล';
  if ((isNew || form.password) && form.password.length < 8) errors.password = 'อย่างน้อย 8 ตัวอักษร';
  return errors;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, refresh } = usePolling('/users', { interval: 60000 });
  const [roleFilter, setRoleFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // { id?, form }
  const [deleting, setDeleting] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const users = (data || []).filter(
    (u) =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (!q || [u.username, u.full_name, u.team_name, u.phone].some((v) => v?.toLowerCase().includes(q)))
  );

  function open(u) {
    setErrors({});
    setSaveError(null);
    setEditing(
      u
        ? { id: u.id, form: { ...EMPTY, ...u, phone: u.phone || '', team_name: u.team_name || '', password: '', is_active: Boolean(u.is_active) } }
        : { form: { ...EMPTY } }
    );
  }

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditing((ed) => ({ ...ed, form: { ...ed.form, [key]: value } }));
  };

  async function save(e) {
    e.preventDefault();
    const isNew = !editing.id;
    const errs = validate(editing.form, isNew);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const { username, full_name, phone, role, team_name, password, is_active } = editing.form;
    const body = isNew
      ? { username: username.trim().toLowerCase(), full_name, phone, role, team_name, password }
      : { full_name, phone, role, team_name, is_active, ...(password ? { password } : {}) };

    setSaving(true);
    setSaveError(null);
    try {
      await api(isNew ? '/users' : `/users/${editing.id}`, { method: isNew ? 'POST' : 'PATCH', body });
      setEditing(null);
      refresh();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setSaveError(null);
    try {
      await api(`/users/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      refresh();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  const f = editing?.form;
  const isSelf = editing?.id === me?.id;

  return (
    <>
      <PageHeader
        title="จัดการบัญชีผู้ใช้"
        desc="สร้างบัญชีให้หน่วยกู้ภัยและเจ้าหน้าที่ กำหนดสิทธิ์ ระงับ หรือรีเซ็ตรหัสผ่าน"
        actions={
          <Button variant="dark" onClick={() => open(null)}>
            <UserPlus className="size-4" aria-hidden />
            สร้างบัญชีใหม่
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="user-search" className="sr-only">
            ค้นหาบัญชี
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="user-search"
            type="search"
            className={cx(inputClass, 'pl-9')}
            placeholder="ค้นหาชื่อ ชื่อผู้ใช้ ทีม หรือเบอร์โทร"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist" aria-label="กรองตามบทบาท">
          {['all', 'rescuer', 'command', 'admin'].map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={roleFilter === r}
              onClick={() => setRoleFilter(r)}
              className={cx(
                'min-h-9 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-semibold',
                roleFilter === r ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'
              )}
            >
              {r === 'all' ? 'ทั้งหมด' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner error={error} onRetry={refresh} />
      {loading && <Spinner />}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อ / ชื่อผู้ใช้</th>
                <th className="px-4 py-3 font-medium">บทบาท</th>
                <th className="px-4 py-3 font-medium">ทีม / เบอร์โทร</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">ตำแหน่งล่าสุด</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    ไม่พบบัญชีที่ตรงกับการค้นหา
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {u.full_name} {u.id === me?.id && <span className="text-xs font-normal text-muted">(คุณ)</span>}
                    </p>
                    <p className="text-muted">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p>{u.team_name || '-'}</p>
                    <p className="tabular text-muted">{u.phone || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.is_active ? 'shelter' : 'muted'}>{u.is_active ? 'ใช้งาน' : 'ระงับ'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted" title={formatDateTime(u.location_updated_at)}>
                    {u.role === 'rescuer' ? (u.location_updated_at ? timeAgo(u.location_updated_at) : 'ยังไม่มาร์ค') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => open(u)} aria-label={`แก้ไข ${u.full_name}`}>
                        <Pencil className="size-4" aria-hidden />
                        แก้ไข
                      </Button>
                      {u.id !== me?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-dark hover:bg-brand-soft hover:text-brand-dark"
                          onClick={() => {
                            setSaveError(null);
                            setDeleting(u);
                          }}
                          aria-label={`ลบ ${u.full_name}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'แก้ไขบัญชี' : 'สร้างบัญชีใหม่'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button type="submit" form="user-form" variant="dark" loading={saving}>
              บันทึก
            </Button>
          </>
        }
      >
        {editing && (
          <form id="user-form" onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อผู้ใช้ (สำหรับ login)" required={!editing.id} error={errors.username} className="sm:col-span-2">
              {(p) => (
                <input
                  {...p}
                  className={inputClass}
                  value={f.username}
                  onChange={set('username')}
                  disabled={Boolean(editing.id)}
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="ชื่อ-นามสกุล" required error={errors.full_name} className="sm:col-span-2">
              {(p) => <input {...p} className={inputClass} value={f.full_name} onChange={set('full_name')} />}
            </Field>
            <Field label="บทบาท">
              {(p) => (
                <select {...p} className={inputClass} value={f.role} onChange={set('role')} disabled={isSelf}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="เบอร์โทร">
              {(p) => <input {...p} type="tel" className={inputClass} value={f.phone} onChange={set('phone')} />}
            </Field>
            <Field label="ชื่อทีม / หน่วยงาน" className="sm:col-span-2" hint="เช่น มูลนิธิกู้ภัยหาดใหญ่ ทีม A">
              {(p) => <input {...p} className={inputClass} value={f.team_name} onChange={set('team_name')} />}
            </Field>
            <Field
              label={editing.id ? 'รีเซ็ตรหัสผ่าน' : 'รหัสผ่าน'}
              required={!editing.id}
              error={errors.password}
              hint={editing.id ? 'เว้นว่างไว้หากไม่ต้องการเปลี่ยน' : 'อย่างน้อย 8 ตัวอักษร ส่งให้เจ้าของบัญชีทางช่องทางที่ปลอดภัย'}
              className="sm:col-span-2"
            >
              {(p) => (
                <input {...p} type="text" className={inputClass} value={f.password} onChange={set('password')} autoComplete="new-password" />
              )}
            </Field>
            {editing.id && !isSelf && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium sm:col-span-2">
                <input type="checkbox" className="size-5 accent-shelter" checked={f.is_active} onChange={set('is_active')} />
                เปิดใช้งานบัญชี (ยกเลิกเพื่อระงับการเข้าสู่ระบบ)
              </label>
            )}
            <div className="sm:col-span-2">
              <ErrorBanner error={saveError} />
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title="ลบบัญชี"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              ยกเลิก
            </Button>
            <Button variant="primary" loading={saving} onClick={remove}>
              ลบบัญชี
            </Button>
          </>
        }
      >
        <p>
          ลบบัญชี <b>{deleting?.full_name}</b> (@{deleting?.username}) ถาวร? เคสที่บัญชีนี้รับไว้จะกลับเข้าคิว
          หากต้องการหยุดใช้ชั่วคราว แนะนำให้ “ระงับ” แทน
        </p>
        <div className="mt-3">
          <ErrorBanner error={saveError} />
        </div>
      </Modal>
    </>
  );
}
