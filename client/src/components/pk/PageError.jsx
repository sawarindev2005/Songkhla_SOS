'use client';

import { useTransition } from 'react';
import { Button } from './Button';
import { WarningIcon } from './icons';

export function PageError({ retry }) {
  const [pending, startTransition] = useTransition();
  return (
    <section aria-labelledby="page-error-title" className="mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col justify-center gap-4 p-6">
      <WarningIcon size={36} className="text-red" aria-hidden />
      <h1 id="page-error-title" className="text-balance text-3xl font-bold">เปิดหน้านี้ไม่ได้ชั่วคราว</h1>
      <p role="alert" className="text-pretty text-base text-t2">เกิดข้อผิดพลาดระหว่างแสดงผล กรุณาลองอีกครั้ง หากยังเปิดไม่ได้ให้กลับหน้าแผนที่</p>
      <Button disabled={pending} onClick={() => startTransition(() => retry())}>{pending ? 'กำลังเปิดใหม่…' : 'ลองเปิดใหม่'}</Button>
      <Button href="/" variant="outline">กลับหน้าแผนที่</Button>
    </section>
  );
}
