import { cn } from './cn';

export function Steps({ labels, current }) {
  return (
    <ol className="grid gap-1.5 text-xs" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((l, i) => (
        <li key={l} aria-current={i === current ? 'step' : undefined}
          className={cn('flex flex-col gap-1.5 font-medium', i < current ? 'text-ink' : i === current ? 'font-semibold text-acc' : 'text-t3')}>
          <span aria-hidden className={cn('h-1 rounded-full', i <= current ? 'bg-acc' : 'bg-line')} />
          {l}
        </li>
      ))}
    </ol>
  );
}
