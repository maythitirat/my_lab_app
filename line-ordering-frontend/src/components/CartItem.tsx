'use client';

import Image from 'next/image';
import { CartItem as CartItemType } from '@/types';
import { useCart } from '@/context/CartContext';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      {/* Thumbnail */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
        <Image
          src={item.product.imageUrl ?? item.product.image ?? 'https://picsum.photos/seed/default/400/400'}
          alt={item.product.name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
        <p className="text-xs text-gray-400 mb-1">{item.product.category}</p>
        <p className="text-sm font-bold text-line-green">
          ฿{(item.product.price * item.quantity).toLocaleString()}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button
          onClick={() => removeFromCart(item.product.id)}
          className="text-gray-300 hover:text-red-400 transition-colors"
          aria-label={`Remove ${item.product.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
            className="w-7 h-7 rounded-full border-2 border-line-green text-line-green flex items-center justify-center hover:bg-line-green hover:text-white transition-colors"
            aria-label="Decrease quantity"
          >
            <span className="text-base font-bold leading-none">−</span>
          </button>
          <span className="w-5 text-center text-sm font-bold text-gray-800">
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
            className="w-7 h-7 rounded-full border-2 border-line-green text-line-green flex items-center justify-center hover:bg-line-green hover:text-white transition-colors"
            aria-label="Increase quantity"
          >
            <span className="text-base font-bold leading-none">+</span>
          </button>
        </div>
      </div>
    </div>
  );
}
