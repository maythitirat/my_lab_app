'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLiff } from '@/context/LiffContext';
import { getOrder } from '@/lib/api';
import { Order } from '@/types';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'ยืนยันแล้ว',  color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิกแล้ว', color: 'bg-red-100 text-red-600' },
};

const PAYMENT_LABEL: Record<string, string> = {
  cod:      'เก็บเงินปลายทาง',
  transfer: 'โอนจ่าย',
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const { profile, isReady } = useLiff();
  const lineUserId = profile?.userId ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !lineUserId) return;
    getOrder(orderId, lineUserId)
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, lineUserId, orderId]);

  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <p className="text-5xl mb-3">😕</p>
        <p className="text-gray-600 font-semibold">ไม่พบออเดอร์</p>
        <p className="text-sm text-gray-400 mt-1">{error}</p>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
  const createdDate = new Date(order.createdAt).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-line-green text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <div>
            <h1 className="text-base font-bold">รายละเอียดคำสั่งซื้อ</h1>
            <p className="text-xs text-white/80">#{order.id} · {createdDate}</p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 pb-10 space-y-3">

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-blue-500 mb-1">📦 เลขพัสดุ</p>
            <p className="text-lg font-mono font-bold text-blue-700">{order.trackingNumber}</p>
            <p className="text-xs text-blue-400 mt-1">สามารถนำเลขนี้ไปตรวจสอบสถานะได้ที่เว็บไซต์ขนส่ง</p>
          </div>
        )}

        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อมูลผู้สั่ง</p>
          <div className="grid gap-2">
            <Row icon="👤" label="ชื่อ" value={order.name} />
            <Row icon="📞" label="เบอร์โทร" value={order.phone} />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ที่อยู่จัดส่ง</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {order.addressLine}<br />
            {order.subDistrict && `แขวง/ตำบล ${order.subDistrict} `}
            {order.district && `เขต/อำเภอ ${order.district} `}
            {order.province && `${order.province} `}
            {order.postalCode}
          </p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">รายการสินค้า</p>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">จำนวน {item.quantity} ชิ้น × ฿{item.price.toLocaleString()}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800 flex-shrink-0">
                  ฿{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
            <p className="text-sm text-gray-500">การชำระเงิน</p>
            <p className="text-sm text-gray-600">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
          </div>
          <div className="flex justify-between items-center mt-1">
            <p className="font-bold text-gray-800">ยอดรวม</p>
            <p className="font-bold text-lg text-red-500">฿{order.totalPrice.toLocaleString()}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="flex flex-col gap-2">
            {order.trackingNumber && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(order.trackingNumber!).then(() => alert('คัดลอกเลขพัสดุแล้ว ✅'));
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm active:scale-95 transition-transform"
              >
                📋 คัดลอกเลขพัสดุ
              </button>
            )}
            <a
              href="https://line.me/R/ti/p/%40169snqvb"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-line-green text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              💬 ติดต่อแอดมิน
            </a>
            <a
              href="/"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:scale-95 transition-transform"
            >
              🛒 สั่งซื้ออีกครั้ง
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
