'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { useLiff } from '@/context/LiffContext';
import { createOrder } from '@/lib/api';
import { useThaiAddress, ThaiAddressEntry } from '@/hooks/useThaiAddress';

// ─── Form state interfaces ────────────────────────────────────────────────────

interface FormData {
  name: string;
  phone: string;
  houseNo: string;       // บ้านเลขที่
  moo: string;           // หมู่
  soi: string;           // ซอย
  street: string;        // ถนน / รายละเอียดเพิ่มเติม
  subDistrict: string;   // แขวง / ตำบล
  district: string;      // เขต / อำเภอ
  province: string;      // จังหวัด
  postalCode: string;    // รหัสไปรษณีย์
  paymentMethod: 'cod' | 'transfer';
}

interface FormErrors {
  name?: string;
  phone?: string;
  houseNo?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  addressPhoto?: string;
  phonePhoto?: string;
}

// ─── Small helper components ──────────────────────────────────────────────────

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

// ─── Photo upload tile ────────────────────────────────────────────────────────

interface PhotoUploadProps {
  label: string;
  hint: string;
  preview: string | null;
  onFile: (file: File) => void;
  error?: string;
}

function PhotoUpload({ label, hint, preview, onFile, error }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <FieldLabel htmlFor={inputRef.current?.id ?? label}>{label}</FieldLabel>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-line-green hover:bg-green-50'
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-90" />
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-xs text-gray-400">แตะเพื่ออัพโหลดรูป</span>
          </>
        )}
        {preview && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">เปลี่ยน</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <FieldError msg={error} />
    </div>
  );
}

// ─── Suggestion dropdown ──────────────────────────────────────────────────────

interface SuggestionsDropdownProps {
  items: ThaiAddressEntry[];
  onSelect: (e: ThaiAddressEntry) => void;
  field: keyof ThaiAddressEntry;
}

