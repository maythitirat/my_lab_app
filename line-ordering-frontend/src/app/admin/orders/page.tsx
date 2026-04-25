'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';
import { getAdminOrders, setOrderStatus, setOrderTracking } from '@/lib/api';
import { Order } from '@/types';

const ADMIN_USER_ID = ( process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '' ).trim();

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'รอดำเนินการ', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'ยืนยันแล้ว',  cls: 'bg-green-100  text-green-700'  },
  cancelled: { label: 'ยกเลิก',       cls: 'bg-red-100    text-red-600'    },
};

function statusInfo(status: string) {
  return STATUS_LABEL[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  });
}

function formatPrice(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0 });
}

const FILTER_OPTIONS = ['ทั้งหมด', 'รอดำเนินการ', 'ยืนยันแล้ว', 'ยกเลิก'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

const FILTER_STATUS: Record<FilterOption, string | null> = {
  'ทั้งหมด':     null,
  'รอดำเนินการ': 'pending',
  'ยืนยันแล้ว':  'confirmed',
  'ยกเลิก':      'cancelled',
};

export default function AdminOrdersPage() {
  const { profile, isReady } = useLiff();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('ทั้งหมด');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<number, string>>({});
  const [showTrackingInput, setShowTrackingInput] = useState<number | null>(null);

  const lineUserId = profile?.userId ?? '';
  const isAdmin = !!ADMIN_USER_ID && lineUserId === ADMIN_USER_ID;

  useEffect(() => {
    if (isReady && !isAdmin) router.replace('/');
  }, [isReady, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getAdminOrders(lineUserId)
      .then(setOrders)
      .catch(() => setErrorMsg('โหลดออเดอร์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [isAdmin, lineUserId]);

  // ── Filter + search ────────────────────────────────────────────────────────
  const filterStatus = FILTER_STATUS[filter];
  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        o.name.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        String(o.id).includes(q)
      );
    }
    return true;
  });

  // ── Quick action helpers ─────────────────────────────────────────────────
  const handleSetStatus = async (orderId: number, status: string) => {
    setActionLoading(orderId);
    try {
      const updated = await setOrderStatus(orderId, status, lineUserId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
    } catch (e: unknown) {
      alert((e as Error).message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetTracking = async (orderId: number) => {
    const val = (trackingInput[orderId] ?? '').trim();
    if (!val) return;
    setActionLoading(orderId);
    try {
      const updated = await setOrderTracking(orderId, val, lineUserId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, trackingNumber: updated.trackingNumber } : o)));
      setShowTrackingInput(null);
    } catch (e: unknown) {
      alert((e as Error).message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Repeat order helper ────────────────────────────────────────────────────
  const handleRepeat = (o: Order) => {
    const params = new URLSearchParams({
      customerId: o.lineUserId,
      name: o.name,
      phone: o.phone,
      addressLine: o.addressLine ?? '',
      subDistrict: o.subDistrict ?? '',
      district: o.district ?? '',
      province: o.province ?? '',
      postalCode: o.postalCode ?? '',
      paymentMethod: o.paymentMethod ?? 'cod',
    });
    router.push(`/admin/create-order?${params.toString()}`);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-red-500 text-sm">{errorMsg}</p>
        <button
          onClick={() => { setErrorMsg(null); setLoading(true); getAdminOrders(lineUserId).then(setOrders).catch(() => setErrorMsg('โหลดไม่สำเร็จ')).finally(() => setLoading(false)); }}
          className="mt-4 px-5 py-2 bg-line-green text-white rounded-xl text-sm"
        >ลองอีกครั้ง</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="ออเดอร์ทั้งหมด" />

      <div className="max-w-lg mx-auto px-4 pt-4 pb-28">
        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขออเดอร์"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-line-green"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filter === opt ? 'bg-line-green text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {opt}
              {opt === 'ทั้งหมด' && ` (${orders.length})`}
              {opt !== 'ทั้งหมด' && ` (${orders.filter((o) => o.status === FILTER_STATUS[opt]).length})`}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">ไม่พบออเดอร์</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((o) => {
              const st = statusInfo(o.status);
              const isExpanded = expandedId === o.id;
              return (
                <div key={o.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Card header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                    className="w-full text-left px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800 text-sm">#{o.id}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 truncate">{o.name}</p>
                        <p className="text-xs text-gray-400">{o.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">฿{formatPrice(Number(o.totalPrice))}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(o.createdAt)}</p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50">
                      {/* LINE User ID */}
                      <div className="mb-3 p-2.5 bg-blue-50 rounded-xl">
                        <p className="text-[10px] text-blue-500 font-semibold mb-0.5">LINE User ID</p>
                        <p className="text-xs text-blue-700 font-mono break-all">{o.lineUserId}</p>
                      </div>

                      {/* Address */}
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">ที่อยู่</p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {[o.addressLine, o.subDistrict, o.district, o.province, o.postalCode]
                            .filter(Boolean).join(' ')}
                        </p>
                      </div>

                      {/* Items */}
                      {o.items && o.items.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">รายการสินค้า</p>
                          <div className="flex flex-col gap-1">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700">{item.productName} ×{item.quantity}</span>
                                <span className="text-gray-600 font-medium">฿{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment method */}
                      <p className="text-xs text-gray-500 mb-3">
                        ชำระเงิน: <span className="font-medium text-gray-700">{o.paymentMethod === 'cod' ? 'เก็บเงินปลายทาง' : 'โอนเงิน'}</span>
                      </p>

                      {/* Quick Actions */}
                      <div className="flex flex-col gap-2 mt-1">
                        {/* Confirm / Cancel — only for pending */}
                        {o.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={actionLoading === o.id}
                              onClick={() => handleSetStatus(o.id, 'confirmed')}
                              className="py-2 rounded-xl bg-green-500 text-white text-sm font-bold disabled:opacity-50"
                            >
                              {actionLoading === o.id ? '…' : '✅ ยืนยัน'}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === o.id}
                              onClick={() => handleSetStatus(o.id, 'cancelled')}
                              className="py-2 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
                            >
                              {actionLoading === o.id ? '…' : '❌ ยกเลิก'}
                            </button>
                          </div>
                        )}

                        {/* Revert to pending — for confirmed */}
                        {o.status === 'confirmed' && (
                          <button
                            type="button"
                            disabled={actionLoading === o.id}
                            onClick={() => handleSetStatus(o.id, 'pending')}
                            className="w-full py-2 rounded-xl bg-yellow-400 text-white text-sm font-medium disabled:opacity-50"
                          >
                            🔄 คืนสถานะรอดำเนินการ
                          </button>
                        )}

                        {/* Set tracking number */}
                        {showTrackingInput === o.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="เลขพัสดุ"
                              value={trackingInput[o.id] ?? ''}
                              onChange={(e) => setTrackingInput((prev) => ({ ...prev, [o.id]: e.target.value }))}
                              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              onKeyDown={(e) => e.key === 'Enter' && handleSetTracking(o.id)}
                            />
                            <button
                              type="button"
                              disabled={actionLoading === o.id}
                              onClick={() => handleSetTracking(o.id)}
                              className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
                            >
                              {actionLoading === o.id ? '…' : 'บันทึก'}
                            </button>
                            <button type="button" onClick={() => setShowTrackingInput(null)} className="px-3 py-2 rounded-xl bg-gray-200 text-gray-600 text-sm">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowTrackingInput(o.id);
                              setTrackingInput((prev) => ({ ...prev, [o.id]: o.trackingNumber ?? '' }));
                            }}
                            className="w-full py-2 rounded-xl bg-blue-100 text-blue-700 text-sm font-medium"
                          >
                            📦 {o.trackingNumber ? `เลข: ${o.trackingNumber}` : 'ใส่เลขพัสดุ'}
                          </button>
                        )}

                        {/* Repeat order */}
                        <button
                          type="button"
                          onClick={() => handleRepeat(o)}
                          className="w-full py-2.5 rounded-xl bg-line-green text-white text-sm font-bold hover:bg-green-600 transition-colors"
                        >
                          🛒 สร้างออเดอร์ใหม่ให้ลูกค้านี้
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
