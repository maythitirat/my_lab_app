'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLiff } from '@/context/LiffContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
}

export default function Header({ title, showBack = false, backHref = '/' }: HeaderProps) {
  const { totalItems } = useCart();
  const { profile } = useLiff();

  return (
    <header className="sticky top-0 z-50 bg-line-green text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {showBack && (
            <Link
              href={backHref}
              className="p-1 -ml-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {profile?.pictureUrl && (
            // Using <img> intentionally for cross-origin LINE CDN avatar
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
          )}
          <Link
            href="/cart"
            className="relative p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label={`Cart (${totalItems} items)`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center leading-none">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
