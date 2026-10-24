'use client';

import { useEffect, useState } from 'react';
import { MapView } from '@/components/map';
import { api } from '@/lib/api';
import { URGENCY, VULNERABLE, addMyCase } from '@/lib/format';
import { Button } from '@/components/pk/Button';
import { Checkbox } from '@/components/pk/Checkbox';
import { ConfirmDialog } from '@/components/pk/ConfirmDialog';
import { FallbackBlock } from '@/components/pk/FallbackBlock';
import { RadioCards } from '@/components/pk/RadioCards';
import { Stepper } from '@/components/pk/Stepper';
import { TextField } from '@/components/pk/TextField';
import { useToast } from '@/components/pk/Toast';
import { URGENCY_TEXT, UrgencyIcon } from '@/components/pk/domain';
import { CheckCircleIcon, CopyIcon, CrosshairIcon, SirenIcon, WarningIcon } from '@/components/pk/icons';
import { cn } from '@/components/pk/cn';

const EMPTY = {
  requester_name: '',
  phone: '',
  people_count: 1,
  urgency: null,
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
  if (!form.urgency) errors.urgency = 'กรุณาเลือกความเร่งด่วน';
  if (!position) errors.position = 'กรุณาปักหมุดตำแหน่งบนแผนที่ หรือกด "ใช้ตำแหน่งปัจจุบัน"';
  return errors;
}

// ข้อความ SMS สำรองเมื่อส่งผ่านเน็ตไม่ได้ ใส่ข้อมูลที่กรอกและพิกัดให้แล้ว
function smsBody(form, position) {
  const parts = [
    'SOS ขอความช่วยเหลือน้ำท่วมหาดใหญ่',
    form.requester_name && `ชื่อ ${form.requester_name}`,
    form.phone && `โทร ${form.phone}`,
    `${form.people_count} คน`,
    URGENCY[form.urgency]?.label,
    position && `พิกัด https://maps.google.com/?q=${position.lat.toFixed(5)},${position.lng.toFixed(5)}`,
    form.address_note,
  ];
  return parts.filter(Boolean).join(' ');
}

