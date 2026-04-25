'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';
import {
  getAdminProducts, createProduct, updateProduct, deleteProduct,
  uploadProductImage, addProductImage, removeProductImage,
} from '@/lib/api';
import { Product, ProductImage } from '@/types';

const ADMIN_USER_ID = ( process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '' ).trim();

type ModalMode = 'create' | 'edit' | null;

interface FormState {
  name: string;
  price: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  name: '', price: '', category: '', description: '', isActive: true, sortOrder: '0',
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    price: String(p.price),
    category: p.category,
    description: p.description ?? '',
    isActive: p.isActive ?? true,
    sortOrder: String(p.sortOrder ?? 0),
  };
}

interface PendingImage {
  tempId: string;
  url: string;
  uploading: boolean;
  error?: string;
}

export default function AdminProductsPage() {
  const { profile, isReady, closeLiff } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('All');
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);

  const lineUserId = profile?.userId ?? '';
  const isAdmin = !!ADMIN_USER_ID && lineUserId === ADMIN_USER_ID;

  // Load products
  const reload = async () => {
    if (!lineUserId) return;
    setLoading(true);
    try {
      const data = await getAdminProducts(lineUserId);
      setProducts(data);
    } catch {
      setErrorMsg('โหลดข้อมูลสินค้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && lineUserId) reload();
  }, [isReady, lineUserId]);

  useEffect(() => {
    if (modalMode === 'create') {
      setForm(EMPTY_FORM);
      setPendingImages([]);
      setExistingImages([]);
      setDeletedImageIds([]);
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [modalMode]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleImageFilesSelected = async (files: FileList) => {
    const fileArr = Array.from(files);
    const tempEntries: PendingImage[] = fileArr.map((f) => ({
      tempId: `${Date.now()}-${f.name}`,
      url: '',
      uploading: true,
    }));
    setPendingImages((prev) => [...prev, ...tempEntries]);

    await Promise.all(
      fileArr.map(async (file, i) => {
        const tempId = tempEntries[i].tempId;
        try {
          const { url } = await uploadProductImage(file, lineUserId);
          setPendingImages((prev) =>
            prev.map((p) => (p.tempId === tempId ? { ...p, url, uploading: false } : p)),
          );
        } catch (e) {
          setPendingImages((prev) =>
            prev.map((p) =>
              p.tempId === tempId
                ? { ...p, uploading: false, error: e instanceof Error ? e.message : 'อัพโหลดไม่สำเร็จ' }
                : p,
            ),
          );
        }
      }),
    );
  };

  const removePendingImage = (tempId: string) => {
    setPendingImages((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const markExistingImageDeleted = (imageId: number) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    setDeletedImageIds((prev) => [...prev, imageId]);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (!form.name.trim()) { setErrorMsg('กรุณาระบุชื่อสินค้า'); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setErrorMsg('กรุณาระบุราคาที่ถูกต้อง'); return;
    }
    if (!form.category.trim()) { setErrorMsg('กรุณาระบุหมวดหมู่'); return; }

    const uploadingCount = pendingImages.filter((p) => p.uploading).length;
    if (uploadingCount > 0) { setErrorMsg(`รอรูปภาพอัพโหลดเสร็จก่อน (${uploadingCount} รูป)`); return; }

    setSaving(true);
    try {
      const successUploads = pendingImages.filter((p) => !p.error && p.url);
      const firstImageUrl = successUploads[0]?.url || existingImages[0]?.imageUrl || undefined;

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category.trim(),
        imageUrl: firstImageUrl,
        description: form.description.trim() || undefined,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };

      let productId: number;
      if (modalMode === 'create') {
        const created = await createProduct(payload, lineUserId);
        productId = created.id;
        flash('เพิ่มสินค้าแล้ว ✅');
      } else {
        productId = editTarget!.id;
        await updateProduct(productId, payload, lineUserId);
        flash('แก้ไขสินค้าแล้ว ✅');
      }

      await Promise.all(
        successUploads.map((img, i) => addProductImage(productId, img.url, lineUserId, i)),
      );
      await Promise.all(
        deletedImageIds.map((imgId) => removeProductImage(productId, imgId, lineUserId)),
      );

    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteProduct(id, lineUserId);
      flash('ลบสินค้าแล้ว');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Loading / Auth guard ─────────────────────────────────────────────────
  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าใช้งาน</h2>
        <p className="text-sm text-gray-500 mb-6">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        <button onClick={closeLiff} className="px-6 py-2.5 bg-line-green text-white rounded-xl text-sm font-semibold">ปิดหน้าต่าง</button>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = filterCat === 'All' ? products : products.filter((p) => p.category === filterCat);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="จัดการสินค้า" />

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {successMsg}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'ทั้งหมด', val: products.length, color: 'bg-gray-100 text-gray-700' },
            { label: 'เปิดขาย', val: products.filter((p) => p.isActive).length, color: 'bg-green-100 text-green-700' },
            { label: 'ปิดขาย', val: products.filter((p) => !p.isActive).length, color: 'bg-red-100 text-red-600' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl px-3 py-2.5 text-center`}>
              <p className="text-xl font-bold">{s.val}</p>
              <p className="text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filterCat === cat ? 'bg-line-green text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product list */}
        <div className="space-y-2 mb-4">
          {filtered.map((product) => {
            const thumb = product.images?.[0]?.imageUrl ?? product.imageUrl ?? null;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 ${!product.isActive ? 'opacity-50' : ''}`}
              >
                {/* Thumbnail */}
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 bg-gray-100 bg-cover bg-center"
                  style={{ backgroundImage: thumb ? `url(${thumb})` : undefined }}
                >
                  {!thumb && <span className="w-full h-full flex items-center justify-center text-xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <p className="font-semibold text-sm text-gray-800 truncate">{product.name}</p>
                    {!product.isActive && (
                      <span className="text-xs bg-red-100 text-red-500 rounded px-1.5 py-0.5 font-medium flex-shrink-0">ปิด</span>
                    )}
                    {(product.images?.length ?? 0) > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-500 rounded px-1.5 py-0.5 font-medium flex-shrink-0">
                        🖼 {product.images!.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{product.category}</p>
                  <p className="text-sm font-bold text-line-green">฿{Number(product.price).toLocaleString()}</p>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditTarget(product);
                      setForm(toForm(product));
                      setExistingImages(product.images ?? []);
                      setPendingImages([]);
                      setDeletedImageIds([]);
                      setModalMode('edit');
                      setErrorMsg(null);
                    }}
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg font-medium"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(product.id)}
                    disabled={deletingId === product.id}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {deletingId === product.id ? '...' : 'ลบ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB — Add product */}
      <button
        onClick={() => { setModalMode('create'); setErrorMsg(null); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-line-green text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        +
      </button>

      {/* ── Delete confirm modal ───────────────────────────────────────────────── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6">
            <h3 className="text-base font-bold text-gray-800 mb-2">ยืนยันการลบสินค้า</h3>
            <p className="text-sm text-gray-500 mb-6">
              「{products.find((p) => p.id === confirmDeleteId)?.name}」จะถูกลบถาวร และไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
              <button onClick={() => handleDelete(confirmDeleteId!)} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ─────────────────────────────────────────────────  */}
      {modalMode !== null && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8 overflow-y-auto max-h-[90dvh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">
                {modalMode === 'create' ? '➕ เพิ่มสินค้า' : '✏️ แก้ไขสินค้า'}
              </h3>
              <button onClick={() => setModalMode(null)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{errorMsg}</p>
            )}

            <div className="space-y-3">
              {/* ── Images ── */}
              <div>
                <span className="text-xs text-gray-500 font-medium">รูปภาพสินค้า</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative w-20 h-20">
                      <img src={img.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                      <button type="button" onClick={() => markExistingImageDeleted(img.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow">✕</button>
                    </div>
                  ))}
                  {pendingImages.map((img) => (
                    <div key={img.tempId} className="relative w-20 h-20">
                      {img.uploading ? (
                        <div className="w-20 h-20 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center">
                          <span className="w-5 h-5 rounded-full border-2 border-line-green border-t-transparent animate-spin" />
                        </div>
                      ) : img.error ? (
                        <div className="w-20 h-20 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                          <span className="text-red-400 text-xs text-center leading-tight px-1">อัพโหลด<br/>ไม่สำเร็จ</span>
                        </div>
                      ) : (
                        <img src={img.url} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                      )}
                      {!img.uploading && (
                        <button type="button" onClick={() => removePendingImage(img.tempId)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow">✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-line-green hover:text-line-green transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">เพิ่มรูป</span>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { if (e.target.files?.length) { handleImageFilesSelected(e.target.files); e.target.value = ''; } }} />
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP ไม่เกิน 5 MB • เพิ่มได้หลายรูป</p>
              </div>

              <label className="block">
                <span className="text-xs text-gray-500 font-medium">ชื่อสินค้า *</span>
                <input
                  ref={nameRef}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-line-green"
                  placeholder="เช่น ชาเขียว"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500 font-medium">ราคา (บาท) *</span>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-line-green"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 font-medium">ลำดับ</span>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-line-green"
                    placeholder="0"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-gray-500 font-medium">หมวดหมู่ *</span>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-line-green"
                  placeholder="เช่น เครื่องดื่ม"
                  value={form.category}
                  list="category-list"
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
                <datalist id="category-list">
                  {Array.from(new Set(products.map((p) => p.category))).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="text-xs text-gray-500 font-medium">รายละเอียด</span>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-line-green resize-none"
                  placeholder="รายละเอียดสินค้า (ไม่บังคับ)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>

              <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-line-green"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <span className="text-sm text-gray-700 font-medium">เปิดขาย (แสดงให้ลูกค้าเห็น)</span>
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalMode(null)}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-sm text-gray-600 font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || pendingImages.some((p) => p.uploading)}
                className="flex-1 py-3.5 rounded-2xl bg-line-green text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {modalMode === 'create' ? 'เพิ่มสินค้า' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
