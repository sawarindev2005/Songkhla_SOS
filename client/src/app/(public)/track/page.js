'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePolling } from '@/hooks/usePolling';
import { formatDateTime, formatTime, getMyCases } from '@/lib/format';
import { Button } from '@/components/pk/Button';
import { Chip, ChipRow } from '@/components/pk/Chip';
import { EmptyState } from '@/components/pk/EmptyState';
import { RequestPublicDetail } from '@/components/pk/PublicDetail';
import { TextField } from '@/components/pk/TextField';
import { cn } from '@/components/pk/cn';
import {
  CheckIcon, CircleNotchIcon, LifebuoyIcon, MagnifyingGlassIcon, PhoneIcon, WarningIcon,
} from '@/components/pk/icons';

const STEPS = [
  { key: 'created_at', label: 'รับเรื่องแล้ว', statuses: ['pending', 'assigned', 'in_progress', 'rescued'] },
  { key: 'assigned_at', label: 'มอบหมายทีมกู้ภัย', statuses: ['assigned', 'in_progress', 'rescued'] },
  { key: null, label: 'ทีมกำลังเข้าช่วยเหลือ', statuses: ['in_progress', 'rescued'] },
  { key: 'resolved_at', label: 'ช่วยเหลือสำเร็จ', statuses: ['rescued'] },
];

export default function TrackPage() {
  const [input, setInput] = useState('');
  const [caseNo, setCaseNo] = useState(null);
  const [myCases, setMyCases] = useState([]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('case');
    const saved = getMyCases();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน URL/localStorage หลัง mount (หน้าถูก prerender)
    setMyCases(saved);
    const initial = fromUrl || saved[0];
    if (initial) {
      setInput(initial);
      setCaseNo(initial.toUpperCase());
    }
  }, []);

  const { data, error, loading, updatedAt } = usePolling(
    caseNo ? `/requests/track/${encodeURIComponent(caseNo)}` : null
  );

  function search(e) {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (!value) return;
    setCaseNo(value);
    window.history.replaceState(null, '', `/track?case=${value}`);
  }

  function choose(c) {
    setInput(c);
    setCaseNo(c);
    window.history.replaceState(null, '', `/track?case=${c}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-5 pb-8 md:px-[max(1.5rem,calc((100%-40rem)/2))] md:pt-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-7xl font-bold">เคสของฉัน</h1>
        <p className="font-body text-md text-t2">กรอกเลขเคสที่ได้รับหลังส่งคำขอ เช่น HY-00157</p>
      </header>

      <form onSubmit={search} role="search" className="flex items-end gap-2">
        <TextField
          label="เลขเคส"
          className="min-w-0 flex-1 [&_input]:uppercase [&_input]:tabular-nums"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="HY-00000"
          autoCapitalize="characters"
        />
        <Button
          type="submit"
          variant="primary"
          block={false}
          className="h-13"
          aria-label="ค้นหาเคส"
          icon={<MagnifyingGlassIcon size={20} weight="bold" aria-hidden />}
        >
          <span className="sr-only sm:not-sr-only">ค้นหา</span>
        </Button>
      </form>

      {myCases.length > 1 && (
        <ChipRow label="เคสที่เคยแจ้งจากเครื่องนี้">
          {myCases.map((c) => (
            <Chip key={c} selected={c === caseNo} onClick={() => choose(c)} className="tabular-nums">
              {c}
            </Chip>
          ))}
        </ChipRow>
      )}

      {!caseNo && (
        <EmptyState>
          ยังไม่มีเคสที่ติดตาม หากยังไม่ได้แจ้ง{' '}
          <Link href="/request" className="font-semibold text-red underline">
            ขอความช่วยเหลือ
          </Link>{' '}
          ได้ทันที
        </EmptyState>
      )}

      {caseNo && loading && (
        <p role="status" className="flex items-center justify-center gap-2 py-6 text-t3">
          <CircleNotchIcon size={18} className="animate-spin" aria-hidden />
          กำลังโหลด…
        </p>
      )}
      {caseNo && error && (
        <p role="alert" className="flex items-start gap-2 text-md font-medium text-red-tx">
          <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
          {error.message}
        </p>
      )}

      {data && (
        <>
          <Timeline data={data} />

          {data.rescuer_team && (
            <div className="flex items-center gap-3 border-y border-line py-3">
              <LifebuoyIcon size={24} weight="fill" className="shrink-0 text-ink" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-t2">ทีมที่รับผิดชอบ</p>
                <p className="text-md font-bold">{data.rescuer_team}</p>
              </div>
              {data.rescuer_phone && (
                <Button
                  href={`tel:${data.rescuer_phone}`}
                  variant="primary"
                  size="sm"
                  block={false}
                  icon={<PhoneIcon size={18} weight="fill" aria-hidden />}
                >
                  โทรหาทีม
                </Button>
              )}
            </div>
          )}

          {data.status === 'pending' && (
            <p className="font-body text-md text-ink">
              มีเคสที่แจ้งก่อนหน้าและยังรอทีมอยู่ <b className="font-semibold text-amb-tx tabular-nums">{data.queue_ahead}</b>{' '}
              เคส ทีมจะจัดลำดับตามความเร่งด่วน กรุณาเปิดโทรศัพท์ไว้และอยู่ในที่สูง
            </p>
          )}

          <section className="border-t border-line pt-4">
            <h2 className="sr-only">รายละเอียดที่แจ้ง</h2>
            <RequestPublicDetail request={data} />
          </section>

          <p className="text-center font-body text-xs text-t3">
            อัปเดตล่าสุด {formatTime(updatedAt)} · รีเฟรชอัตโนมัติทุก 15 วินาที
          </p>
        </>
      )}
    </div>
  );
}

function Timeline({ data }) {
  if (data.status === 'cancelled') {
    return (
      <p className="font-body text-md text-t2">
        เคสนี้ถูกยกเลิกแล้ว หากยังต้องการความช่วยเหลือ กรุณา{' '}
        <Link href="/request" className="font-semibold text-red underline">
          แจ้งใหม่
        </Link>
      </p>
    );
  }
  return (
    <ol aria-label="สถานะเคส" className="flex flex-col">
      {STEPS.map((step, i) => {
        const done = step.statuses.includes(data.status);
        const current = done && (i === STEPS.length - 1 || !STEPS[i + 1].statuses.includes(data.status));
        return (
          <li key={step.label} aria-current={current ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn('absolute top-7 left-[13px] h-[calc(100%-1.75rem)] w-0.5', done ? 'bg-ok' : 'bg-line')}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold',
                done ? 'bg-ok text-white' : 'border-2 border-line2 bg-white text-t3'
              )}
            >
              {done ? <CheckIcon size={14} weight="bold" /> : i + 1}
            </span>
            <div className="pt-0.5">
              <p className={cn('text-md', current ? 'font-bold text-ok' : done ? 'font-semibold text-ink' : 'font-medium text-t3')}>
                {step.label}
              </p>
              {step.key && data[step.key] && (
                <p className="font-body text-sm text-t3 tabular-nums">{formatDateTime(data[step.key])}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