export default function RequestPage() {
  const [form, setForm] = useState(EMPTY);
  const [position, setPosition] = useState(null);
  const [focus, setFocus] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!submitAttempt) return;
    const firstError = document.querySelector('[aria-invalid="true"], [data-error="true"]');
    if (!firstError) return;
    firstError.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    const target = firstError.matches('input[aria-invalid="true"]')
      ? firstError
      : firstError.matches('section[data-error="true"]')
        ? Array.from(firstError.querySelectorAll('button')).find((button) => button.textContent.trim() === 'ใช้ตำแหน่งปัจจุบัน')
        : firstError.querySelector('[role="radio"], input[type="radio"]');
    target?.focus({ preventScroll: true });
  }, [submitAttempt]);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
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

  // ตรวจข้อมูลก่อน ถ้าครบให้เปิดกล่องยืนยัน ยังไม่ส่งจริง
  function submit(e) {
    e.preventDefault();
    if (submitting) return;
    const errs = validate(form, position);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setSubmitAttempt((attempt) => attempt + 1);
      return;
    }
    setConfirming(true);
  }

  async function send() {
    setConfirming(false);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api('/requests', {
        method: 'POST',
        body: { ...form, phone: form.phone.replace(/\D/g, ''), ...position },
      });
      addMyCase(res.case_no);
      setResult(res);
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <Success caseNo={result.case_no} />;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-5 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:content-start lg:gap-x-8 lg:gap-y-5 lg:px-[max(2.5rem,calc(50%-34rem))] lg:pt-8 lg:pb-8 lg:[@media(max-height:820px)]:gap-y-3 lg:[@media(max-height:820px)]:pt-4 lg:[@media(max-height:820px)]:pb-4">
      <header className="flex flex-col gap-1 lg:col-span-2 lg:flex-row lg:items-baseline lg:gap-4">
        <h1 className="flex items-center gap-2 text-7xl font-bold lg:shrink-0 lg:text-4xl">
          <SirenIcon size={28} weight="fill" className="text-red" aria-hidden />
          ขอความช่วยเหลือ
        </h1>
        <p className="font-body text-md text-t2">กรอกให้ครบเท่าที่ทำได้ ทีมกู้ภัยใช้ข้อมูลนี้จัดลำดับความด่วน</p>
      </header>

      {/* ตำแหน่ง */}
      <section className="flex flex-col gap-2 lg:col-start-1 lg:row-start-2 lg:flex lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-col" data-error={errors.position ? 'true' : undefined}>
        <div className="flex items-end justify-between gap-2">
          <h2 className="min-w-0 flex-1 text-base font-medium">
            ตำแหน่งที่ต้องการความช่วยเหลือ <span className="text-red">*</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            block={false}
            className="min-h-11 shrink-0 whitespace-nowrap"
            loading={locating}
            onClick={useCurrentLocation}
            icon={<CrosshairIcon size={18} aria-hidden />}
          >
            ใช้ตำแหน่งปัจจุบัน
          </Button>
        </div>
        <div
          className={cn(
            'isolate h-56 shrink-0 overflow-hidden rounded-lg border short:h-44 lg:relative lg:h-auto lg:min-h-80 lg:flex-1 lg:shrink lg:rounded-xl lg:short:h-auto',
            errors.position ? 'border-red' : 'border-line2'
          )}
        >
          <MapView picker={{ value: position, onChange: pick }} focus={focus} locate={false} />
        </div>
        <p
          className={cn('font-body text-sm', errors.position ? 'text-red-tx' : 'text-t3')}
          role={errors.position ? 'alert' : undefined}
        >
          {errors.position ||
            (position
              ? `ปักหมุดแล้ว (${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}) ลากหมุดเพื่อปรับได้`
              : 'แตะบนแผนที่เพื่อปักหมุดบ้านหรือจุดที่ติดอยู่')}
        </p>
      </section>

      {/* จอกว้าง: คอลัมน์ขวาสูงตามเนื้อหา แผนที่ซ้ายยืดเท่าคอลัมน์นี้ ไม่ยืดตามความสูงจอ (ยืดแล้วช่องกรอกใหญ่ผิดสัดส่วน) */}
      <div className="contents lg:col-start-2 lg:row-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
        <fieldset className="flex flex-col gap-2 lg:[&_[role=radiogroup]]:grid lg:[&_[role=radiogroup]]:grid-cols-2 lg:[&_[role=radio]]:min-h-11 lg:[&_[role=radio]]:py-2 lg:[&_[role=radio]_.font-body]:hidden lg:[@media(min-height:960px)]:[&_[role=radio]_.font-body]:block" data-error={errors.urgency ? 'true' : undefined}>
          <legend className="mb-2 text-base font-medium">
            ความเร่งด่วน <span className="text-red">*</span>
          </legend>
          {errors.urgency && (
            <p role="alert" className="font-body text-sm text-red-tx">
              {errors.urgency}
            </p>
          )}
          <RadioCards
            label="ความเร่งด่วน"
            value={form.urgency}
            onChange={set('urgency')}
            options={Object.entries(URGENCY).map(([key, u]) => ({
              value: key,
              title: u.label,
              description: u.hint,
              hideDescriptionOnShort: true,
              icon: (
                <UrgencyIcon
                  urgency={key}
                  size={22}
                  className={cn('shrink-0', URGENCY_TEXT[key])}
                />
              ),
            }))}
          />
        </fieldset>

        <div className="contents lg:grid lg:min-w-0 lg:grid-cols-2 lg:items-start lg:gap-4 lg:[&>*]:min-w-0">
          <TextField
            label="ชื่อผู้ติดต่อ *"
            error={errors.requester_name}
            value={form.requester_name}
            onChange={set('requester_name')}
            autoComplete="name"
          />

          <TextField
            label="เบอร์โทรศัพท์ *"
            error={errors.phone}
            hint="ทีมกู้ภัยจะโทรกลับเบอร์นี้ (ไม่แสดงต่อสาธารณะ)"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08x-xxx-xxxx"
            className="[&_input]:tabular-nums lg:[@media(max-height:799px)]:[&_p.text-t3]:hidden"
            value={form.phone}
            onChange={set('phone')}
          />

          <div className="flex flex-col gap-2 lg:col-span-2 lg:min-w-0 lg:flex-row lg:items-center lg:justify-between lg:[&_[role=group]]:min-w-0 lg:[&_[role=group]]:gap-2">
            <span className="text-base font-medium">จำนวนคนที่ต้องการความช่วยเหลือ</span>
            <Stepper
              label="จำนวนคน"
              unit="คน"
              min={1}
              max={999}
              value={Number(form.people_count)}
              onChange={set('people_count')}
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-base font-medium">มีกลุ่มเปราะบางไหม (เลือกได้หลายข้อ)</legend>
          <div className="grid grid-cols-2 gap-x-3">
            {VULNERABLE.map((v) => (
              <Checkbox
                key={v.key}
                checked={form[v.key]}
                onChange={set(v.key)}
                className="min-h-11 text-md font-medium"
              >
                {v.label}
              </Checkbox>
            ))}
          </div>
        </fieldset>

        <div className="contents lg:grid lg:min-w-0 lg:grid-cols-2 lg:items-start lg:gap-4 lg:[&>*]:min-w-0">
          <TextField
            multiline
            rows={3}
            label="รายละเอียดสถานการณ์"
            hint="เช่น ระดับน้ำ ติดอยู่ชั้นไหน ต้องการเรือ ยา หรืออาหาร"
            className="lg:[&>div]:h-20 lg:[&>div]:py-2.5 lg:[&_textarea]:h-14 lg:[&_p.text-t3]:hidden"
            value={form.description}
            onChange={set('description')}
          />

          <TextField
            label="จุดสังเกต / ที่อยู่"
            hint="เช่น ซอย ชื่อหมู่บ้าน บ้านสีอะไร"
            className="lg:[&>div]:h-20 lg:[&>div]:items-start lg:[&>div]:py-2.5 lg:[&_p.text-t3]:hidden"
            value={form.address_note}
            onChange={set('address_note')}
          />
        </div>

        {submitError && (
          <div className="flex flex-col gap-4">
            <p role="alert" className="flex items-start gap-2 text-md font-medium text-red-tx">
              <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
              {submitError.message}
            </p>
            <FallbackBlock smsBody={smsBody(form, position)} note="โทรสายด่วนได้ทันที หรือส่งข้อความ (มีชื่อ เบอร์ และพิกัดให้แล้ว) ให้ญาติหรือคนที่ไว้ใจช่วยโทรแจ้งแทน ข้อความนี้ไม่ได้ส่งเข้าระบบ" />
          </div>
        )}

        <Button
          type="submit"
          variant="danger"
          className="lg:mt-1 lg:min-h-11"
          loading={submitting}
          icon={<SirenIcon size={20} weight="fill" aria-hidden />}
        >
          {submitting ? 'กำลังส่งคำขอ…' : 'ส่งคำขอความช่วยเหลือ'}
        </Button>
        <p className="text-center font-body text-sm text-t2">
          หากอันตรายถึงชีวิต โทร{' '}
          <a href="tel:1669" className="inline-flex min-h-11 min-w-11 items-center justify-center font-bold text-red underline">
            1669
          </a>{' '}
          หรือ{' '}
          <a href="tel:1784" className="inline-flex min-h-11 min-w-11 items-center justify-center font-bold text-red underline">
            1784
          </a>{' '}
          ทันที
        </p>

        <ConfirmDialog
          open={confirming}
          title="ยืนยันส่งคำขอความช่วยเหลือ?"
          confirmLabel="ยืนยัน ส่งคำขอ"
          cancelLabel="กลับไปแก้ไข"
          confirmVariant="danger"
          confirmIcon={<SirenIcon size={20} weight="fill" aria-hidden />}
          onConfirm={send}
          onCancel={() => setConfirming(false)}
        >
          <p className="mb-3">ตรวจสอบข้อมูลก่อนส่ง ทีมกู้ภัยจะโทรกลับตามเบอร์นี้</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg border border-line p-3 text-ink">
            <dt className="text-t2">ความเร่งด่วน</dt>
            <dd className="font-medium">{URGENCY[form.urgency]?.label}</dd>
            <dt className="text-t2">ชื่อ</dt>
            <dd className="font-medium break-words">{form.requester_name}</dd>
            <dt className="text-t2">เบอร์โทร</dt>
            <dd className="font-medium tabular-nums">{form.phone}</dd>
            <dt className="text-t2">จำนวนคน</dt>
            <dd className="font-medium">{form.people_count} คน</dd>
            {VULNERABLE.some((v) => form[v.key]) && (
              <>
                <dt className="text-t2">กลุ่มเปราะบาง</dt>
                <dd className="font-medium">
                  {VULNERABLE.filter((v) => form[v.key])
                    .map((v) => v.label)
                    .join(', ')}
                </dd>
              </>
            )}
            {position && (
              <>
                <dt className="text-t2">พิกัด</dt>
                <dd className="font-medium tabular-nums">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </dd>
              </>
            )}
          </dl>
        </ConfirmDialog>
      </div>
    </form>
  );
}

