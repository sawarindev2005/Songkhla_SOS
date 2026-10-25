'use client';

import { useState } from 'react';
import { PageHeader } from './StaffShell';
import { MapView } from './map';
import { Button } from './pk/Button';
import { ConfirmDialog } from './pk/ConfirmDialog';
import { EmptyState } from './pk/EmptyState';
import { ErrorBanner } from './pk/ErrorBanner';
import { Field, inputClass } from './pk/Field';
import { Modal } from './pk/Modal';
import { Spinner } from './pk/Spinner';
import { useToast } from './pk/Toast';
import { PlaceStatusBadge } from './pk/domain';
import { HouseLineIcon, PackageIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from './pk/icons';
import { cn } from './pk/cn';
import { usePolling } from '@/hooks/usePolling';
import { useInvalidFormFocus } from '@/hooks/useInvalidFormFocus';
import { api } from '@/lib/api';
import { validatePlaceForm } from '@/lib/place-validation.mjs';
import { formSnapshot } from '@/lib/form-snapshot.mjs';
import { DIST_STATUS, SHELTER_STATUS, formatNumber } from '@/lib/format';

const CONFIG = {
  shelter: {
    path: '/shelters',
    title: 'จัดการที่พักพิง',
    noun: 'ที่พักพิง',
    icon: HouseLineIcon,
    statusMap: SHELTER_STATUS,
    mapProp: 'shelters',
    empty: { name: '', address: '', capacity: 100, current_occupancy: 0, contact_phone: '', facilities: '', status: 'open' },
  },
  distribution: {
    path: '/distributions',
    title: 'จัดการจุดแจกจ่าย',
    noun: 'จุดแจกจ่าย',
    icon: PackageIcon,
    statusMap: DIST_STATUS,
    mapProp: 'distributions',
    empty: { name: '', address: '', supply_types: 'อาหาร, น้ำดื่ม', open_time: '08:00', close_time: '18:00', contact_phone: '', status: 'active' },
  },
};

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

export default function PlaceManager({ type }) {
  const cfg = CONFIG[type];
  const toast = useToast();
  const focusInvalid = useInvalidFormFocus('place-form');
  const { data, error, loading, refresh } = usePolling(cfg.path);
  const [editing, setEditing] = useState(null); // null | { id?, form, position }
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [focus, setFocus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  function openNew() {
    const form = { ...cfg.empty };
    setEditing({ form, position: null, initial: formSnapshot(form) });
    setFormError(null);
    setFieldErrors({});
  }

  function openEdit(p) {
    const form = Object.fromEntries(
      Object.keys(cfg.empty).map((k) => [k, k.endsWith('_time') ? hhmm(p[k]) : p[k] ?? ''])
    );
    const position = { lat: p.lat, lng: p.lng };
    setEditing({ id: p.id, form, position, initial: formSnapshot(form, position) });
    setFormError(null);
    setFieldErrors({});
  }

  const setField = (key) => (e) => {
    setEditing((ed) => ({ ...ed, form: { ...ed.form, [key]: e.target.value } }));
    if (fieldErrors[key]) setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    const errs = validatePlaceForm(type, editing.form, editing.position);
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      focusInvalid();
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const body = {
        ...editing.form,
        ...editing.position,
        ...(type === 'shelter' && {
          capacity: Number(editing.form.capacity),
          current_occupancy: Number(editing.form.current_occupancy),
        }),
      };
      await api(editing.id ? `${cfg.path}/${editing.id}` : cfg.path, {
        method: editing.id ? 'PATCH' : 'POST',
        body,
      });
      toast(`${editing.id ? 'บันทึก' : 'เพิ่ม'}${cfg.noun} ${editing.form.name} สำเร็จ`, 4500);
      setEditing(null);
      refresh();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await api(`${cfg.path}/${deleting.id}`, { method: 'DELETE' });
      toast(`ลบ${cfg.noun} ${deleting.name} สำเร็จ`, 4500);
      setDeleting(null);
      refresh();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  }

  const places = data || [];
  const f = editing?.form;

  return (
    <>
      <PageHeader
        title={cfg.title}
        desc={`${data ? places.length : '—'} แห่ง · ข้อมูลแสดงบนแผนที่ประชาชนทันที`}
        actions={
          <Button onClick={openNew} size="sm" block={false} icon={<PlusIcon size={18} weight="bold" aria-hidden />}>
            เพิ่ม{cfg.noun}
          </Button>
        }
      />
      <ErrorBanner error={error} onRetry={refresh} />

      <div className="grid gap-4 lg:grid-cols-[1fr_26rem]">
        <div className="h-[40dvh] overflow-hidden rounded-xl border border-line lg:sticky lg:top-6 lg:h-[calc(100dvh-9rem)]">
          <MapView
            {...{ [cfg.mapProp]: places }}
            selected={selectedId ? { type, id: selectedId } : null}
            onSelect={(_, p) => setSelectedId(p.id)}
            focus={focus}
            zoomControl
            locate={false}
          />
        </div>

        <div className="flex flex-col gap-3">
          {loading && <Spinner />}
          {!loading && !error && places.length === 0 && (
            <EmptyState icon={cfg.icon} title={`ยังไม่มี${cfg.noun}`}>
              กด “เพิ่ม{cfg.noun}” เพื่อเริ่ม
            </EmptyState>
          )}
          {places.map((p) => (
            <article
              key={p.id}
              className={cn(
                'rounded-xl border bg-white p-4',
                selectedId === p.id ? 'border-acc outline-2 outline-acc-line' : 'border-line'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedId(p.id);
                  setFocus({ lat: p.lat, lng: p.lng });
                }}
                className="w-full cursor-pointer text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold">{p.name}</h2>
                  <PlaceStatusBadge kind={type} status={p.status} />
                </div>
                <p className="mt-1 text-base text-t2">
                  {type === 'shelter'
                    ? `พัก ${formatNumber(p.current_occupancy)} / ${formatNumber(p.capacity)} คน`
                    : `${p.supply_types || '-'} · ${hhmm(p.open_time) || '?'}–${hhmm(p.close_time) || '?'} น.`}
                </p>
                {p.address && <p className="text-base text-t2">{p.address}</p>}
              </button>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  block={false}
                  onClick={() => openEdit(p)}
                  icon={<PencilSimpleIcon size={18} aria-hidden />}
                >
                  แก้ไข
                </Button>
                <Button
                  size="sm"
                  variant="dangerOutline"
                  block={false}
                  onClick={() => {
                    setFormError(null);
                    setDeleting(p);
                  }}
                  icon={<TrashIcon size={18} aria-hidden />}
                >
                  ลบ
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        busy={saving}
        dirty={Boolean(editing && formSnapshot(editing.form, editing.position) !== editing.initial)}
        wide
        title={editing?.id ? `แก้ไข${cfg.noun}` : `เพิ่ม${cfg.noun}`}
        onClose={() => setEditing(null)}
        footer={(requestClose) => (
          <>
            <Button variant="outline" size="sm" block={false} disabled={saving} onClick={requestClose}>
              ยกเลิก
            </Button>
            <Button type="submit" form="place-form" size="sm" block={false} loading={saving}>
              บันทึก
            </Button>
          </>
        )}
      >
        {editing && (
          <form id="place-form" onSubmit={save} noValidate className="grid gap-4 md:grid-cols-2">
            <fieldset disabled={saving} className="contents">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <p className="text-base font-medium">
                ตำแหน่งบนแผนที่ <span className="text-red">*</span>
              </p>
              <div
                inert={saving || undefined}
                tabIndex={-1}
                aria-label="ตำแหน่งบนแผนที่"
                aria-invalid={fieldErrors.position ? true : undefined}
                className={cn(
                  'h-64 overflow-hidden rounded-lg border',
                  fieldErrors.position ? 'border-red' : 'border-line2'
                )}
              >
                <MapView
                  picker={{
                    value: editing.position,
                    onChange: (p) => {
                      if (saving) return;
                      setEditing((ed) => ({ ...ed, position: { lat: p.lat, lng: p.lng } }));
                      setFieldErrors((er) => ({ ...er, position: undefined }));
                    },
                    kind: type,
                  }}
                  center={editing.position ? [editing.position.lat, editing.position.lng] : undefined}
                  zoomControl
                  locate={false}
                />
              </div>
              <p className={cn('font-body text-sm', fieldErrors.position ? 'text-red-tx' : 'text-t3')}>
                {fieldErrors.position ||
                  (editing.position
                    ? `${editing.position.lat.toFixed(5)}, ${editing.position.lng.toFixed(5)} — ลากหมุดเพื่อปรับ`
                    : 'คลิกบนแผนที่เพื่อปักหมุด')}
              </p>
            </div>

            <Field label="ชื่อ" required error={fieldErrors.name} className="md:col-span-2">
              {(p) => <input {...p} className={inputClass} value={f.name} onChange={setField('name')} />}
            </Field>
            <Field label="ที่อยู่" className="md:col-span-2">
              {(p) => <input {...p} className={inputClass} value={f.address ?? ''} onChange={setField('address')} />}
            </Field>

            {type === 'shelter' ? (
              <>
                <Field label="ความจุ (คน)" error={fieldErrors.capacity}>
                  {(p) => <input {...p} type="number" min={0} max={2147483647} step={1} className={inputClass} value={f.capacity} onChange={setField('capacity')} />}
                </Field>
                <Field label="ผู้พักอาศัยปัจจุบัน (คน)" error={fieldErrors.current_occupancy}>
                  {(p) => (
                    <input {...p} type="number" min={0} max={2147483647} step={1} className={inputClass} value={f.current_occupancy} onChange={setField('current_occupancy')} />
                  )}
                </Field>
                <Field label="สิ่งอำนวยความสะดวก" className="md:col-span-2" hint="คั่นด้วยเครื่องหมายจุลภาค">
                  {(p) => <input {...p} className={inputClass} value={f.facilities ?? ''} onChange={setField('facilities')} />}
                </Field>
              </>
            ) : (
              <>
                <Field label="ของที่แจก" className="md:col-span-2" hint="คั่นด้วยเครื่องหมายจุลภาค เช่น อาหาร, น้ำดื่ม, ยา">
                  {(p) => <input {...p} className={inputClass} value={f.supply_types ?? ''} onChange={setField('supply_types')} />}
                </Field>
                <Field label="เวลาเปิด">
                  {(p) => <input {...p} type="time" className={inputClass} value={f.open_time} onChange={setField('open_time')} />}
                </Field>
                <Field label="เวลาปิด">
                  {(p) => <input {...p} type="time" className={inputClass} value={f.close_time} onChange={setField('close_time')} />}
                </Field>
              </>
            )}

            <Field label="เบอร์ติดต่อ">
              {(p) => <input {...p} type="tel" className={inputClass} value={f.contact_phone ?? ''} onChange={setField('contact_phone')} />}
            </Field>
            <Field label="สถานะ">
              {(p) => (
                <select {...p} className={inputClass} value={f.status} onChange={setField('status')}>
                  {Object.entries(cfg.statusMap).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="md:col-span-2">
              <ErrorBanner error={formError} />
            </div>
            </fieldset>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`ลบ${cfg.noun}`}
        confirmLabel="ลบ"
        initialFocus="cancel"
        confirmVariant="danger"
        confirmIcon={<TrashIcon size={20} aria-hidden />}
        loading={saving}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      >
        <p>
          ต้องการลบ “{deleting?.name}” ใช่หรือไม่? หากแค่ปิดชั่วคราว แนะนำให้แก้สถานะเป็น “ปิด” แทน
        </p>
        <div className="mt-3">
          <ErrorBanner error={formError} />
        </div>
      </ConfirmDialog>
    </>
  );
}
