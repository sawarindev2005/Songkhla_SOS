'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ClipboardList, Crosshair, Hand, LifeBuoy, X } from 'lucide-react';
import { MapView } from '@/components/map';
import { ContactActions, RequestDetail } from '@/components/Details';
import { Button, ErrorBanner, UrgencyBadge, cx } from '@/components/ui';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { distanceKm, formatDistance, timeAgo, vulnerableLabels } from '@/lib/format';

export default function RescuerMapPage() {
  const { user, updateUser } = useAuth();
  const requests = usePolling('/requests?status=active');
  const shelters = usePolling('/shelters');

  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const myPos = user?.current_lat != null ? { lat: user.current_lat, lng: user.current_lng } : null;
  const all = requests.data || [];
  const mine = all.filter((r) => r.assigned_to === user?.id);

  // เคสรอช่วยเหลือ เรียงตามระยะทางจากตำแหน่งของฉัน (ถ้ามี) ไม่งั้นเรียงตามความเร่งด่วน
  const pending = useMemo(() => {
    const list = all.filter((r) => r.status === 'pending').map((r) => ({ ...r, distance: distanceKm(myPos, r) }));
    if (myPos) list.sort((a, b) => a.distance - b.distance);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, myPos?.lat, myPos?.lng]);

  const selected = all.find((r) => r.id === selectedId);

  async function saveLocation(point) {
    setSaving(true);
    setError(null);
    try {
      const u = await api('/users/me/location', { method: 'PATCH', body: point });
      updateUser({
        current_lat: u.current_lat,
        current_lng: u.current_lng,
        location_updated_at: u.location_updated_at,
      });
      setPinMode(false);
      setDraft(null);
      setMessage('บันทึกตำแหน่งแล้ว ศูนย์บัญชาการเห็นตำแหน่งของคุณ');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  function updateFromGps() {
    if (!navigator.geolocation) {
      setError(new Error('อุปกรณ์นี้ไม่รองรับ GPS กรุณาปักหมุดเอง'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFocus({ ...p, zoom: 16 });
        saveLocation(p);
      },
      () => {
        setLocating(false);
        setError(new Error('ระบุตำแหน่งด้วย GPS ไม่ได้ กรุณาปักหมุดเองบนแผนที่'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function accept(r) {
    setAccepting(true);
    setError(null);
    try {
      await api(`/requests/${r.id}/accept`, { method: 'PATCH' });
      setMessage(`รับเคส ${r.case_no} แล้ว ดูรายละเอียดในหน้าภารกิจ`);
      await requests.refresh();
    } catch (err) {
      setError(err);
      requests.refresh();
    } finally {
      setAccepting(false);
    }
  }

  function choose(r) {
    setSelectedId(r.id);
    setFocus({ lat: r.lat, lng: r.lng });
    setMessage(null);
  }

  return (
    <div className="screen-h relative flex flex-col md:block">
      <div className="relative min-h-0 flex-1 md:absolute md:inset-0">
        <h1 className="sr-only">แผนที่เคสสำหรับหน่วยกู้ภัย</h1>
        <MapView
          requests={all}
          shelters={shelters.data || []}
          show={{ distributions: false, rescuers: false }}
          selected={selectedId ? { type: 'request', id: selectedId } : null}
          onSelect={(type, item) => type === 'request' && choose(item)}
          focus={focus}
          me={!pinMode && myPos ? { ...myPos, label: 'ฉัน' } : null}
          picker={pinMode ? { value: draft, onChange: setDraft, icon: LifeBuoy, color: '#0f172a' } : undefined}
          onLocate={pinMode ? setDraft : undefined}
          locateClassName="bottom-8 md:bottom-4"
        />

        {/* แถบด้านบน: ตำแหน่งของฉัน */}
        <div className="absolute inset-x-3 top-3 z-[600] md:left-[25.5rem] md:right-auto md:w-96">
          {pinMode ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-ink p-3 text-white shadow-xl">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Hand className="size-4" aria-hidden />
                แตะบนแผนที่หรือลากหมุดไปยังตำแหน่งของคุณ
              </p>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  className="flex-1"
                  disabled={!draft}
                  loading={saving}
                  onClick={() => saveLocation({ lat: draft.lat, lng: draft.lng })}
                >
                  บันทึกตำแหน่ง
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPinMode(false);
                    setDraft(null);
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-3 shadow-[var(--shadow-float)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
                <LifeBuoy className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user?.team_name || user?.full_name}</p>
                <p className="truncate text-xs text-muted">
                  {myPos ? `ตำแหน่งอัปเดต ${timeAgo(user.location_updated_at)}` : 'ยังไม่ได้มาร์คตำแหน่ง'}
                </p>
              </div>
              <Button size="sm" variant="safety" onClick={updateFromGps} loading={locating || saving} aria-label="อัปเดตตำแหน่งด้วย GPS">
                {!(locating || saving) && <Crosshair className="size-4" aria-hidden />}
                GPS
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPinMode(true);
                  setDraft(myPos);
                  setSelectedId(null);
                }}
              >
                ปักหมุด
              </Button>
            </div>
          )}
        </div>
      </div>

      <section
        aria-label="รายการเคส"
        className="relative z-[700] -mt-4 flex max-h-[48dvh] shrink-0 flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-sheet)] md:absolute md:bottom-4 md:left-4 md:top-4 md:mt-0 md:max-h-none md:w-96 md:rounded-3xl md:shadow-xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          {message && (
            <div role="status" className="mb-3 flex items-start gap-2 rounded-xl bg-shelter-soft p-3 text-sm text-shelter">
              <p className="flex-1">{message}</p>
              <button onClick={() => setMessage(null)} aria-label="ปิดข้อความ" className="cursor-pointer">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}
          <div className="mb-3">
            <ErrorBanner error={error || requests.error} />
          </div>

          {mine.length > 0 && !selected && (
            <Link
              href="/rescuer/missions"
              className="mb-4 flex items-center gap-3 rounded-2xl border border-safety/40 bg-safety-soft p-3 hover:bg-blue-100"
            >
              <ClipboardList className="size-5 text-safety-dark" aria-hidden />
              <span className="flex-1 font-semibold">ภารกิจที่กำลังดำเนินการ {mine.length} เคส</span>
              <ChevronRight className="size-5 text-safety-dark" aria-hidden />
            </Link>
          )}

          {selected ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="-ml-2 flex min-h-10 w-fit cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-safety-dark hover:bg-safety-soft"
              >
                <ChevronLeft className="size-4" aria-hidden />
                กลับไปรายการ
              </button>
              <RequestDetail request={selected} distance={distanceKm(myPos, selected)} showPrivate />
              {selected.status === 'pending' ? (
                <Button size="lg" onClick={() => accept(selected)} loading={accepting}>
                  รับเคสนี้
                </Button>
              ) : selected.assigned_to === user?.id ? (
                <Button as={Link} href="/rescuer/missions" variant="safety" size="lg">
                  ไปที่ภารกิจของฉัน
                </Button>
              ) : (
                <p className="rounded-xl bg-slate-100 p-3 text-sm text-muted">
                  เคสนี้มีทีม {selected.rescuer_team || ''} รับผิดชอบแล้ว
                </p>
              )}
              <ContactActions lat={selected.lat} lng={selected.lng} phone={selected.phone} phoneLabel="โทรหาผู้แจ้ง" />
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-bold">เคสรอความช่วยเหลือ ({pending.length})</h2>
              <p className="mb-2 text-sm text-muted">
                {myPos ? 'เรียงจากใกล้ตำแหน่งของคุณที่สุด' : 'มาร์คตำแหน่งเพื่อเรียงเคสตามระยะทาง'}
              </p>
              {pending.length === 0 && !requests.loading && (
                <p className="py-6 text-center text-sm text-muted">ไม่มีเคสที่รอความช่วยเหลือ</p>
              )}
              <ul className="divide-y divide-line">
                {pending.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => choose(r)}
                      className="flex w-full cursor-pointer items-center gap-3 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="tabular font-bold">{r.case_no}</span>
                          <UrgencyBadge urgency={r.urgency} />
                        </div>
                        <p className="truncate text-sm text-muted">
                          {r.people_count} คน
                          {vulnerableLabels(r).length > 0 && ` · ${vulnerableLabels(r).join(', ')}`} ·{' '}
                          {timeAgo(r.created_at)}
                        </p>
                      </div>
                      {r.distance != null && (
                        <span className={cx('tabular shrink-0 text-sm font-semibold', r.distance < 2 ? 'text-shelter' : 'text-muted')}>
                          {formatDistance(r.distance)}
                        </span>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
