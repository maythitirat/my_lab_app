import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LiffProvider } from '@/context/LiffContext';
import { CartProvider } from '@/context/CartContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LINE LIFF Ordering',
  description: 'Order food and drinks via LINE LIFF',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LiffProvider>
          <CartProvider>
            <main className="min-h-screen max-w-lg mx-auto">
              {children}
            </main>
          </CartProvider>
        </LiffProvider>
      </body>
    </html>
  );
}
