import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QueueProvider } from "@/lib/queue-context";
import NotificationListener from "@/components/notification-listener";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PlayMyJam",
  description: "Queue up your favorite tracks at your local venue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background-dark font-display text-white antialiased">
        <QueueProvider>
          <NotificationListener />
          {children}
        </QueueProvider>
      </body>
    </html>
  );
}
