'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import Header from '@/components/Header';
import { products } from '@/data/products';
import { useLiff } from '@/context/LiffContext';

const CATEGORIES = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const { isReady, error, profile } = useLiff();

  const filtered =
    activeCategory === 'All'
      ? products
      : products.filter((p) => p.category === activeCategory);

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Initializing LINE LIFF…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Initialization Error</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Menu" />

      {/* Welcome banner */}
      {profile && (
        <div className="bg-line-green/10 border-b border-line-green/20 px-4 py-2">
          <p className="text-sm text-line-dark font-medium">
            👋 Welcome, {profile.displayName}!
          </p>
        </div>
      )}

      {/* Category filter */}
      <div className="sticky top-14 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-line-green text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 p-4">
        <p className="text-xs text-gray-400 mb-3">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
