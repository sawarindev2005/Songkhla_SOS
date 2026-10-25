'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/StaffShell';
import { Badge } from '@/components/pk/Badge';
import { Button } from '@/components/pk/Button';
import { Checkbox } from '@/components/pk/Checkbox';
import { ConfirmDialog } from '@/components/pk/ConfirmDialog';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Field, inputClass } from '@/components/pk/Field';
import { Modal } from '@/components/pk/Modal';
import { Segmented } from '@/components/pk/Segmented';
import { Spinner } from '@/components/pk/Spinner';
import { SearchField } from '@/components/pk/TextField';
import {
  CheckCircleIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon, UserPlusIcon, XCircleIcon,
} from '@/components/pk/icons';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { ROLE_LABEL, useAuth } from '@/lib/auth';
import { EQUIPMENT, equipmentLabel, formatDateTime, timeAgo } from '@/lib/format';

const EMPTY = {
  username: '', full_name: '', phone: '', role: 'rescuer', team_name: '', password: '', is_active: true,
  team_size: '', equipment: [], service_area: '',
};

// "ทีม" ในรายการ: ชื่อทีม + จำนวนสมาชิก
const teamText = (u) => [u.team_name, u.team_size && `${u.team_size} คน`].filter(Boolean).join(' · ') || '-';

