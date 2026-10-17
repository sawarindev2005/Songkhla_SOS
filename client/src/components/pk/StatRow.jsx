import { cn } from './cn';

const TONE = { ink: 'text-ink', red: 'text-red', ok: 'text-ok', org: 'text-org-tx' };

/** boxed = กล่องมีเส้นขอบ ตัวเลขกลาง (หน้ารายละเอียด) | hero = ตัวเลขใหญ่กึ่งกลางเหนือข้อความ (แผ่นสรุปบนแผนที่) */
export function StatRow({ items, variant = 'boxed' }) {
  const hero = variant === 'hero';
  return (
    <div
      className={cn('grid', hero ? 'py-0' : 'rounded-lg border border-line py-2.5 short:py-1.5')}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((s, i) => (
        <div key={i} className={cn('flex flex-col items-center px-1 text-center', i > 0 && 'border-l border-line')}>
          <span className={cn('tabular-nums', hero ? 'text-6xl font-bold' : 'text-xl font-semibold', TONE[s.tone ?? 'ink'])}>{s.value}</span>
          <span className="font-body text-xs text-t2">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
