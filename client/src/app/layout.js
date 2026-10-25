import { IBM_Plex_Sans_Thai, IBM_Plex_Sans_Thai_Looped } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { FormViewport } from '@/components/pk/FormViewport';

const plex = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
});

const plexLooped = IBM_Plex_Sans_Thai_Looped({
  subsets: ['thai', 'latin'],
  weight: ['400', '500'],
  variable: '--font-plex-looped',
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
  interactiveWidget: 'resizes-visual',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${plex.variable} ${plexLooped.variable}`}>
      <body className="min-h-dvh antialiased">
        <AuthProvider><FormViewport />{children}</AuthProvider>
      </body>
    </html>
  );
}
