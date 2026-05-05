import { Plus_Jakarta_Sans } from 'next/font/google';

import type { Metadata } from 'next';

import NotificationListener from '@/components/notification-listener';
import { AuthProvider } from '@/lib/auth-context';
import { QueueProvider } from '@/lib/queue-context';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlayMyJam',
  description: 'Queue up your favorite tracks at your local venue.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={plusJakarta.variable}
    >
      <head />
      <body className="bg-background-dark font-display min-h-screen text-white antialiased">
        <QueueProvider>
          <AuthProvider>
            <NotificationListener />
            {children}
          </AuthProvider>
        </QueueProvider>
      </body>
    </html>
  );
}
