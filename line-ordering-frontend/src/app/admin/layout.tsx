'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLiff } from '@/context/LiffContext';

const ADMIN_USER_ID = ( process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '' ).trim();

const NAV_ITEMS = [
  { href: '/admin', label: 'หน้าหลัก', icon: '🏠', exact: true },
  { href: '/admin/orders', label: 'ออเดอร์', icon: '📋', exact: false },
  { href: '/admin/products', label: 'สินค้า', icon: '📦', exact: false },
  { href: '/admin/customers', label: 'ลูกค้า', icon: '👥', exact: false },
  { href: '/admin/create-order', label: 'สร้างออเดอร์', icon: '🛒', exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, isReady } = useLiff();
  const router = useRouter();
  const pathname = usePathname();

  const lineUserId = profile?.userId ?? '';
  const isAdmin = !!ADMIN_USER_ID && lineUserId === ADMIN_USER_ID;

  useEffect(() => {
    if (isReady && !isAdmin) {
      router.replace('/');
    }
  }, [isReady, isAdmin, router]);

  // Show spinner while LIFF initializes or while redirecting
  if (!isReady || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {children}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-1px_0_rgba(0,0,0,0.06)]"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-line-green' : 'text-gray-400'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 bg-line-green rounded-b-full" />
                )}
                <span className="text-xl leading-none">{item.icon}</span>
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
