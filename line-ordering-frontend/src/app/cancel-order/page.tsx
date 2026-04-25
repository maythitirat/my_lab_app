'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';
import { getMyOrders, cancelOrder } from '@/lib/api';
import { Order } from '@/types';

type PageState = 'loading' | 'list' | 'confirm' | 'done' | 'error';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'รอดำเนินการ', cls: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: 'ยืนยันแล้ว', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: 'ยกเลิกแล้ว', cls: 'bg-red-100 text-red-600' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

export default function CancelOrderPage() {
  const { profile, isReady, closeLiff } = useLiff();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isReady || !profile?.userId) return;
    getMyOrders(profile.userId)
      .then((data: Order[]) => {
        setOrders(data);
        setPageState('list');
      })
      .catch(() => {
        setErrorMsg('ไม่สามารถโหลดข้อมูลออเดอร์ได้');
        setPageState('error');
      });
  }, [isReady, profile]);

  const handleSelectOrder = (order: Order) => {
    setSelected(order);
    setPageState('confirm');
  };

  const handleConfirmCancel = async () => {
    if (!selected || !profile?.userId) return;
    setCancelling(true);
    setErrorMsg(null);
    try {
      await cancelOrder(selected.id, profile.userId);
      setPageState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      setPageState('confirm');
    } finally {
      setCancelling(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (!isReady || pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="ยกเลิกออเดอร์" />
        <div className="flex flex-col items-center justify-center px-6 mt-20 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-600 text-sm">{errorMsg}</p>
          <button
            className="mt-6 px-6 py-2.5 rounded-xl bg-line-green text-white text-sm font-semibold"
            onClick={closeLiff}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────────────────────
  if (pageState === 'done') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="ยกเลิกออเดอร์" />
        <div className="flex flex-col items-center justify-center px-6 mt-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">ยกเลิกออเดอร์แล้ว</h2>
          <p className="text-sm text-gray-500">ออเดอร์ #{selected?.id} ถูกยกเลิกเรียบร้อยแล้ว</p>
          <button
            className="mt-8 w-full max-w-xs py-3.5 rounded-2xl bg-line-green text-white font-semibold text-sm shadow"
            onClick={closeLiff}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  // ─── Confirm dialog ──────────────────────────────────────────────────────
  if (pageState === 'confirm' && selected) {
    const BKK_MS = 7 * 60 * 60 * 1000;
    const d = new Date(new Date(selected.createdAt).getTime() + BKK_MS);
    const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const timeStr = `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="ยกเลิกออเดอร์" />
        <div className="max-w-md mx-auto px-4 pt-6 pb-8">
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base font-bold text-gray-800">ยืนยันการยกเลิกออเดอร์</h2>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">ออเดอร์ #{selected.id} · {dateStr} {timeStr}</p>
              <p className="font-semibold text-gray-800 mb-2">{selected.name}</p>
              <div className="space-y-1">
                {selected.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    {item.productName}
                    {item.quantity > 1 && ` x${item.quantity}`}
                    <span className="text-gray-400 ml-1">
                      ฿{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </p>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-red-200 flex justify-between">
                <span className="text-sm font-semibold text-gray-700">ยอดรวม</span>
                <span className="text-sm font-bold text-gray-900">
                  ฿{Number(selected.totalPrice).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-red-500 font-medium mb-4 text-center">
              การยกเลิกไม่สามารถย้อนกลับได้
            </p>

            {errorMsg && (
              <p className="text-xs text-red-500 text-center mb-3">{errorMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
                onClick={() => setPageState('list')}
                disabled={cancelling}
              >
                กลับ
              </button>
              <button
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                onClick={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling && (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Order list ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="ยกเลิกออเดอร์" />
      <div className="max-w-md mx-auto px-4 pt-6 pb-8">
        <h1 className="text-lg font-bold text-gray-800 mb-1">ยกเลิกออเดอร์</h1>
        <p className="text-xs text-gray-500 mb-4">เลือกออเดอร์ที่ต้องการยกเลิก (เฉพาะรอดำเนินการ)</p>

        {pendingOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 text-sm">ไม่มีออเดอร์ที่สามารถยกเลิกได้</p>
            <p className="text-gray-400 text-xs mt-1">ออเดอร์ที่ยืนยันแล้วหรือยกเลิกแล้วไม่สามารถแก้ไขได้</p>
            <button
              className="mt-6 px-6 py-2.5 rounded-xl bg-line-green text-white text-sm font-semibold"
              onClick={closeLiff}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => {
              const BKK_MS = 7 * 60 * 60 * 1000;
              const d = new Date(new Date(order.createdAt).getTime() + BKK_MS);
              const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
              const timeStr = `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleSelectOrder(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-400">#{order.id} · {dateStr} {timeStr}</span>
                      <p className="font-semibold text-gray-800 text-sm">{order.name}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="space-y-0.5 mb-3">
                    {order.items.map((item, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        {item.productName}{item.quantity > 1 && ` x${item.quantity}`}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">
                      ฿{Number(order.totalPrice).toLocaleString()}
                    </span>
                    <span className="text-xs text-red-500 font-medium">กดเพื่อยกเลิก →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Also show non-pending so user can see full history */}
        {orders.filter((o) => o.status !== 'pending').length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-gray-400 mb-2 font-medium">ออเดอร์อื่นๆ</p>
            <div className="space-y-2">
              {orders
                .filter((o) => o.status !== 'pending')
                .map((order) => (
                  <div key={order.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                    <div>
                      <span className="text-xs text-gray-400">#{order.id}</span>
                      <p className="text-sm text-gray-600">{order.name}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
