import { IBM_Plex_Sans_Thai, IBM_Plex_Sans_Thai_Looped } from 'next/font/google';
import { PublicShell } from '@/components/pk/PublicShell';

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

export default function PublicLayout({ children }) {
  return <PublicShell className={`${plex.variable} ${plexLooped.variable}`}>{children}</PublicShell>;
}