function Success({ caseNo }) {
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(caseNo);
      toast('คัดลอกเลขเคสแล้ว');
    } catch {
      toast('คัดลอกไม่ได้ กรุณาจดเลขเคสจากหน้าจอ');
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-8 text-center lg:px-10">
      <div className="contents lg:my-auto lg:flex lg:w-full lg:max-w-xl lg:shrink-0 lg:flex-col lg:items-center lg:gap-5 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-10 lg:shadow-sheet">
        <CheckCircleIcon size={56} weight="fill" className="text-ok" aria-hidden />
        <div className="flex flex-col gap-1">
          <h1 className="text-7xl font-bold">ระบบรับคำขอแล้ว</h1>
          <p className="font-body text-md text-t2">กำลังรอทีมกู้ภัยรับเคส เปิดโทรศัพท์ไว้ ทีมจะโทรกลับเบอร์ที่ให้ไว้</p>
        </div>
        <div className="flex w-full flex-col items-center gap-1 border-y border-line py-4">
          <p className="text-sm font-medium text-t2">เลขเคสของคุณ</p>
          <p className="text-7xl font-bold tracking-wider tabular-nums" aria-live="polite">
            {caseNo}
          </p>
          <Button
            variant="outline"
            size="sm"
            block={false}
            onClick={copy}
            icon={<CopyIcon size={18} aria-hidden />}
            className="mt-1"
          >
            คัดลอกเลขเคส
          </Button>
        </div>
        <p className="font-body text-sm text-t2">จดเลขเคสไว้ ใช้ติดตามสถานะได้จากเครื่องไหนก็ได้</p>
        <div className="flex w-full flex-col gap-2">
          <Button href={`/track?case=${caseNo}`} variant="primary">
            ติดตามสถานะเคส
          </Button>
          <Button href="/" variant="outline">
            กลับหน้าแผนที่
          </Button>
        </div>
      </div>
    </div>
  );
}
