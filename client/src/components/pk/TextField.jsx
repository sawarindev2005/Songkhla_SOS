'use client';
import { useId } from 'react';
import { cn } from './cn';

export function TextField({ label, prefix, hint, error, className, id, multiline = false, ...input }) {
  const auto = useId();
  const fid = id ?? auto;
  const note = error ?? hint;
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-2 block text-base font-medium">{label}</label>
      <div className={cn(
        'flex items-center gap-3 rounded-lg border bg-white px-3.5',
        multiline ? 'py-3' : 'h-13',
        'focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-acc',
        error ? 'border-red' : 'border-line2',
      )}>
        {prefix && <span className="flex items-center gap-3 text-xl font-medium text-t2">{prefix}<span aria-hidden className="h-6 w-px bg-line2" /></span>}
        <Tag
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${fid}-note` : undefined}
          className={cn('min-w-0 flex-1 bg-transparent font-medium text-ink outline-none placeholder:text-t3', multiline ? 'resize-none font-body text-lg' : 'text-xl')}
          {...input}
        />
      </div>
      {note && <p id={`${fid}-note`} className={cn('mt-2 font-body text-sm', error ? 'text-red-tx' : 'text-t3')}>{note}</p>}
    </div>
  );
}

export function SearchField({ label, value, onChange, placeholder, icon }) {
  return (
    <label className="flex h-11 w-full items-center gap-2 rounded-md border border-line bg-s1 px-3 focus-within:outline-2 focus-within:outline-acc">
      {icon}
      <input type="search" aria-label={label} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-t3" />
    </label>
  );
}