function SuggestionsDropdown({ items, onSelect, field }: SuggestionsDropdownProps) {
  if (items.length === 0) return null;

  // Map the primary TH field to its EN counterpart
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

        // Cascading context (fields other than the primary)
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
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
            >
              <span className="font-medium text-gray-800">
                {primaryTh}
                {primaryEn && (
                  <span className="font-normal text-gray-500"> / {primaryEn}</span>
                )}
              </span>
              {context && (
                <span className="block text-gray-400 text-xs mt-0.5">{context}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, totalPrice, clearCart } = useCart();
  const { profile, closeLiff } = useLiff();

  const [formData, setFormData] = useState<FormData>({
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
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Photo state: File object + local preview URL
  const [addressPhoto, setAddressPhoto] = useState<{ file: File; url: string } | null>(null);
  const [phonePhoto, setPhonePhoto] = useState<{ file: File; url: string } | null>(null);

  // Which autocomplete dropdown is currently active
  const [activeDropdown, setActiveDropdown] = useState<keyof ThaiAddressEntry | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Thai address hook
  const { isLoading: isDbLoading, suggestions, search, clearSuggestions } = useThaiAddress();

  // Pre-fill name from LINE profile
  useEffect(() => {
    if (profile?.displayName) {
      setFormData((prev) => ({ ...prev, name: profile.displayName }));
    }
  }, [profile]);

  // Redirect to home if cart becomes empty (unless order just placed)
  useEffect(() => {
    if (cart.length === 0 && !isSuccess) {
      router.replace('/');
    }
  }, [cart, isSuccess, router]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (addressPhoto) URL.revokeObjectURL(addressPhoto.url);
      if (phonePhoto) URL.revokeObjectURL(phonePhoto.url);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits only, max 11 characters
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digits }));
    if (!digits) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    } else if (digits.length === 10) {
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
    // Small delay so click on suggestion fires first
    blurTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const handlePhotoFile = (type: 'address' | 'phone', file: File) => {
    const url = URL.createObjectURL(file);
    if (type === 'address') {
      if (addressPhoto) URL.revokeObjectURL(addressPhoto.url);
      setAddressPhoto({ file, url });
      setErrors((prev) => ({ ...prev, addressPhoto: undefined }));
    } else {
      if (phonePhoto) URL.revokeObjectURL(phonePhoto.url);
      setPhonePhoto({ file, url });
      setErrors((prev) => ({ ...prev, phonePhoto: undefined }));
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};

    if (!formData.name.trim()) e.name = 'กรุณาระบุชื่อ-นามสกุล';

    // Thai phone: 10 digits starting with 0
    const rawPhone = formData.phone.trim();
    const thaiPhoneRegex = /^0\d{9}$/;
    if (!rawPhone) {
      e.phone = 'กรุณาระบุเบอร์โทรศัพท์';
    } else if (!thaiPhoneRegex.test(rawPhone)) {
      e.phone = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 เช่น 0812345678';
    }

    if (!formData.subDistrict.trim()) e.subDistrict = 'กรุณาระบุแขวง/ตำบล';
    if (!formData.district.trim()) e.district = 'กรุณาระบุเขต/อำเภอ';
    if (!formData.province.trim()) e.province = 'กรุณาระบุจังหวัด';

    if (!formData.postalCode.trim()) {
      e.postalCode = 'กรุณาเลือกแขวง/ตำบล เพื่อให้ระบบกรอกรหัสไปรษณีย์อัตโนมัติ';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!profile) {
      setSubmitError('ไม่พบข้อมูลผู้ใช้ กรุณาเปิดแอปใหม่อีกครั้ง');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // In production, upload the photos to your storage (S3, Cloudflare R2, etc.)
      // and replace these with the real URLs returned by your upload endpoint.
      // For now we pass undefined so the order can still be placed without photos.
      const addressPhotoUrl: string | undefined = undefined;
      const phonePhotoUrl: string | undefined = undefined;

      const addressLine = [
        formData.houseNo,
        formData.moo ? 'หมู่ ' + formData.moo : '',
        formData.soi ? 'ซอย ' + formData.soi : '',
        formData.street,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');

      const fullAddress = [
        addressLine,
        formData.subDistrict,
        formData.district,
        formData.province,
        formData.postalCode,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');

      const saved = await createOrder({
        lineUserId: profile.userId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        // legacy single string for backwards compatibility
        address: fullAddress,
        // structured fields
        addressLine: addressLine,
        subDistrict: formData.subDistrict.trim(),
        district: formData.district.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim(),
        addressPhotoUrl,
        phonePhotoUrl,
        totalPrice,
        paymentMethod: formData.paymentMethod,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
      });

      clearCart();
      setCreatedOrderId(saved?.id ?? null);
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Success screen
  // ─────────────────────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-10">
        <div className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-line-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">สั่งซื้อสำเร็จ! 🎉</h2>
          <p className="text-gray-600 text-sm mb-1">
            ขอบคุณ <span className="font-semibold">{formData.name}</span>!
          </p>
          <p className="text-gray-400 text-xs mb-6">
            คำสั่งซื้อของคุณได้รับการบันทึกแล้ว รอการยืนยันจากร้านค้าสักครู่
          </p>

          {/* Transfer payment info */}
          {formData.paymentMethod === 'transfer' && (
            <div className="mb-6 text-left bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-800 mb-3 text-center">💳 ข้อมูลการชำระเงิน</p>
              <p className="text-xs text-red-600 font-semibold text-center mb-3">
                ❌ ไม่รับการชำระเงินจาก TrueMoney ❌
              </p>
              <div className="bg-white rounded-xl p-3 mb-3 space-y-1.5">
                <p className="text-xs font-bold text-green-700 text-center">💚 ธนาคาร กสิกรไทย (KBank)</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">เลขบัญชี</span>
                  <span className="font-bold text-gray-800">172-1-07458-3</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">ชื่อบัญชี</span>
                  <span className="font-bold text-gray-800">วรพล อุทัยธรรม</span>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/qr-payment.png"
                alt="QR Code สำหรับโอนจ่าย"
                className="mx-auto w-48 h-48 rounded-xl border border-green-200"
              />
              <p className="mt-3 text-[10px] text-green-700 text-center">
                ✅ หลังโอนจ่ายแล้ว รบกวนส่งสลิป พร้อมชื่อ ที่อยู่ และเบอร์ติดต่อ ให้แอดมินด้วยค่ะ
              </p>
              {createdOrderId && (
                <a
                  href={`/upload-slip/${createdOrderId}`}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-green-700 text-white py-2.5 rounded-2xl font-bold text-sm hover:bg-green-800 active:scale-95 transition-all"
                >
                  📤 อัปโหลดสลิปโอนเงิน
                </a>
              )}
              <p className="mt-2 text-[10px] text-gray-400 text-center">
                (ระบบได้ส่งข้อมูลการชำระเงินให้ท่านทาง LINE แล้วเช่นกัน)
              </p>
            </div>
          )}

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
  // Checkout form
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="ชำระเงิน" showBack backHref="/cart" />

      <form
        id="checkout-form"
        onSubmit={handleSubmit}
        className="flex-1 p-4 pb-36 space-y-4"
        noValidate
      >
        {/* ── Order summary ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">สรุปรายการสั่งซื้อ</h2>
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate pr-2">
                  {item.product.name}{' '}
                  <span className="text-gray-400">×{item.quantity}</span>
                </span>
                <span className="font-medium text-gray-800 flex-shrink-0">
                  ฿{(item.product.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <span className="font-bold text-gray-700">รวมทั้งหมด</span>
            <span className="font-bold text-lg text-line-green">
              ฿{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Personal information ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">ข้อมูลผู้รับ</h2>

          {/* Name */}
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

          {/* Phone */}
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

          {/* Phone photo upload */}
          <PhotoUpload
            label="รูปถ่ายนามบัตร / ข้อมูลติดต่อ (ไม่บังคับ)"
            hint="อัพโหลดรูปนามบัตรหรือข้อมูลติดต่อ สำหรับผู้ที่ไม่สะดวกกรอกเอง"
            preview={phonePhoto?.url ?? null}
            onFile={(f) => handlePhotoFile('phone', f)}
            error={errors.phonePhoto}
          />
        </div>

        {/* ── Structured address ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">ที่อยู่จัดส่ง</h2>
          {isDbLoading && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-line-green animate-spin inline-block" />
              กำลังโหลดฐานข้อมูลที่อยู่ประเทศไทย…
            </p>
          )}

          {/* Address fields — 4 separate inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="houseNo">บ้านเลขที่</FieldLabel>
              <input
                id="houseNo" name="houseNo" type="text" autoComplete="off"
                value={formData.houseNo} onChange={handleChange}
                placeholder="เช่น 123/4"
                className={inputCls()}
              />
              <FieldError msg={errors.houseNo} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="moo">หมู่ (ไม่บังคับ)</FieldLabel>
              <input
                id="moo" name="moo" type="text" inputMode="numeric" autoComplete="off"
                value={formData.moo} onChange={handleChange}
                placeholder="เช่น 5"
                className={inputCls()}
              />
            </div>
            <div>
              <FieldLabel htmlFor="soi">ซอย (ไม่บังคับ)</FieldLabel>
              <input
                id="soi" name="soi" type="text" autoComplete="off"
                value={formData.soi} onChange={handleChange}
                placeholder="เช่น ลาดพร้าว 10"
                className={inputCls()}
              />
            </div>
            <div>
              <FieldLabel htmlFor="street">ถนน / รายละเอียดเพิ่มเติม (ไม่บังคับ)</FieldLabel>
              <input
                id="street" name="street" type="text" autoComplete="off"
                value={formData.street} onChange={handleChange}
                placeholder="เช่น ถ.ลาดพร้าว"
                className={inputCls()}
              />
            </div>
          </div>

          {/* Province autocomplete */}
          <div className="relative">
            <FieldLabel htmlFor="province">จังหวัด</FieldLabel>
            <input
              id="province" name="province" type="text" autoComplete="new-password"
              value={formData.province}
              onChange={(e) => handleAddressFieldChange('province', e.target.value)}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                // Always show province list on focus, even if field is empty
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

          {/* District autocomplete — enabled after province is chosen */}
          <div className="relative">
            <FieldLabel htmlFor="district">เขต / อำเภอ</FieldLabel>
            <input
              id="district" name="district" type="text" autoComplete="new-password"
              value={formData.district}
              disabled={!formData.province}
              onChange={(e) => handleAddressFieldChange('district', e.target.value)}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                // Show all districts in the selected province immediately
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

          {/* Sub-district autocomplete — enabled after district is chosen */}
          <div className="relative">
            <FieldLabel htmlFor="subDistrict">แขวง / ตำบล</FieldLabel>
            <input
              id="subDistrict" name="subDistrict" type="text" autoComplete="new-password"
              value={formData.subDistrict}
              disabled={!formData.district}
              onChange={(e) => handleAddressFieldChange('subDistrict', e.target.value)}
              onFocus={() => {
                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                // Show all sub-districts in the selected district immediately
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

          {/* Postal code — auto-filled by system when address is selected */}
          <div>
            <FieldLabel htmlFor="postalCode">รหัสไปรษณีย์</FieldLabel>
            {formData.postalCode ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50">
                <span className="text-base font-bold text-line-green tracking-widest">
                  {formData.postalCode}
                </span>
                <span className="text-xs text-gray-400">กรอกอัตโนมัติจากที่อยู่ที่เลือก</span>
              </div>
            ) : (
              <div
                className={`flex items-center px-4 py-3 rounded-xl border ${
                  errors.postalCode
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <span className="text-sm text-gray-400">จะกรอกอัตโนมัติเมื่อเลือกแขวง/ตำบล</span>
              </div>
            )}
            <FieldError msg={errors.postalCode} />
          </div>

          {/* Address photo upload */}
          <PhotoUpload
            label="รูปถ่ายที่อยู่ / ป้ายบ้าน (ไม่บังคับ)"
            hint="อัพโหลดรูปถ่ายที่อยู่หรือป้ายบ้านเพื่อความสะดวก สำหรับชาวต่างชาติ"
            preview={addressPhoto?.url ?? null}
            onFile={(f) => handlePhotoFile('address', f)}
            error={errors.addressPhoto}
          />
        </div>

        {/* ── Payment method ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">วิธีชำระเงิน</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'cod' }))}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
                formData.paymentMethod === 'cod'
                  ? 'border-line-green bg-green-50 text-line-green'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <span className="text-2xl">🚚</span>
              <span className="text-xs font-bold">เก็บเงินปลายทาง</span>
              <span className="text-[10px] text-gray-400">COD</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'transfer' }))}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
                formData.paymentMethod === 'transfer'
                  ? 'border-green-700 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <span className="text-2xl">💚</span>
              <span className="text-xs font-bold">โอนจ่าย</span>
              <span className="text-[10px] text-gray-400">Bank Transfer</span>
            </button>
          </div>
          {formData.paymentMethod === 'transfer' && (
            <p className="mt-3 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              หลังสั่งซื้อ ระบบจะส่งข้อมูลธนาคารและ QR Code ให้ทาง LINE ค่ะ
            </p>
          )}
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
          form="checkout-form"
          disabled={isSubmitting}
          className="w-full bg-line-green text-white py-3.5 rounded-2xl font-bold text-base hover:bg-line-dark active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              กำลังส่งคำสั่งซื้อ…
            </>
          ) : (
            `สั่งซื้อเลย · ฿${totalPrice.toLocaleString()}`
          )}
        </button>
      </div>
    </div>
  );
}
