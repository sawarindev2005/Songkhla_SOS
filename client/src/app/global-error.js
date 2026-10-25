'use client';

// The root layout (including its fonts and styles) is unavailable in this fallback.
export default function GlobalError({ retry }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, color: '#111827', background: '#fff', fontFamily: 'Tahoma, sans-serif' }}>
        <title>เปิดหน้าเว็บไม่ได้ · ช่วยน้ำท่วมหาดใหญ่</title>
        <main style={{ maxWidth: 480, margin: 'auto', padding: 'max(24px, env(safe-area-inset-top)) 24px', lineHeight: 1.7 }}>
          <h1 style={{ fontSize: 24 }}>เปิดหน้าเว็บไม่ได้ชั่วคราว</h1>
          <p role="alert">เกิดข้อผิดพลาดระหว่างแสดงผล กรุณาลองอีกครั้ง</p>
          <button type="button" onClick={() => retry()} style={{ minHeight: 48, padding: '10px 20px', font: 'inherit', cursor: 'pointer' }}>ลองเปิดใหม่</button>
          <p>
            {/* Full navigation recovers even when the root layout/router has failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">กลับหน้าแผนที่</a>
          </p>
        </main>
      </body>
    </html>
  );
}
