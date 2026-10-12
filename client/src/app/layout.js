import { Noto_Sans_Thai } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const notoThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

export const metadata = {
  title: 'ระบบขอความช่วยเหลือน้ำท่วมหาดใหญ่',
  description: 'ขอความช่วยเหลือ ดูจุดพักพิงและจุดแจกจ่ายอาหาร ในพื้นที่อำเภอหาดใหญ่',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#dc2626',
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={notoThai.variable}>
      <body className="min-h-dvh antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
