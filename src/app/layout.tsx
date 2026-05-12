import type { Metadata } from 'next';
import { Geist, Geist_Mono, Cormorant_Garamond } from 'next/font/google';
import { Toaster } from 'sonner';
import { ChatProvider } from '@/components/chat/ChatProvider';
import './globals.css';

const sans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

const display = Cormorant_Garamond({
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'GrandMaster.mn — Шатрын мастер болох замналд',
    template: '%s · GrandMaster.mn',
  },
  description:
    'Монголын хамгийн дэвшилтэт онлайн шатрын академи. ' +
    'Интерактив хичээл, гросмастер багш нар, өөрийн хурдаар суралцах боломж. ' +
    'Анхан шатнаас гросмастер хүртэл.',
  keywords: ['шатар', 'chess', 'GrandMaster', 'Монгол', 'хичээл', 'академи', 'grandmaster.mn'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'GrandMaster.mn — Шатрын онлайн академи',
    description: 'Premium шатрын академи — өөрийн хурдаар, гросмастер багш нартай',
    locale: 'mn_MN',
    type: 'website',
    siteName: 'GrandMaster.mn',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'GrandMaster.mn — Шатрын мастер болох замналд',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrandMaster.mn',
    description: 'Шатрын мастер болох замналд',
    images: ['/og-image.svg'],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className="dark">
      <body className={`${sans.variable} ${mono.variable} ${display.variable} font-sans`}>
        {children}
        <ChatProvider />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(10, 10, 11, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
            },
          }}
        />
      </body>
    </html>
  );
}
