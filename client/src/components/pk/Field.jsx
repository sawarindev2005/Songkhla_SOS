'use client';

import { useId } from 'react';
import { WarningIcon } from './icons';
import { cn } from './cn';

// ช่องกรอกแบบเดียวกับ TextField ใช้กับ input / select ที่หน้าเจ้าหน้าที่ประกอบเอง
export const inputClass =
  'h-11 w-full rounded-lg border border-line2 bg-white px-3.5 text-lg text-ink placeholder:text-t3 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-acc aria-[invalid=true]:border-red';

/** children เป็นฟังก์ชัน รับ id / aria-describedby / aria-invalid ไปใส่ช่องกรอกเอง */
export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-base font-medium text-ink">
        {label}
        {required && <span className="text-red"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 font-body text-sm text-red-tx">
          <WarningIcon size={16} weight="bold" className="shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="font-body text-sm text-t3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
