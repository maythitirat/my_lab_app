'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';
import { getMyOrders, updateOrder } from '@/lib/api';
import { useThaiAddress, ThaiAddressEntry } from '@/hooks/useThaiAddress';
import { Order } from '@/types';

// ─── Small helpers (same pattern as checkout page) ───────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-500">{msg}</p>;
}

function inputCls(hasError?: boolean) {
  return `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 bg-red-50 focus:ring-red-300'
      : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-line-green'
  }`;
}

// ─── Suggestion dropdown ──────────────────────────────────────────────────────

interface SuggestionsDropdownProps {
  items: ThaiAddressEntry[];
  onSelect: (e: ThaiAddressEntry) => void;
  field: keyof ThaiAddressEntry;
}

function SuggestionsDropdown({ items, onSelect, field }: SuggestionsDropdownProps) {
  if (items.length === 0) return null;

  const enField: Partial<Record<keyof ThaiAddressEntry, keyof ThaiAddressEntry>> = {
    province: 'provinceEn',
    district: 'districtEn',
    subDistrict: 'subDistrictEn',
  };

  return (
    <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
      {items.map((item) => {
        const primaryTh = item[field] as string;
        const primaryEn = enField[field] ? (item[enField[field]!] as string) : '';
        let context = '';
        if (field === 'district') {
          context = item.provinceEn ? `${item.province} / ${item.provinceEn}` : item.province;
        } else if (field === 'subDistrict') {
          const distStr = item.districtEn ? `${item.district} / ${item.districtEn}` : item.district;
          context = `${distStr} · ${item.postalCode}`;
        }

        return (
          <li key={`${item.subDistrict}-${item.district}-${item.province}`}>
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
            >
              <span className="font-medium text-gray-800">
                {primaryTh}
                {primaryEn && <span className="font-normal text-gray-500"> / {primaryEn}</span>}
              </span>
              {context && <span className="block text-gray-400 text-xs mt-0.5">{context}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  phone: string;
  addressLine: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  addressLine?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditOrderPage() {
  const { profile, isReady, closeLiff } = useLiff();

  // Orders list state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected order
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    addressLine: '',
    subDistrict: '',
    district: '',
    province: '',
    postalCode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Address autocomplete
  const [activeDropdown, setActiveDropdown] = useState<keyof ThaiAddressEntry | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isLoading: isDbLoading, suggestions, search, clearSuggestions } = useThaiAddress();

  // ── Load user's recent orders ────────────────────────────────────────────────

  useEffect(() => {
    if (!isReady || !profile) return;

    setLoadingOrders(true);
    getMyOrders(profile.userId)
      .then((data: Order[]) => {
        setOrders(data);
        if (data.length === 1) {
          // Auto-select when there is only one order
          selectOrder(data[0]);
        }
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoadingOrders(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, profile]);

  const selectOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setFormData({
      name: order.name,
      phone: order.phone,
      addressLine: order.addressLine,
      subDistrict: order.subDistrict,
      district: order.district,
      province: order.province,
      postalCode: order.postalCode,
    });
    setErrors({});
    setSubmitError(null);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digits }));
    if (digits.length === 10) {
      const valid = /^0\d{9}$/.test(digits);
      setErrors((prev) => ({
        ...prev,
        phone: valid ? undefined : 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 เช่น 0812345678',
      }));
    } else {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const handleAddressFieldChange = (
    field: 'province' | 'district' | 'subDistrict',
    value: string,
  ) => {
    if (field === 'province') {
      setFormData((prev) => ({ ...prev, province: value, district: '', subDistrict: '', postalCode: '' }));
      search('province', value);
    } else if (field === 'district') {
      setFormData((prev) => ({ ...prev, district: value, subDistrict: '', postalCode: '' }));
      search('district', value, { province: formData.province });
    } else {
      setFormData((prev) => ({ ...prev, subDistrict: value, postalCode: '' }));
      search('subDistrict', value, { province: formData.province, district: formData.district });
    }
    setActiveDropdown(field);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSuggestionSelect = (entry: ThaiAddressEntry) => {
    if (activeDropdown === 'province') {
      setFormData((prev) => ({ ...prev, province: entry.province, district: '', subDistrict: '', postalCode: '' }));
      setErrors((prev) => ({ ...prev, province: undefined }));
    } else if (activeDropdown === 'district') {
      setFormData((prev) => ({ ...prev, district: entry.district, subDistrict: '', postalCode: '' }));
      setErrors((prev) => ({ ...prev, district: undefined }));
    } else if (activeDropdown === 'subDistrict') {
      setFormData((prev) => ({ ...prev, subDistrict: entry.subDistrict, postalCode: entry.postalCode }));
      setErrors((prev) => ({ ...prev, subDistrict: undefined, postalCode: undefined }));
    }
    clearSuggestions();
    setActiveDropdown(null);
  };

  const handleAddressFieldBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!formData.name.trim()) e.name = 'กรุณาระบุชื่อ-นามสกุล';
    const rawPhone = formData.phone.trim();
    if (!rawPhone) {
      e.phone = 'กรุณาระบุเบอร์โทรศัพท์';
    } else if (!/^0\d{9}$/.test(rawPhone)) {
      e.phone = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 เช่น 0812345678';
    }
    if (!formData.subDistrict.trim()) e.subDistrict = 'กรุณาระบุแขวง/ตำบล';
    if (!formData.district.trim()) e.district = 'กรุณาระบุเขต/อำเภอ';
    if (!formData.province.trim()) e.province = 'กรุณาระบุจังหวัด';
    if (!formData.postalCode.trim()) e.postalCode = 'กรุณาเลือกแขวง/ตำบล เพื่อให้ระบบกรอกรหัสไปรษณีย์อัตโนมัติ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedOrder || !profile) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const fullAddress = [
        formData.addressLine,
        formData.subDistrict,
        formData.district,
        formData.province,
        formData.postalCode,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');

      await updateOrder(selectedOrder.id, {
        lineUserId: profile.userId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: fullAddress,
        addressLine: formData.addressLine.trim(),
        subDistrict: formData.subDistrict.trim(),
        district: formData.district.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim(),
      });

      setIsSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isReady || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-line-green animate-spin" />
          <p className="text-sm text-gray-500">กำลังโหลด…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <p className="text-red-500 text-sm text-center mb-4">{loadError}</p>
        <button onClick={closeLiff} className="text-line-green text-sm font-semibold">ปิด</button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-700 mb-1">ยังไม่มีออเดอร์</h2>
        <p className="text-sm text-gray-400 mb-6">คุณยังไม่ได้สั่งสินค้า</p>
        <button onClick={closeLiff} className="bg-line-green text-white px-8 py-3 rounded-2xl font-bold">ปิด</button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Order selector (when user has multiple orders and hasn't chosen one yet)
  // ─────────────────────────────────────────────────────────────────────────────

  if (!selectedOrder) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header title="เลือกออเดอร์ที่ต้องการแก้ไข" />
        <div className="flex-1 p-4 space-y-3 pb-8">
          <p className="text-sm text-gray-500 mb-2">เลือกออเดอร์ที่ต้องการแก้ไขชื่อ ที่อยู่ หรือเบอร์โทร</p>
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => selectOrder(order)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:border-line-green transition-all active:scale-98"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">ออเดอร์ #{order.id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-gray-700 mt-1.5 font-medium truncate">{order.name}</p>
                  <p className="text-xs text-gray-400 truncate">{order.address || [order.addressLine, order.subDistrict, order.district, order.province].filter(Boolean).join(' ')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-line-green">฿{Number(order.totalPrice).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.items.length} รายการ</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Success screen
  // ─────────────────────────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-line-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">แก้ไขสำเร็จ! ✅</h2>
          <p className="text-gray-600 text-sm mb-1">
            ออเดอร์ #{selectedOrder.id} อัพเดตเรียบร้อยแล้ว
          </p>
          <p className="text-gray-400 text-xs mb-6">
            ข้อมูลใหม่: {formData.name} · {formData.phone}
          </p>
          <button
            onClick={closeLiff}
            className="w-full bg-line-green text-white py-3.5 rounded-2xl font-bold hover:bg-line-dark active:scale-95 transition-all"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit form
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        title={`แก้ไขออเดอร์ #${selectedOrder.id}`}
        showBack
        onBack={orders.length > 1 ? () => setSelectedOrder(null) : undefined}
      />

      <form
        id="edit-order-form"
        onSubmit={handleSubmit}
        className="flex-1 p-4 pb-36 space-y-4"
        noValidate
      >
        {/* Info notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <span className="text-amber-500 text-xl flex-shrink-0">ℹ️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">แก้ไขได้เฉพาะข้อมูลติดต่อและที่อยู่</p>
            <p className="text-xs text-amber-700 mt-0.5">
              ไม่สามารถเปลี่ยนรายการสินค้าได้ เนื่องจากระบบ COD ตัดรอบจัดส่งแล้ว
            </p>
          </div>
        </div>

        {/* Order summary (read-only) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">รายการสินค้า (ไม่สามารถแก้ไขได้)</h2>
          <div className="space-y-2">
            {selectedOrder.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 truncate pr-2">
                  {item.productName} <span className="text-gray-400">×{item.quantity}</span>
                </span>
                <span className="font-medium text-gray-700 flex-shrink-0">
                  ฿{(Number(item.price) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <span className="font-bold text-gray-700">รวม</span>
            <span className="font-bold text-line-green">฿{Number(selectedOrder.totalPrice).toLocaleString()}</span>
          </div>
        </div>

        {/* Personal info — editable */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">ข้อมูลผู้รับ</h2>

          <div>
            <FieldLabel htmlFor="name">ชื่อ-นามสกุล</FieldLabel>
            <input
              id="name" name="name" type="text" autoComplete="name"
              value={formData.name} onChange={handleChange}
              placeholder="ชื่อ-นามสกุลผู้รับ"
              className={inputCls(!!errors.name)}
            />
            <FieldError msg={errors.name} />
          </div>

          <div>
            <FieldLabel htmlFor="phone">เบอร์โทรศัพท์</FieldLabel>
            <input
              id="phone" name="phone" type="tel" autoComplete="tel"
              value={formData.phone} onChange={handlePhoneChange}
              placeholder="เช่น 0812345678"
              inputMode="numeric"
              className={inputCls(!!errors.phone)}
            />
            <FieldError msg={errors.phone} />
          </div>
        </div>

        {/* Address — editable */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">ที่อยู่จัดส่ง</h2>
          {isDbLoading && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-line-green animate-spin inline-block" />
              กำลังโหลดฐานข้อมูลที่อยู่ประเทศไทย…
            </p>
          )}

          <div>
            <FieldLabel htmlFor="addressLine">บ้านเลขที่ / หมู่ / ซอย / ถนน</FieldLabel>
            <input
              id="addressLine" name="addressLine" type="text" autoComplete="off"
              value={formData.addressLine} onChange={handleChange}
              placeholder="เช่น 123/4 หมู่ 5 ซอยลาดพร้าว 10"
              className={inputCls(!!errors.addressLine)}
            />
            <FieldError msg={errors.addressLine} />
          </div>

          {/* Province */}
          <div className="relative">
            <FieldLabel htmlFor="province">จังหวัด</FieldLabel>
            <input
              id="province" name="province" type="text" autoComplete="new-password"
              value={formData.province}
              onChange={(e) => handleAddressFieldChange('province', e.target.value)}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                setActiveDropdown('province');
                search('province', formData.province);
              }}
              onBlur={handleAddressFieldBlur}
              placeholder="พิมพ์ชื่อจังหวัด"
              className={inputCls(!!errors.province)}
            />
            {activeDropdown === 'province' && (
              <SuggestionsDropdown items={suggestions} field="province" onSelect={handleSuggestionSelect} />
            )}
            <FieldError msg={errors.province} />
          </div>

          {/* District */}
          <div className="relative">
            <FieldLabel htmlFor="district">เขต / อำเภอ</FieldLabel>
            <input
              id="district" name="district" type="text" autoComplete="new-password"
              value={formData.district}
              disabled={!formData.province}
              onChange={(e) => handleAddressFieldChange('district', e.target.value)}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                setActiveDropdown('district');
                search('district', formData.district, { province: formData.province });
              }}
              onBlur={handleAddressFieldBlur}
              placeholder={formData.province ? 'พิมพ์ชื่อเขต/อำเภอ' : 'กรุณาเลือกจังหวัดก่อน'}
              className={`${inputCls(!!errors.district)} disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {activeDropdown === 'district' && (
              <SuggestionsDropdown items={suggestions} field="district" onSelect={handleSuggestionSelect} />
            )}
            <FieldError msg={errors.district} />
          </div>

          {/* Sub-district */}
          <div className="relative">
            <FieldLabel htmlFor="subDistrict">แขวง / ตำบล</FieldLabel>
            <input
              id="subDistrict" name="subDistrict" type="text" autoComplete="new-password"
              value={formData.subDistrict}
              disabled={!formData.district}
              onChange={(e) => handleAddressFieldChange('subDistrict', e.target.value)}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                setActiveDropdown('subDistrict');
                search('subDistrict', formData.subDistrict, { province: formData.province, district: formData.district });
              }}
              onBlur={handleAddressFieldBlur}
              placeholder={formData.district ? 'พิมพ์ชื่อแขวง/ตำบล' : 'กรุณาเลือกเขต/อำเภอก่อน'}
              className={`${inputCls(!!errors.subDistrict)} disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {activeDropdown === 'subDistrict' && (
              <SuggestionsDropdown items={suggestions} field="subDistrict" onSelect={handleSuggestionSelect} />
            )}
            <FieldError msg={errors.subDistrict} />
          </div>

          {/* Postal code */}
          <div>
            <FieldLabel htmlFor="postalCode">รหัสไปรษณีย์</FieldLabel>
            {formData.postalCode ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50">
                <span className="text-base font-bold text-line-green tracking-widest">{formData.postalCode}</span>
                <span className="text-xs text-gray-400">กรอกอัตโนมัติจากที่อยู่ที่เลือก</span>
              </div>
            ) : (
              <div className={`flex items-center px-4 py-3 rounded-xl border ${errors.postalCode ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <span className="text-sm text-gray-400">จะกรอกอัตโนมัติเมื่อเลือกแขวง/ตำบล</span>
              </div>
            )}
            <FieldError msg={errors.postalCode} />
          </div>
        </div>

        {/* API error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {submitError}
          </div>
        )}
      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 shadow-lg p-4">
        <button
          type="submit"
          form="edit-order-form"
          disabled={isSubmitting}
          className="w-full bg-line-green text-white py-3.5 rounded-2xl font-bold text-base hover:bg-line-dark active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              กำลังบันทึก…
            </>
          ) : (
            'บันทึกการแก้ไข'
          )}
        </button>
      </div>
    </div>
  );
}
