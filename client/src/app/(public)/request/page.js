'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, CircleCheck, Copy, Crosshair, Minus, Plus, Siren } from 'lucide-react';
import { MapView } from '@/components/map';
import { Button, ErrorBanner, Field, cx, inputClass } from '@/components/ui';
import { api } from '@/lib/api';
import { URGENCY, VULNERABLE, addMyCase } from '@/lib/format';

const EMPTY = {
  requester_name: '',
  phone: '',
  people_count: 1,
  urgency: 'high',
  description: '',
  address_note: '',
  has_elderly: false,
  has_children: false,
  has_disabled: false,
  has_patient: false,
};

function validate(form, position) {
  const errors = {};
  if (!form.requester_name.trim()) errors.requester_name = 'กรุณากรอกชื่อ';
  const digits = form.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 10) errors.phone = 'กรอกเบอร์โทร 9–10 หลัก เช่น 0812345678';
  if (!position) errors.position = 'กรุณาปักหมุดตำแหน่งบนแผนที่ หรือกด "ใช้ตำแหน่งปัจจุบัน"';
  return errors;
}

export default function RequestPage() {
  const [form, setForm] = useState(EMPTY);
  const [position, setPosition] = useState(null);
  const [focus, setFocus] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  function pick(p) {
    setPosition({ lat: p.lat, lng: p.lng });
    setErrors((er) => ({ ...er, position: undefined }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setErrors((er) => ({ ...er, position: 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง กรุณาแตะบนแผนที่' }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        pick(p);
        setFocus({ ...p, zoom: 17 });
      },
      () => {
        setLocating(false);
        setErrors((er) => ({
          ...er,
          position: 'ระบุตำแหน่งไม่ได้ กรุณาเปิด GPS หรือแตะบนแผนที่เพื่อปักหมุดเอง',
        }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate(form, position);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector('[aria-invalid="true"], [data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api('/requests', {
        method: 'POST',
        body: { ...form, phone: form.phone.replace(/\D/g, ''), ...position },
      });
      addMyCase(res.case_no);
      setResult(res);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <Success caseNo={result.case_no} />;

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-5">
      <header className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white">
          <Siren className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold">ขอความช่วยเหลือ</h1>
          <p className="text-sm text-muted">กรอกข้อมูลให้มากที่สุด ทีมกู้ภัยจะใช้ประเมินความเร่งด่วน</p>
        </div>
      </header>

      {/* ตำแหน่ง */}
      <section className="flex flex-col gap-2" data-error={errors.position ? 'true' : undefined}>
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold">
            ตำแหน่งที่ต้องการความช่วยเหลือ <span className="text-brand">*</span>
          </h2>
          <Button type="button" variant="safety" size="sm" onClick={useCurrentLocation} loading={locating}>
            {!locating && <Crosshair className="size-4" aria-hidden />}
            ใช้ตำแหน่งปัจจุบัน
          </Button>
        </div>
        <div
          className={cx(
            'h-64 overflow-hidden rounded-2xl border-2',
            errors.position ? 'border-brand' : 'border-line'
          )}
        >
          <MapView picker={{ value: position, onChange: pick }} focus={focus} onLocate={pick} />
        </div>
        <p className={cx('text-sm', errors.position ? 'text-brand-dark' : 'text-muted')} role={errors.position ? 'alert' : undefined}>
          {errors.position ||
            (position
              ? `ปักหมุดแล้ว (${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}) — ลากหมุดเพื่อปรับได้`
              : 'แตะบนแผนที่เพื่อปักหมุดบ้านหรือจุดที่ติดอยู่')}
        </p>
      </section>

      <Field label="ชื่อผู้ติดต่อ" required error={errors.requester_name}>
        {(p) => (
          <input {...p} className={inputClass} value={form.requester_name} onChange={set('requester_name')} autoComplete="name" />
        )}
      </Field>

      <Field label="เบอร์โทรศัพท์" required error={errors.phone} hint="ทีมกู้ภัยจะโทรกลับเบอร์นี้ (ไม่แสดงต่อสาธารณะ)">
        {(p) => (
          <input
            {...p}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cx(inputClass, 'tabular')}
            value={form.phone}
            onChange={set('phone')}
            placeholder="08x-xxx-xxxx"
          />
        )}
      </Field>

      <Field label="จำนวนคนที่ต้องการความช่วยเหลือ">
        {(p) => (
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="ลดจำนวน"
              onClick={() => set('people_count')(Math.max(1, Number(form.people_count) - 1))}
              className="grid size-11 cursor-pointer place-items-center rounded-xl border border-line hover:bg-slate-50"
            >
              <Minus className="size-5" aria-hidden />
            </button>
            <input
              {...p}
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              className={cx(inputClass, 'tabular w-24 text-center text-lg font-bold')}
              value={form.people_count}
              onChange={set('people_count')}
            />
            <button
              type="button"
              aria-label="เพิ่มจำนวน"
              onClick={() => set('people_count')(Math.min(999, Number(form.people_count) + 1))}
              className="grid size-11 cursor-pointer place-items-center rounded-xl border border-line hover:bg-slate-50"
            >
              <Plus className="size-5" aria-hidden />
            </button>
            <span className="text-muted">คน</span>
          </div>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">มีกลุ่มเปราะบางหรือไม่ (เลือกได้หลายข้อ)</legend>
        <div className="grid grid-cols-2 gap-2">
          {VULNERABLE.map((v) => (
            <label
              key={v.key}
              className={cx(
                'flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors',
                form[v.key] ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:bg-slate-50'
              )}
            >
              <input type="checkbox" className="size-5 accent-brand" checked={form[v.key]} onChange={set(v.key)} />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">ความเร่งด่วน</legend>
        {Object.entries(URGENCY).map(([key, u]) => (
          <label
            key={key}
            className={cx(
              'flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
              form.urgency === key ? 'border-safety bg-safety-soft' : 'border-line hover:bg-slate-50'
            )}
          >
            <input
              type="radio"
              name="urgency"
              value={key}
              checked={form.urgency === key}
              onChange={set('urgency')}
              className="mt-1 size-5 accent-safety"
            />
            <span>
              <span className="block font-semibold">{u.label}</span>
              <span className="block text-sm text-muted">{u.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label="รายละเอียดสถานการณ์" hint="เช่น ระดับน้ำ, ติดอยู่ชั้นไหน, ต้องการเรือ/ยา/อาหาร">
        {(p) => (
          <textarea {...p} rows={3} className={inputClass} value={form.description} onChange={set('description')} />
        )}
      </Field>

      <Field label="จุดสังเกต / ที่อยู่" hint="เช่น ซอย, ชื่อหมู่บ้าน, บ้านสีอะไร">
        {(p) => <input {...p} className={inputClass} value={form.address_note} onChange={set('address_note')} />}
      </Field>

      <ErrorBanner error={submitError} />

      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {!submitting && <Siren className="size-5" aria-hidden />}
        {submitting ? 'กำลังส่งคำขอ…' : 'ส่งคำขอความช่วยเหลือ'}
      </Button>
      <p className="text-center text-sm text-muted">
        หากอันตรายถึงชีวิต โทร <a href="tel:1669" className="font-bold text-brand-dark underline">1669</a> หรือ{' '}
        <a href="tel:1784" className="font-bold text-brand-dark underline">1784</a> ทันที
      </p>
    </form>
  );
}

function Success({ caseNo }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(caseNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard ใช้ไม่ได้ — ผู้ใช้ยังจดเลขเคสจากหน้าจอได้
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-10 text-center">
      <CircleCheck className="size-16 text-shelter" aria-hidden />
      <div>
        <h1 className="text-2xl font-bold">ส่งคำขอเรียบร้อยแล้ว</h1>
        <p className="mt-1 text-muted">ทีมกู้ภัยเห็นตำแหน่งของคุณบนแผนที่แล้ว กรุณาเปิดโทรศัพท์ไว้</p>
      </div>
      <div className="w-full rounded-2xl border-2 border-dashed border-safety bg-safety-soft p-5">
        <p className="text-sm font-semibold text-safety-dark">เลขเคสของคุณ</p>
        <p className="tabular my-1 text-4xl font-bold tracking-wider" aria-live="polite">
          {caseNo}
        </p>
        <button
          type="button"
          onClick={copy}
          className="mx-auto flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-safety-dark hover:bg-blue-100"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกเลขเคส'}
        </button>
      </div>
      <p className="text-sm text-muted">จดเลขเคสไว้ ใช้ติดตามสถานะได้จากเครื่องไหนก็ได้</p>
      <div className="flex w-full flex-col gap-2">
        <Button as={Link} href={`/track?case=${caseNo}`} variant="safety" size="lg">
          ติดตามสถานะเคส
        </Button>
        <Button as={Link} href="/" variant="outline" size="lg">
          กลับหน้าแผนที่
        </Button>
      </div>
    </div>
  );
}
