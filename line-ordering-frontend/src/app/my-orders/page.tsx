'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiff } from '@/context/LiffContext';
import { getMyOrders } from '@/lib/api';
import { Order } from '@/types';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'ยืนยันแล้ว',  color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิกแล้ว', color: 'bg-red-100 text-red-600' },
};

export default function MyOrdersPage() {
  const { profile, isReady } = useLiff();
  const lineUserId = profile?.userId ?? '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !lineUserId) return;
    getMyOrders(lineUserId)
      .then(setOrders)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, lineUserId]);

  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-line-green text-white shadow-md">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-base font-bold">รายการสั่งซื้อของฉัน</h1>
          {profile && <p className="text-xs text-white/80">{profile.displayName}</p>}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 pb-10">
        {error && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">😕</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!error && orders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold text-gray-500">ยังไม่มีคำสั่งซื้อ</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => {
            const statusInfo = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
            const date = new Date(order.createdAt).toLocaleDateString('th-TH', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            return (
              <Link key={order.id} href={`/orders/${order.id}`} className="block">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 active:scale-[0.98] transition-transform">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">ออเดอร์ #{order.id}</p>
                      <p className="text-xs text-gray-400">{date}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Items summary */}
                  <p className="text-xs text-gray-500 mb-2 truncate">
                    {order.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="font-bold text-red-500">฿{order.totalPrice.toLocaleString()}</p>
                    {order.trackingNumber && (
                      <span className="text-[11px] bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                        📦 {order.trackingNumber}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
