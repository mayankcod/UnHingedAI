import { DM_Mono, Fredoka } from 'next/font/google';
import SessionProvider from '@/components/SessionProvider';
import './globals.css';

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const fredoka = Fredoka({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-fredoka',
  display: 'swap',
});

export const metadata = {
  title: 'Unhinged AI — delightfully unlicensed',
  description: 'Powered by questionable confidence',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dmMono.variable} ${fredoka.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
