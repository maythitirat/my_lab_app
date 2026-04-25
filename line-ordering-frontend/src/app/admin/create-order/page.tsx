'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';
import { getProducts, createOrder } from '@/lib/api';
import { Product, OrderItem } from '@/types';
import { useThaiAddress, ThaiAddressEntry } from '@/hooks/useThaiAddress';

const ADMIN_USER_ID = ( process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '' ).trim();

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartLine {
  product: Product;
  quantity: number;
}

interface FormData {
  customerLineUserId: string;
  name: string;
  phone: string;
  houseNo: string;
  moo: string;
  soi: string;
  street: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  paymentMethod: 'cod' | 'transfer';
  note: string;
}

interface FormErrors {
  customerLineUserId?: string;
  name?: string;
  phone?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  items?: string;
}

const EMPTY_FORM: FormData = {
  customerLineUserId: '',
  name: '',
  phone: '',
  houseNo: '',
  moo: '',
  soi: '',
  street: '',
  subDistrict: '',
  district: '',
  province: '',
  postalCode: '',
  paymentMethod: 'cod',
  note: '',
};

// ─── Helper components ────────────────────────────────────────────────────────

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

// ─── Address suggestions dropdown ────────────────────────────────────────────

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

// ─── Product picker card ──────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

function ProductPickerCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  const imgSrc = product.images?.[0]?.imageUrl ?? product.imageUrl ?? product.image;
  const categories: Record<string, string> = {
    drink: 'เครื่องดื่ม',
    food: 'อาหาร',
    snack: 'ขนม',
    other: 'อื่นๆ',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      quantity > 0 ? 'border-line-green bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgSrc} alt={product.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🛒</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-gray-500">{categories[product.category] ?? product.category}</p>
        <p className="text-sm font-bold text-line-green">฿{product.price.toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {quantity > 0 ? (
          <>
            <button
              type="button"
              onClick={onRemove}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-300 text-lg leading-none"
            >
              −
            </button>
            <span className="w-6 text-center font-bold text-gray-800">{quantity}</span>
          </>
        ) : (
          <div className="w-6" />
        )}
        <button
          type="button"
          onClick={onAdd}
          className="w-8 h-8 rounded-full bg-line-green flex items-center justify-center text-white font-bold hover:bg-green-600 text-lg leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminCreateOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isReady } = useLiff();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [formData, setFormData] = useState<FormData>(() => {
    // Pre-fill from URL params when navigating from orders list
    const sp = searchParams;
    if (!sp) return EMPTY_FORM;
    const customerId = sp.get('customerId') ?? '';
    if (!customerId) return EMPTY_FORM;
    return {
      ...EMPTY_FORM,
      customerLineUserId: customerId,
      name: sp.get('name') ?? '',
      phone: sp.get('phone') ?? '',
      houseNo: '',
      moo: '',
      soi: '',
      street: '',
      subDistrict: sp.get('subDistrict') ?? '',
      district: sp.get('district') ?? '',
      province: sp.get('province') ?? '',
      postalCode: sp.get('postalCode') ?? '',
      paymentMethod: (sp.get('paymentMethod') as 'cod' | 'transfer') ?? 'cod',
      note: '',
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState<keyof ThaiAddressEntry | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { suggestions, search, clearSuggestions } = useThaiAddress();

  // ── Auth guard ────────────────────────────────────────────────────────────

  const isAdmin = profile?.userId === ADMIN_USER_ID;

  useEffect(() => {
    if (isReady && !isAdmin) router.replace('/');
  }, [isReady, isAdmin, router]);

  // ── Load products ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAdmin) return;
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, [isAdmin]);

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const getQty = useCallback((productId: number) =>
    cart.find((c) => c.product.id === productId)?.quantity ?? 0, [cart]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, quantity: 1 }];
    });
    setErrors((prev) => ({ ...prev, items: undefined }));
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.product.id !== productId);
      return prev.map((c) => c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, []);

  const totalPrice = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digits }));
  };

  const handleAddressFieldChange = (field: 'province' | 'district' | 'subDistrict', value: string) => {
    if (field === 'province') {
      setFormData((prev) => ({ ...prev, province: value, district: '', subDistrict: '', postalCode: '' }));
      search('province', value);
    } else if (field === 'district') {
      setFormData((prev) => ({ ...prev, district: value, subDistrict: '', postalCode: '' }));
      search('district', value, { province: formData.province });
    } else if (field === 'subDistrict') {
      setFormData((prev) => ({ ...prev, subDistrict: value, postalCode: '' }));
      search('subDistrict', value, { province: formData.province, district: formData.district });
    }
    setActiveDropdown(field);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSuggestionSelect = (entry: ThaiAddressEntry) => {
    if (activeDropdown === 'province') {
      setFormData((prev) => ({ ...prev, province: entry.province, district: '', subDistrict: '', postalCode: '' }));
    } else if (activeDropdown === 'district') {
      setFormData((prev) => ({ ...prev, district: entry.district, subDistrict: '', postalCode: '' }));
    } else if (activeDropdown === 'subDistrict') {
      setFormData((prev) => ({ ...prev, subDistrict: entry.subDistrict, postalCode: entry.postalCode }));
    }
    setErrors((prev) => ({ ...prev, [activeDropdown ?? '']: undefined, postalCode: undefined }));
    clearSuggestions();
    setActiveDropdown(null);
  };

  const handleAddressFieldBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!formData.customerLineUserId.trim()) e.customerLineUserId = 'กรุณาระบุ LINE User ID ของลูกค้า';
    if (!formData.name.trim()) e.name = 'กรุณาระบุชื่อ-นามสกุล';
    if (!formData.phone.trim()) e.phone = 'กรุณาระบุเบอร์โทรศัพท์';
    else if (!/^0\d{9}$/.test(formData.phone.trim())) e.phone = 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 10 หลัก';
    if (!formData.subDistrict.trim()) e.subDistrict = 'กรุณาระบุแขวง/ตำบล';
    if (!formData.district.trim()) e.district = 'กรุณาระบุเขต/อำเภอ';
    if (!formData.province.trim()) e.province = 'กรุณาระบุจังหวัด';
    if (!formData.postalCode.trim()) e.postalCode = 'กรุณาเลือกแขวง/ตำบล เพื่อให้ระบบกรอกรหัสไปรษณีย์อัตโนมัติ';
    if (cart.length === 0) e.items = 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const addressLine = [
        formData.houseNo,
        formData.moo ? 'หมู่ ' + formData.moo : '',
        formData.soi ? 'ซอย ' + formData.soi : '',
        formData.street,
      ].map((s) => s.trim()).filter(Boolean).join(' ');

      const fullAddress = [
        addressLine,
        formData.subDistrict,
        formData.district,
        formData.province,
        formData.postalCode,
      ].map((s) => s.trim()).filter(Boolean).join(' ');

      const items: OrderItem[] = cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        price: c.product.price,
        quantity: c.quantity,
      }));

      const saved = await createOrder({
        lineUserId: formData.customerLineUserId.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: fullAddress,
        addressLine,
        subDistrict: formData.subDistrict.trim(),
        district: formData.district.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim(),
        totalPrice,
        paymentMethod: formData.paymentMethod,
        items,
      });

      setCreatedOrderId(saved.id);
      setIsSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setCart([]);
    setErrors({});
    setSubmitError(null);
    setIsSuccess(false);
    setCreatedOrderId(null);
  };

  // ── Category list ─────────────────────────────────────────────────────────

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = filterCat === 'All' ? products : products.filter((p) => p.category === filterCat);
  const catLabels: Record<string, string> = {
    All: 'ทั้งหมด', drink: 'เครื่องดื่ม', food: 'อาหาร', snack: 'ขนม', other: 'อื่นๆ',
  };

  // ── Not ready yet ─────────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-line-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // ── Success screen ────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="สร้างออเดอร์สำเร็จ" />
        <div className="max-w-lg mx-auto px-4 py-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ออเดอร์ #{createdOrderId}</h2>
            <p className="text-gray-500 mt-1">ระบบส่ง Flex Message ให้ลูกค้าแล้ว</p>
            <p className="text-xs text-gray-400 mt-1">LINE User ID: {formData.customerLineUserId}</p>
          </div>
          <div className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left space-y-1.5">
            {cart.map((c) => (
              <div key={c.product.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{c.product.name} × {c.quantity}</span>
                <span className="font-medium">฿{(c.product.price * c.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>รวม</span>
              <span className="text-line-green">฿{totalPrice.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={resetForm}
              className="flex-1 py-3 rounded-xl bg-line-green text-white font-semibold hover:bg-green-600 transition-colors"
            >
              + สร้างออเดอร์ใหม่
            </button>
            <Link
              href="/admin/products"
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-center hover:bg-gray-50 transition-colors"
            >
              จัดการสินค้า
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="🛒 สร้างออเดอร์แทนลูกค้า" showBack backHref="/admin/products" />

      <form onSubmit={handleSubmit} noValidate className="max-w-lg mx-auto px-4 pb-32 space-y-6 pt-4">

        {/* ── Customer LINE User ID ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">ข้อมูลลูกค้า</h2>

          <div>
            <FieldLabel htmlFor="customerLineUserId">LINE User ID ลูกค้า *</FieldLabel>
            <input
              id="customerLineUserId"
              name="customerLineUserId"
              type="text"
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={formData.customerLineUserId}
              onChange={handleChange}
              className={inputCls(!!errors.customerLineUserId)}
            />
            <p className="mt-1 text-xs text-gray-400">ดูได้จาก LINE OA Manager หรือ Webhook log</p>
            <FieldError msg={errors.customerLineUserId} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="name">ชื่อ-นามสกุล *</FieldLabel>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                placeholder="สมชาย ใจดี" className={inputCls(!!errors.name)} />
              <FieldError msg={errors.name} />
            </div>
            <div>
              <FieldLabel htmlFor="phone">เบอร์โทร *</FieldLabel>
              <input id="phone" name="phone" type="tel" inputMode="numeric"
                value={formData.phone} onChange={handlePhoneChange}
                placeholder="0812345678" className={inputCls(!!errors.phone)} />
              <FieldError msg={errors.phone} />
            </div>
          </div>
        </section>

        {/* ── Address ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">ที่อยู่จัดส่ง</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="houseNo">บ้านเลขที่</FieldLabel>
              <input id="houseNo" name="houseNo" type="text" value={formData.houseNo} onChange={handleChange}
                placeholder="123/4" className={inputCls()} />
            </div>
            <div>
              <FieldLabel htmlFor="moo">หมู่</FieldLabel>
              <input id="moo" name="moo" type="text" value={formData.moo} onChange={handleChange}
                placeholder="5" className={inputCls()} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="soi">ซอย</FieldLabel>
              <input id="soi" name="soi" type="text" value={formData.soi} onChange={handleChange}
                placeholder="ลาดพร้าว 71" className={inputCls()} />
            </div>
            <div>
              <FieldLabel htmlFor="street">ถนน</FieldLabel>
              <input id="street" name="street" type="text" value={formData.street} onChange={handleChange}
                placeholder="ลาดพร้าว" className={inputCls()} />
            </div>
          </div>

          {/* Province */}
          <div className="relative">
            <FieldLabel htmlFor="province">จังหวัด *</FieldLabel>
            <input id="province" name="province" type="text" autoComplete="off"
              value={formData.province}
              onChange={(e) => handleAddressFieldChange('province', e.target.value)}
              onFocus={() => { if (formData.province) search('province', formData.province); setActiveDropdown('province'); }}
              onBlur={handleAddressFieldBlur}
              placeholder="กรุงเทพมหานคร" className={inputCls(!!errors.province)} />
            {activeDropdown === 'province' && <SuggestionsDropdown items={suggestions} onSelect={handleSuggestionSelect} field="province" />}
            <FieldError msg={errors.province} />
          </div>

          {/* District */}
          <div className="relative">
            <FieldLabel htmlFor="district">เขต/อำเภอ *</FieldLabel>
            <input id="district" name="district" type="text" autoComplete="off"
              value={formData.district}
              onChange={(e) => handleAddressFieldChange('district', e.target.value)}
              onFocus={() => { if (formData.district) search('district', formData.district, { province: formData.province }); setActiveDropdown('district'); }}
              onBlur={handleAddressFieldBlur}
              placeholder="ลาดพร้าว" className={inputCls(!!errors.district)} />
            {activeDropdown === 'district' && <SuggestionsDropdown items={suggestions} onSelect={handleSuggestionSelect} field="district" />}
            <FieldError msg={errors.district} />
          </div>

          {/* Sub-district */}
          <div className="relative">
            <FieldLabel htmlFor="subDistrict">แขวง/ตำบล *</FieldLabel>
            <input id="subDistrict" name="subDistrict" type="text" autoComplete="off"
              value={formData.subDistrict}
              onChange={(e) => handleAddressFieldChange('subDistrict', e.target.value)}
              onFocus={() => { if (formData.subDistrict) search('subDistrict', formData.subDistrict, { province: formData.province, district: formData.district }); setActiveDropdown('subDistrict'); }}
              onBlur={handleAddressFieldBlur}
              placeholder="จรเข้บัว" className={inputCls(!!errors.subDistrict)} />
            {activeDropdown === 'subDistrict' && <SuggestionsDropdown items={suggestions} onSelect={handleSuggestionSelect} field="subDistrict" />}
            <FieldError msg={errors.subDistrict} />
          </div>

          {/* Postal code */}
          <div>
            <FieldLabel htmlFor="postalCode">รหัสไปรษณีย์</FieldLabel>
            <input id="postalCode" name="postalCode" type="text" readOnly
              value={formData.postalCode}
              placeholder="กรอกให้อัตโนมัติเมื่อเลือกแขวง/ตำบล"
              className={`${inputCls(!!errors.postalCode)} cursor-default`} />
            <FieldError msg={errors.postalCode} />
          </div>
        </section>

        {/* ── Products ──────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">เลือกสินค้า</h2>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filterCat === cat
                    ? 'bg-line-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {catLabels[cat] ?? cat}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-line-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((product) => (
                <ProductPickerCard
                  key={product.id}
                  product={product}
                  quantity={getQty(product.id)}
                  onAdd={() => addToCart(product)}
                  onRemove={() => removeFromCart(product.id)}
                />
              ))}
            </div>
          )}

          <FieldError msg={errors.items} />
        </section>

        {/* ── Payment & Note ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">การชำระเงิน</h2>

          <div className="grid grid-cols-2 gap-3">
            {(['cod', 'transfer'] as const).map((m) => (
              <label
                key={m}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.paymentMethod === m
                    ? 'border-line-green bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m}
                  checked={formData.paymentMethod === m}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-2xl">{m === 'cod' ? '💵' : '🏦'}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{m === 'cod' ? 'เก็บเงินปลายทาง' : 'โอนจ่าย'}</p>
                  <p className="text-xs text-gray-400">{m === 'cod' ? 'COD' : 'Transfer'}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <FieldLabel htmlFor="note">หมายเหตุ (ถ้ามี)</FieldLabel>
            <textarea
              id="note"
              name="note"
              rows={2}
              value={formData.note}
              onChange={handleChange}
              placeholder="เช่น ต้องการให้ส่งช่วงเย็น"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-line-green text-sm focus:outline-none transition-all resize-none"
            />
          </div>
        </section>

        {/* ── Order summary ─────────────────────────────────────────────── */}
        {cart.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-2">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">สรุปออเดอร์</h2>
            {cart.map((c) => (
              <div key={c.product.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{c.product.name} × {c.quantity}</span>
                <span>฿{(c.product.price * c.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>รวมทั้งหมด</span>
              <span className="text-line-green">฿{totalPrice.toLocaleString()}</span>
            </div>
          </section>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            {submitError}
          </div>
        )}
      </form>

      {/* ── Sticky submit bar ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1 text-sm">
            <span className="text-gray-500">{cart.length > 0 ? `${cart.reduce((s, c) => s + c.quantity, 0)} รายการ` : 'ยังไม่มีสินค้า'}</span>
            {cart.length > 0 && (
              <span className="ml-2 font-bold text-line-green">฿{totalPrice.toLocaleString()}</span>
            )}
          </div>
          <button
            type="submit"
            form="__admin_create_order_form"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-3 rounded-xl bg-line-green text-white font-bold text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังสร้าง...
              </>
            ) : (
              '✅ สร้างออเดอร์'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
