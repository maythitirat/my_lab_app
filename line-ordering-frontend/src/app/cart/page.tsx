'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import CartItem from '@/components/CartItem';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { cart, totalPrice, clearCart } = useCart();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Cart" showBack backHref="/" />

      {cart.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Your cart is empty</p>
          <p className="text-sm text-gray-400 mb-6">Add items from the menu to get started</p>
          <Link
            href="/"
            className="px-8 py-3 bg-line-green text-white rounded-full font-semibold hover:bg-line-dark transition-colors shadow-sm"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          {/* Cart items list */}
          <div className="flex-1 p-4 pb-40 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">
                {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
              </p>
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
              >
                Clear all
              </button>
            </div>

            {cart.map((item) => (
              <CartItem key={item.product.id} item={item} />
            ))}
          </div>

          {/* Sticky bottom bar */}
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 shadow-lg px-4 pt-3 pb-5">
            {/* Line items summary */}
            <div className="space-y-1 mb-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between text-xs text-gray-400">
                  <span className="truncate pr-2">{item.product.name} ×{item.quantity}</span>
                  <span className="flex-shrink-0">฿{(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-xl font-bold text-line-green">
                ฿{totalPrice.toLocaleString()}
              </span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-line-green text-white text-center py-3.5 rounded-2xl font-bold text-base hover:bg-line-dark active:scale-95 transition-all shadow-sm"
            >
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
