'use client';

import Image from 'next/image';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart } = useCart();
  const cartItem = cart.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
      {/* Image */}
      <div className="relative aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
        {quantity > 0 && (
          <span className="absolute top-2 right-2 bg-line-green text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow">
            {quantity}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <span className="text-xs text-gray-400 mb-0.5">{product.category}</span>
        <p className="text-sm font-semibold text-gray-800 leading-tight flex-1 line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-line-green">
            ฿{product.price.toLocaleString()}
          </span>
          <button
            onClick={() => addToCart(product)}
            className="bg-line-green text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-line-dark active:scale-95 transition-all shadow-sm"
            aria-label={`Add ${product.name} to cart`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
