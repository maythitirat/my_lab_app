'use client';

import Link from 'next/link';
import { useLiff } from '@/context/LiffContext';

const MENU_ITEMS = [
  {
    href: '/admin/orders',
    icon: '📋',
    title: 'ดูออเดอร์',
    description: 'ดูรายการออเดอร์ทั้งหมด ค้นหาลูกค้า และสร้างออเดอร์ซ้ำ',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
  },
  {
    href: '/admin/products',
    icon: '📦',
    title: 'จัดการสินค้า',
    description: 'เพิ่ม แก้ไข ลบสินค้า และอัพโหลดรูป',
    color: 'bg-teal-50 border-teal-200',
    iconBg: 'bg-teal-100',
  },
  {
    href: '/admin/customers',
    icon: '👥',
    title: 'จัดการลูกค้า',
    description: 'เพิ่มลูกค้า เชื่อม LINE และส่งข้อความผ่าน LINE',
    color: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
  },
  {
    href: '/admin/create-order',
    icon: '🛒',
    title: 'สร้างออเดอร์',
    description: 'สร้างออเดอร์แทนลูกค้าที่ไม่สามารถสั่งผ่าน LIFF ได้',
    color: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
  },
];

export default function AdminDashboardPage() {
  const { profile } = useLiff();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-line-green text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h1 className="text-lg font-bold tracking-tight">แดชบอร์ดแอดมิน</h1>
          </div>
          {profile?.pictureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-24">
        {/* Welcome */}
        {profile && (
          <p className="text-sm text-gray-500 mb-5">
            สวัสดี <span className="font-semibold text-gray-700">{profile.displayName}</span> 👋
          </p>
        )}

        {/* Menu cards */}
        <div className="grid grid-cols-1 gap-3">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 p-4 rounded-2xl border ${item.color} hover:shadow-md transition-shadow active:scale-[0.98]`}
            >
              <div className={`${item.iconBg} w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
