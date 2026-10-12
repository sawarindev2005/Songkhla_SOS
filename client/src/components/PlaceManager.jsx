'use client';

import { useState } from 'react';
import { House, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from './StaffShell';
import { MapView } from './map';
import { Button, EmptyState, ErrorBanner, Field, Modal, Spinner, StatusBadge, cx, inputClass } from './ui';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { DIST_STATUS, SHELTER_STATUS, formatNumber } from '@/lib/format';

const CONFIG = {
  shelter: {
    path: '/shelters',
    title: 'จัดการที่พักพิง',
    noun: 'ที่พักพิง',
    icon: House,
    color: '#15803d',
    statusMap: SHELTER_STATUS,
    mapProp: 'shelters',
    empty: { name: '', address: '', capacity: 100, current_occupancy: 0, contact_phone: '', facilities: '', status: 'open' },
  },
  distribution: {
    path: '/distributions',
    title: 'จัดการจุดแจกจ่าย',
    noun: 'จุดแจกจ่าย',
    icon: Package,
    color: '#c2410c',
    statusMap: DIST_STATUS,
    mapProp: 'distributions',
    empty: { name: '', address: '', supply_types: 'อาหาร, น้ำดื่ม', open_time: '08:00', close_time: '18:00', contact_phone: '', status: 'active' },
  },
};

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

export default function PlaceManager({ type }) {
  const cfg = CONFIG[type];
  const { data, error, loading, refresh } = usePolling(cfg.path);
  const [editing, setEditing] = useState(null); // null | { id?, form, position }
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [focus, setFocus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  function openNew() {
    setEditing({ form: { ...cfg.empty }, position: null });
    setFormError(null);
    setFieldErrors({});
  }

  function openEdit(p) {
    const form = Object.fromEntries(
      Object.keys(cfg.empty).map((k) => [k, k.endsWith('_time') ? hhmm(p[k]) : p[k] ?? ''])
    );
    setEditing({ id: p.id, form, position: { lat: p.lat, lng: p.lng } });
    setFormError(null);
    setFieldErrors({});
  }

  const setField = (key) => (e) =>
    setEditing((ed) => ({ ...ed, form: { ...ed.form, [key]: e.target.value } }));

  async function save(e) {
    e.preventDefault();
    const errs = {};
    if (!editing.form.name.trim()) errs.name = 'กรุณากรอกชื่อ';
    if (!editing.position) errs.position = 'กรุณาคลิกบนแผนที่เพื่อเลือกตำแหน่ง';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setFormError(null);
    try {
      const body = { ...editing.form, ...editing.position };
      await api(editing.id ? `${cfg.path}/${editing.id}` : cfg.path, {
        method: editing.id ? 'PATCH' : 'POST',
        body,
      });
      setEditing(null);
      refresh();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api(`${cfg.path}/${deleting.id}`, { method: 'DELETE' });
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
        desc={`${places.length} แห่ง · ข้อมูลแสดงบนแผนที่ประชาชนทันที`}
        actions={
          <Button onClick={openNew} variant="dark">
            <Plus className="size-4" aria-hidden />
            เพิ่ม{cfg.noun}
          </Button>
        }
      />
      <ErrorBanner error={error} onRetry={refresh} />

      <div className="grid gap-4 lg:grid-cols-[1fr_26rem]">
        <div className="h-[40dvh] overflow-hidden rounded-2xl border border-line lg:sticky lg:top-6 lg:h-[calc(100dvh-9rem)]">
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
          {!loading && places.length === 0 && (
            <EmptyState icon={cfg.icon} title={`ยังไม่มี${cfg.noun}`}>
              กด “เพิ่ม{cfg.noun}” เพื่อเริ่ม
            </EmptyState>
          )}
          {places.map((p) => (
            <article
              key={p.id}
              className={cx(
                'rounded-2xl border bg-surface p-4',
                selectedId === p.id ? 'border-safety ring-2 ring-safety/20' : 'border-line'
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
                  <h2 className="font-bold leading-snug">{p.name}</h2>
                  <StatusBadge status={p.status} map={cfg.statusMap} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {type === 'shelter'
                    ? `พัก ${formatNumber(p.current_occupancy)} / ${formatNumber(p.capacity)} คน`
                    : `${p.supply_types || '-'} · ${hhmm(p.open_time) || '?'}–${hhmm(p.close_time) || '?'} น.`}
                </p>
                {p.address && <p className="text-sm text-muted">{p.address}</p>}
              </button>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="size-4" aria-hidden />
                  แก้ไข
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(p)}>
                  <Trash2 className="size-4" aria-hidden />
                  ลบ
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        wide
        title={editing?.id ? `แก้ไข${cfg.noun}` : `เพิ่ม${cfg.noun}`}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button type="submit" form="place-form" variant="dark" loading={saving}>
              บันทึก
            </Button>
          </>
        }
      >
        {editing && (
          <form id="place-form" onSubmit={save} noValidate className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <p className="text-sm font-semibold">
                ตำแหน่งบนแผนที่ <span className="text-brand">*</span>
              </p>
              <div
                className={cx(
                  'h-64 overflow-hidden rounded-xl border-2',
                  fieldErrors.position ? 'border-brand' : 'border-line'
                )}
              >
                <MapView
                  picker={{
                    value: editing.position,
                    onChange: (p) => {
                      setEditing((ed) => ({ ...ed, position: { lat: p.lat, lng: p.lng } }));
                      setFieldErrors((er) => ({ ...er, position: undefined }));
                    },
                    icon: cfg.icon,
                    color: cfg.color,
                  }}
                  center={editing.position ? [editing.position.lat, editing.position.lng] : undefined}
                  zoomControl
                  locate={false}
                />
              </div>
              <p className={cx('text-sm', fieldErrors.position ? 'text-brand-dark' : 'text-muted')}>
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
                <Field label="ความจุ (คน)">
                  {(p) => <input {...p} type="number" min={0} className={inputClass} value={f.capacity} onChange={setField('capacity')} />}
                </Field>
                <Field label="ผู้พักอาศัยปัจจุบัน (คน)">
                  {(p) => (
                    <input {...p} type="number" min={0} className={inputClass} value={f.current_occupancy} onChange={setField('current_occupancy')} />
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
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title={`ลบ${cfg.noun}`}
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              ยกเลิก
            </Button>
            <Button variant="primary" loading={saving} onClick={remove}>
              ลบ
            </Button>
          </>
        }
      >
        <p>
          ต้องการลบ “{deleting?.name}” ใช่หรือไม่? หากแค่ปิดชั่วคราว แนะนำให้แก้สถานะเป็น “ปิด” แทน
        </p>
      </Modal>
    </>
  );
}