function validate(form, isNew) {
  const errors = {};
  if (isNew && !/^[a-z0-9_.-]{3,50}$/.test(form.username.trim().toLowerCase())) {
    errors.username = 'ใช้ a-z, 0-9, _ . - ความยาว 3–50 ตัว';
  }
  if (!form.full_name.trim()) errors.full_name = 'กรุณากรอกชื่อ-นามสกุล';
  if ((isNew || form.password) && form.password.length < 8) errors.password = 'อย่างน้อย 8 ตัวอักษร';
  const size = Number(form.team_size);
  if (form.team_size !== '' && (!Number.isInteger(size) || size < 1 || size > 999)) errors.team_size = '1–999 คน';
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
        ? {
            id: u.id,
            form: {
              ...EMPTY, ...u, phone: u.phone || '', team_name: u.team_name || '', password: '', is_active: Boolean(u.is_active),
              team_size: u.team_size ?? '', equipment: u.equipment ? u.equipment.split(',') : [], service_area: u.service_area || '',
            },
          }
        : { form: { ...EMPTY } }
    );
  }

  const setValue = (key, value) => setEditing((ed) => ({ ...ed, form: { ...ed.form, [key]: value } }));
  const set = (key) => (e) => setValue(key, e.target.value);

  async function save(e) {
    e.preventDefault();
    const isNew = !editing.id;
    const errs = validate(editing.form, isNew);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const { username, full_name, phone, role, team_name, password, is_active, team_size, equipment, service_area } = editing.form;
    // ข้อมูลทีมใช้เฉพาะกู้ภัย บทบาทอื่นล้างทิ้ง
    const rescuer = role === 'rescuer'
      ? { team_size, equipment, service_area }
      : { team_size: '', equipment: [], service_area: '' };
    const body = isNew
      ? { username: username.trim().toLowerCase(), full_name, phone, role, team_name, password, ...rescuer }
      : { full_name, phone, role, team_name, is_active, ...rescuer, ...(password ? { password } : {}) };

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
          <Button size="sm" block={false} onClick={() => open(null)} icon={<UserPlusIcon size={18} weight="bold" aria-hidden />}>
            สร้างบัญชีใหม่
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex-1">
          <SearchField
            label="ค้นหาบัญชี"
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาชื่อ ชื่อผู้ใช้ ทีม หรือเบอร์โทร"
            icon={<MagnifyingGlassIcon size={18} className="shrink-0 text-t3" aria-hidden />}
          />
        </div>
        <div className="overflow-x-auto xl:w-[42rem] [&_button]:whitespace-nowrap [&_button]:px-3">
          <Segmented
            label="กรองตามบทบาท"
            value={roleFilter}
            onChange={setRoleFilter}
            options={['all', 'rescuer', 'command', 'admin'].map((r) => ({
              value: r,
              label: r === 'all' ? 'ทั้งหมด' : ROLE_LABEL[r],
            }))}
          />
        </div>
      </div>

      <ErrorBanner error={error} onRetry={refresh} />
      {loading && <Spinner />}

      {data && (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {users.length === 0 && (
              <li className="rounded-xl border border-line bg-white px-4 py-8 text-center text-t2">
                ไม่พบบัญชีที่ตรงกับการค้นหา
              </li>
            )}
            {users.map((u) => (
              <li key={u.id} className="min-w-0 rounded-xl border border-line bg-white p-4 text-base break-words">
                <p className="font-semibold">
                  {u.full_name} {u.id === me?.id && <span className="text-xs font-normal text-t2">(คุณ)</span>}
                </p>
                <p className="text-t2">@{u.username}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge boxed>{ROLE_LABEL[u.role]}</Badge>
                  <Badge
                    tone={u.is_active ? 'ok' : 'gray'}
                    icon={u.is_active ? (
                      <CheckCircleIcon size={15} weight="bold" aria-hidden />
                    ) : (
                      <XCircleIcon size={15} weight="bold" aria-hidden />
                    )}
                  >
                    {u.is_active ? 'ใช้งาน' : 'ระงับ'}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                  <dt className="text-t2">ทีม</dt>
                  <dd>{teamText(u)}</dd>
                  {u.role === 'rescuer' && (
                    <>
                      <dt className="text-t2">อุปกรณ์</dt>
                      <dd>{equipmentLabel(u.equipment) || '-'}</dd>
                      <dt className="text-t2">พื้นที่</dt>
                      <dd>{u.service_area || '-'}</dd>
                    </>
                  )}
                  <dt className="text-t2">เบอร์โทร</dt>
                  <dd className="tabular-nums">{u.phone || '-'}</dd>
                  <dt className="text-t2">ตำแหน่งล่าสุด</dt>
                  <dd title={formatDateTime(u.location_updated_at)}>
                    {u.role === 'rescuer' ? (u.location_updated_at ? timeAgo(u.location_updated_at) : 'ยังไม่มาร์ค') : '-'}
                  </dd>
                </dl>
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    block={false}
                    onClick={() => open(u)}
                    aria-label={`แก้ไข ${u.full_name}`}
                    icon={<PencilSimpleIcon size={18} aria-hidden />}
                  >
                    แก้ไข
                  </Button>
                  {u.id !== me?.id && (
                    <Button
                      size="sm"
                      variant="dangerOutline"
                      block={false}
                      onClick={() => {
                        setSaveError(null);
                        setDeleting(u);
                      }}
                      aria-label={`ลบ ${u.full_name}`}
                      icon={<TrashIcon size={18} aria-hidden />}
                    >
                      ลบ
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
            <table className="w-full min-w-[760px] text-left text-base">
              <thead className="bg-s1 text-t2">
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
                    <td colSpan={6} className="px-4 py-8 text-center text-t2">
                      ไม่พบบัญชีที่ตรงกับการค้นหา
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {u.full_name} {u.id === me?.id && <span className="text-xs font-normal text-t2">(คุณ)</span>}
                      </p>
                      <p className="text-t2">@{u.username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge boxed>{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p>{teamText(u)}</p>
                      {u.role === 'rescuer' && (u.equipment || u.service_area) && (
                        <p className="text-sm text-t2">
                          {[equipmentLabel(u.equipment), u.service_area].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-t2 tabular-nums">{u.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={u.is_active ? 'ok' : 'gray'}
                        icon={
                          u.is_active ? (
                            <CheckCircleIcon size={15} weight="bold" aria-hidden />
                          ) : (
                            <XCircleIcon size={15} weight="bold" aria-hidden />
                          )
                        }
                      >
                        {u.is_active ? 'ใช้งาน' : 'ระงับ'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-t2" title={formatDateTime(u.location_updated_at)}>
                      {u.role === 'rescuer' ? (u.location_updated_at ? timeAgo(u.location_updated_at) : 'ยังไม่มาร์ค') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          block={false}
                          onClick={() => open(u)}
                          aria-label={`แก้ไข ${u.full_name}`}
                          icon={<PencilSimpleIcon size={18} aria-hidden />}
                        >
                          แก้ไข
                        </Button>
                        {u.id !== me?.id && (
                          <Button
                            size="sm"
                            variant="dangerOutline"
                            block={false}
                            onClick={() => {
                              setSaveError(null);
                              setDeleting(u);
                            }}
                            aria-label={`ลบ ${u.full_name}`}
                            icon={<TrashIcon size={18} aria-hidden />}
                          >
                            ลบ
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'แก้ไขบัญชี' : 'สร้างบัญชีใหม่'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="outline" size="sm" block={false} onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button type="submit" form="user-form" size="sm" block={false} loading={saving}>
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
            {f.role === 'rescuer' && (
              <>
                <Field label="จำนวนสมาชิกในทีม" error={errors.team_size}>
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={999}
                      className={inputClass}
                      value={f.team_size}
                      onChange={set('team_size')}
                    />
                  )}
                </Field>
                <Field label="พื้นที่ที่รับผิดชอบ">
                  {(p) => <input {...p} className={inputClass} value={f.service_area} onChange={set('service_area')} maxLength={255} />}
                </Field>
                <fieldset className="flex flex-col gap-1 sm:col-span-2">
                  <legend className="mb-1 text-base font-medium">อุปกรณ์</legend>
                  <div className="grid grid-cols-2 gap-x-3">
                    {EQUIPMENT.map((eq) => (
                      <Checkbox
                        key={eq.key}
                        checked={f.equipment.includes(eq.key)}
                        onChange={(v) =>
                          setValue('equipment', v ? [...f.equipment, eq.key] : f.equipment.filter((k) => k !== eq.key))
                        }
                        className="min-h-11 cursor-pointer text-base font-medium"
                      >
                        {eq.label}
                      </Checkbox>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
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
              <Checkbox
                checked={f.is_active}
                onChange={(v) => setValue('is_active', v)}
                className="min-h-11 cursor-pointer text-base font-medium sm:col-span-2"
              >
                เปิดใช้งานบัญชี (ยกเลิกเพื่อระงับการเข้าสู่ระบบ)
              </Checkbox>
            )}
            <div className="sm:col-span-2">
              <ErrorBanner error={saveError} />
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="ลบบัญชี"
        confirmLabel="ลบบัญชี"
        confirmVariant="danger"
        confirmIcon={<TrashIcon size={20} aria-hidden />}
        loading={saving}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      >
        <p>
          ลบบัญชี <b>{deleting?.full_name}</b> (@{deleting?.username}) ถาวร? เคสที่บัญชีนี้รับไว้จะกลับเข้าคิว
          หากต้องการหยุดใช้ชั่วคราว แนะนำให้ “ระงับ” แทน
        </p>
        <div className="mt-3">
          <ErrorBanner error={saveError} />
        </div>
      </ConfirmDialog>
    </>
  );
}
