import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'EMLAKTAKAZAN | Güvenle keşfet, doğru yatırım yap',
  description: 'Emlak ofisleri ve yatırımcılar için modern gayrimenkul keşif platformu.',
  icons: { icon: '/logo.jpg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body className={`${inter.variable} ${playfair.variable}`}>{children}</body></html>;
}
