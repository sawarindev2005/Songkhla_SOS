'use client';

import { useRef, useState } from 'react';
import { PageHeader } from '@/components/StaffShell';
import { Badge } from '@/components/pk/Badge';
import { Button } from '@/components/pk/Button';
import { ConfirmDialog } from '@/components/pk/ConfirmDialog';
import { EmptyState } from '@/components/pk/EmptyState';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Field, inputClass } from '@/components/pk/Field';
import { Modal } from '@/components/pk/Modal';
import { Spinner } from '@/components/pk/Spinner';
import { useToast } from '@/components/pk/Toast';
import { MegaphoneIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@/components/pk/icons';
import { useInvalidFormFocus } from '@/hooks/useInvalidFormFocus';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { formSnapshot } from '@/lib/form-snapshot.mjs';
import { cn } from '@/components/pk/cn';

const EMPTY = { title: '', content: '', tone: 'info' };
const TONES = { info: 'ทั่วไป', org: 'แจ้งเตือน', red: 'เร่งด่วน' };

export default function AnnouncementsPage() {
  const { data, error, loading, refresh, updateData } = usePolling('/announcements');
  const toast = useToast();
  const focusInvalid = useInvalidFormFocus('announcement-form');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publicationChange, setPublicationChange] = useState(null);
  const publishingId = publicationChange?.id ?? null;
  const publicationPending = useRef(false);
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState(null);

  function open(item) {
    const form = item ? { title: item.title, content: item.content, tone: item.tone } : { ...EMPTY };
    setEditing({ id: item?.id, form, initial: formSnapshot(form) });
    setErrors({});
    setActionError(null);
  }
  function set(key, value) {
    setEditing((previous) => ({ ...previous, form: { ...previous.form, [key]: value } }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const form = editing.form;
    const invalid = {};
    if (!form.title.trim()) invalid.title = 'กรุณากรอกหัวข้อประกาศ';
    if (!form.content.trim()) invalid.content = 'กรุณากรอกรายละเอียดประกาศ';
    setErrors(invalid);
    if (Object.keys(invalid).length) { focusInvalid(); return; }
    setSaving(true);
    setActionError(null);
    try {
      await api(editing.id ? `/announcements/${editing.id}` : '/announcements', { method: editing.id ? 'PATCH' : 'POST', body: { ...form, title: form.title.trim(), content: form.content.trim() } });
      setEditing(null);
      toast(editing.id ? 'บันทึกเนื้อหาประกาศแล้ว' : 'บันทึกประกาศแล้ว กดเผยแพร่จากรายการเมื่อต้องการ', 4500);
      refresh();
    } catch (err) { setActionError(err); }
    finally { setSaving(false); }
  }
  async function togglePublication(item) {
    if (publicationPending.current) return;
    publicationPending.current = true;
    const isPublished = !Boolean(item.is_published);
    setPublicationChange({ id: item.id, isPublished });
    setActionError(null);
    try {
      const updated = await api(`/announcements/${item.id}`, { method: 'PATCH', body: { is_published: isPublished } });
      updateData((rows) => rows.map((row) => row.id === item.id ? { ...row, ...updated } : row));
      toast(item.is_published ? 'ซ่อนประกาศแล้ว ประชาชนจะไม่เห็นประกาศนี้' : 'เผยแพร่ประกาศแล้ว', 4500);
    } catch (err) { setActionError(err); }
    finally {
      publicationPending.current = false;
      setPublicationChange(null);
    }
  }
  async function remove() {
    if (saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await api(`/announcements/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      toast('ลบประกาศแล้ว', 4500);
      refresh();
    } catch (err) { setActionError(err); }
    finally { setSaving(false); }
  }
  const form = editing?.form;
  return (
    <>
      <PageHeader title="จัดการประกาศ" desc="เขียนและบันทึกเนื้อหา แล้วเปิดหรือปิดสวิตช์เผยแพร่จากรายการด้านล่าง" actions={<Button size="sm" block={false} pending={publishingId !== null} icon={<PlusIcon size={18} aria-hidden />} onClick={() => open(null)}>เขียนประกาศ</Button>} />
      <ErrorBanner error={error} onRetry={refresh} />
      {!editing && !deleting && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}
      {!loading && !error && data?.length === 0 && <EmptyState icon={MegaphoneIcon} title="ยังไม่มีประกาศ">กด “เขียนประกาศ” เพื่อแจ้งข่าวให้ประชาชน</EmptyState>}
      <ul className="mt-4 grid gap-4 xl:grid-cols-2">
        {(data || []).map((item) => {
          const isPublished = publicationChange?.id === item.id ? publicationChange.isPublished : Boolean(item.is_published);
          return (
          <li key={item.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone={isPublished ? 'ok' : 'gray'}>{isPublished ? 'เผยแพร่แล้ว' : 'ซ่อนอยู่'}</Badge>
              <Badge tone={item.tone === 'red' ? 'red' : item.tone === 'org' ? 'orange' : 'accent'}>{TONES[item.tone]}</Badge>
            </div>
            <h2 className="break-words text-balance text-xl font-bold">{item.title}</h2>
            <p className="line-clamp-3 whitespace-pre-wrap break-words text-pretty font-body text-base text-t2">{item.content}</p>
            <p className="text-sm text-t3">{item.author_name || 'ผู้ดูแลระบบ'} · แก้ไข {formatDateTime(item.updated_at)}</p>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <label className={cn('flex min-h-11 w-full items-center gap-2 text-base font-medium sm:mr-auto sm:w-auto', publishingId !== null ? 'cursor-wait' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`เผยแพร่ประกาศ ${item.title}`}
                  aria-busy={publishingId === item.id || undefined}
                  checked={isPublished}
                  disabled={publishingId !== null}
                  onChange={() => togglePublication(item)}
                  className="peer sr-only"
                />
                <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full border border-line2 bg-line2 peer-checked:border-acc peer-checked:bg-acc peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acc motion-safe:transition-colors motion-safe:duration-150">
                  <span className={cn('absolute left-0.75 top-0.75 size-5 rounded-full bg-white shadow-sm motion-safe:transition-transform motion-safe:duration-150', isPublished ? 'translate-x-5' : 'translate-x-0')} />
                </span>
                <span>เผยแพร่</span>
              </label>
              <Button variant="outline" size="sm" block={false} pending={publishingId !== null} icon={<PencilSimpleIcon size={18} aria-hidden />} onClick={() => open(item)} aria-label={`แก้ไขประกาศ ${item.title}`}>แก้ไข</Button>
              <Button variant="dangerOutline" size="sm" block={false} pending={publishingId !== null} icon={<TrashIcon size={18} aria-hidden />} onClick={() => { setActionError(null); setDeleting(item); }} aria-label={`ลบประกาศ ${item.title}`}>ลบ</Button>
            </div>
          </li>
          );
        })}
      </ul>
      <Modal open={Boolean(editing)} title={editing?.id ? 'แก้ไขประกาศ' : 'เขียนประกาศ'} busy={saving} dirty={Boolean(editing && formSnapshot(form) !== editing.initial)} onClose={() => setEditing(null)} footer={(requestClose) => <><Button variant="outline" size="sm" block={false} disabled={saving} onClick={requestClose}>ยกเลิก</Button><Button size="sm" block={false} type="submit" form="announcement-form" loading={saving}>บันทึก</Button></>}>
        {form && <form id="announcement-form" onSubmit={save} noValidate className="flex flex-col gap-4">
          <fieldset disabled={saving} className="contents">
            <Field label="หัวข้อประกาศ" required error={errors.title} hint="ไม่เกิน 160 ตัวอักษร จะแสดงบนแถบข่าว">
              {(props) => <input {...props} className={inputClass} maxLength={160} value={form.title} onChange={(event) => set('title', event.target.value)} />}
            </Field>
            <Field label="รายละเอียดประกาศ" required error={errors.content} hint="ผู้ใช้แตะประกาศเพื่ออ่านรายละเอียดได้ ไม่เกิน 5,000 ตัวอักษร">
              {(props) => <textarea {...props} className={`${inputClass} h-auto min-h-36 py-3`} rows={6} maxLength={5000} value={form.content} onChange={(event) => set('content', event.target.value)} />}
            </Field>
            <Field label="ระดับประกาศ">
              {(props) => <select {...props} className={inputClass} value={form.tone} onChange={(event) => set('tone', event.target.value)}>{Object.entries(TONES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
            </Field>
            <p className="text-sm text-t2">บันทึกเนื้อหา แล้วเปิดหรือปิดสวิตช์ “เผยแพร่” จากรายการประกาศ</p>
            <ErrorBanner error={actionError} />
          </fieldset>
        </form>}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="ลบประกาศ" confirmLabel="ลบประกาศ" confirmVariant="danger" initialFocus="cancel" loading={saving} onConfirm={remove} onCancel={() => setDeleting(null)}>
        <p>ลบ “{deleting?.title}” ถาวรหรือไม่? หากต้องการหยุดแสดงชั่วคราว ให้ปิดสวิตช์ “เผยแพร่” จากรายการแทน</p>
        <ErrorBanner error={actionError} />
      </ConfirmDialog>
    </>
  );
}
