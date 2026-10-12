'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, FileSearch, LifeBuoy, Phone, Search } from 'lucide-react';
import { RequestDetail } from '@/components/Details';
import { Button, EmptyState, ErrorBanner, Spinner, cx, inputClass } from '@/components/ui';
import { usePolling } from '@/hooks/usePolling';
import { formatDateTime, formatTime, getMyCases } from '@/lib/format';

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

  const { data, error, loading, updatedAt } = usePolling(caseNo ? `/requests/track/${encodeURIComponent(caseNo)}` : null);

  function search(e) {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (!value) return;
    setCaseNo(value);
    window.history.replaceState(null, '', `/track?case=${value}`);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-5">
      <header>
        <h1 className="text-xl font-bold">ติดตามเคสของฉัน</h1>
        <p className="text-sm text-muted">กรอกเลขเคสที่ได้รับหลังส่งคำขอ เช่น HY-00157</p>
      </header>

      <form onSubmit={search} className="flex gap-2" role="search">
        <label htmlFor="case-no" className="sr-only">
          เลขเคส
        </label>
        <input
          id="case-no"
          className={cx(inputClass, 'tabular uppercase')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="HY-00000"
          autoCapitalize="characters"
        />
        <Button type="submit" variant="safety" aria-label="ค้นหาเคส">
          <Search className="size-5" aria-hidden />
          <span className="hidden sm:inline">ค้นหา</span>
        </Button>
      </form>

      {myCases.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">เคสที่เคยแจ้งจากเครื่องนี้:</span>
          {myCases.map((c) => (
            <button
              key={c}
              onClick={() => {
                setInput(c);
                setCaseNo(c);
              }}
              className={cx(
                'tabular min-h-9 cursor-pointer rounded-full px-3 font-semibold ring-1 ring-inset',
                c === caseNo ? 'bg-safety text-white ring-safety' : 'ring-line hover:bg-slate-50'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {!caseNo && (
        <EmptyState icon={FileSearch} title="ยังไม่มีเคสที่ติดตาม">
          หากยังไม่ได้แจ้ง สามารถ{' '}
          <Link href="/request" className="font-semibold text-brand-dark underline">
            ขอความช่วยเหลือ
          </Link>{' '}
          ได้ทันที
        </EmptyState>
      )}

      {caseNo && loading && <Spinner />}
      {caseNo && error && <ErrorBanner error={error} />}

      {data && (
        <>
          <Timeline data={data} />

          {data.rescuer_team && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white">
                <LifeBuoy className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">ทีมที่รับผิดชอบ</p>
                <p className="font-bold">{data.rescuer_team}</p>
              </div>
              {data.rescuer_phone && (
                <Button as="a" href={`tel:${data.rescuer_phone}`} variant="safety">
                  <Phone className="size-4" aria-hidden />
                  โทรหาทีม
                </Button>
              )}
            </div>
          )}

          {data.status === 'pending' && (
            <p className="rounded-2xl bg-warn-soft p-4 text-sm text-ink">
              มีเคสที่แจ้งก่อนหน้าและยังรอทีมอยู่ <b className="tabular">{data.queue_ahead}</b> เคส
              ทีมจะจัดลำดับตามความเร่งด่วน กรุณาเปิดโทรศัพท์ไว้และอยู่ในที่สูง
            </p>
          )}

          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="sr-only">รายละเอียดที่แจ้ง</h2>
            <RequestDetail request={data} />
          </section>

          <p className="text-center text-xs text-muted">
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
      <p className="rounded-2xl bg-slate-100 p-4 text-sm">
        เคสนี้ถูกยกเลิกแล้ว หากยังต้องการความช่วยเหลือ กรุณา{' '}
        <Link href="/request" className="font-semibold text-brand-dark underline">
          แจ้งใหม่
        </Link>
      </p>
    );
  }
  return (
    <ol className="rounded-2xl border border-line bg-surface p-4" aria-label="สถานะเคส">
      {STEPS.map((step, i) => {
        const done = step.statuses.includes(data.status);
        const current = done && (i === STEPS.length - 1 || !STEPS[i + 1].statuses.includes(data.status));
        return (
          <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                className={cx('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', done ? 'bg-shelter' : 'bg-line')}
                aria-hidden
              />
            )}
            <span
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                done ? 'bg-shelter text-white' : 'bg-slate-100 text-muted',
                current && 'ring-4 ring-shelter/25'
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <div className="pt-1">
              <p className={cx('font-semibold', done ? 'text-ink' : 'text-muted')}>
                {step.label}
                {current && <span className="sr-only"> (สถานะปัจจุบัน)</span>}
              </p>
              {step.key && data[step.key] && <p className="text-sm text-muted">{formatDateTime(data[step.key])}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
