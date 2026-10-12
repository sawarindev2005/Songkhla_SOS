'use client';

import { useState } from 'react';
import { MapView } from '@/components/map';
import { api } from '@/lib/api';
import { URGENCY, VULNERABLE, addMyCase } from '@/lib/format';
import { Button } from '@/components/pk/Button';
import { Checkbox } from '@/components/pk/Checkbox';
import { FallbackBlock } from '@/components/pk/FallbackBlock';
import { RadioCards } from '@/components/pk/RadioCards';
import { Stepper } from '@/components/pk/Stepper';
import { TextField } from '@/components/pk/TextField';
import { useToast } from '@/components/pk/Toast';
import { isUrgent, UrgencyIcon } from '@/components/pk/domain';
import { CheckCircleIcon, CopyIcon, CrosshairIcon, SirenIcon, WarningIcon } from '@/components/pk/icons';
import { cn } from '@/components/pk/cn';

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
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);

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

  async function submit(e) {
    e.preventDefault();
    const errs = validate(form, position);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document
        .querySelector('[aria-invalid="true"], [data-error="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <Success caseNo={result.case_no} />;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-5 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-7xl font-bold">
          <SirenIcon size={28} weight="fill" className="text-red" aria-hidden />
          ขอความช่วยเหลือ
        </h1>
        <p className="font-body text-md text-t2">กรอกให้ครบเท่าที่ทำได้ ทีมกู้ภัยใช้ข้อมูลนี้จัดลำดับความด่วน</p>
      </header>

      {/* ตำแหน่ง */}
      <section className="flex flex-col gap-2" data-error={errors.position ? 'true' : undefined}>
        <div className="flex items-end justify-between gap-2">
          <h2 className="min-w-0 flex-1 text-base font-medium">
            ตำแหน่งที่ต้องการความช่วยเหลือ <span className="text-red">*</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            block={false}
            className="shrink-0 whitespace-nowrap"
            loading={locating}
            onClick={useCurrentLocation}
            icon={<CrosshairIcon size={18} aria-hidden />}
          >
            ใช้ตำแหน่งปัจจุบัน
          </Button>
        </div>
        <div
          className={cn(
            'isolate h-56 shrink-0 overflow-hidden rounded-lg border short:h-44',
            errors.position ? 'border-red' : 'border-line2'
          )}
        >
          <MapView pinStyle="public" picker={{ value: position, onChange: pick }} focus={focus} locate={false} />
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-medium">ความเร่งด่วน</legend>
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
                className={cn('shrink-0', isUrgent(key) ? 'text-red' : key === 'low' ? 'text-t3' : 'text-amb')}
              />
            ),
          }))}
        />
      </fieldset>

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
        className="[&_input]:tabular-nums"
        value={form.phone}
        onChange={set('phone')}
      />

      <div className="flex flex-col gap-2">
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

      <TextField
        multiline
        rows={3}
        label="รายละเอียดสถานการณ์"
        hint="เช่น ระดับน้ำ ติดอยู่ชั้นไหน ต้องการเรือ ยา หรืออาหาร"
        value={form.description}
        onChange={set('description')}
      />

      <TextField
        label="จุดสังเกต / ที่อยู่"
        hint="เช่น ซอย ชื่อหมู่บ้าน บ้านสีอะไร"
        value={form.address_note}
        onChange={set('address_note')}
      />

      {submitError && (
        <div className="flex flex-col gap-4">
          <p role="alert" className="flex items-start gap-2 text-md font-medium text-red-tx">
            <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
            {submitError.message}
          </p>
          <FallbackBlock smsBody={smsBody(form, position)} note="ข้อความ SMS ใส่ชื่อ เบอร์ และพิกัดให้แล้ว" />
        </div>
      )}

      <Button
        type="submit"
        variant="danger"
        loading={submitting}
        icon={<SirenIcon size={20} weight="fill" aria-hidden />}
      >
        {submitting ? 'กำลังส่งคำขอ…' : 'ส่งคำขอความช่วยเหลือ'}
      </Button>
      <p className="text-center font-body text-sm text-t2">
        หากอันตรายถึงชีวิต โทร{' '}
        <a href="tel:1669" className="font-bold text-red underline">
          1669
        </a>{' '}
        หรือ{' '}
        <a href="tel:1784" className="font-bold text-red underline">
          1784
        </a>{' '}
        ทันที
      </p>
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
    <div className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 py-8 text-center">
      <CheckCircleIcon size={56} weight="fill" className="text-ok" aria-hidden />
      <div className="flex flex-col gap-1">
        <h1 className="text-7xl font-bold">ส่งคำขอแล้ว</h1>
        <p className="font-body text-md text-t2">ทีมกู้ภัยเห็นตำแหน่งของคุณบนแผนที่แล้ว เปิดโทรศัพท์ไว้</p>
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
  );
}
