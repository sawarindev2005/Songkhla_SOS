/** icon + title ไม่บังคับ: ไม่ส่งมา = ข้อความเรียบบรรทัดเดียว */
export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-7 text-center font-body text-t3">
      {Icon && <Icon size={40} className="text-line2" aria-hidden />}
      {title && <p className="font-ui text-lg font-semibold text-ink">{title}</p>}
      {children && <div className="max-w-sm">{children}</div>}
    </div>
  );
}
