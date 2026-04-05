'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function UploadSlipPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { profile, isReady, closeLiff } = useLiff();

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      return;
    }
    setErrorMsg(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !orderId) return;
    setUploadState('uploading');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId);
    formData.append('customerName', profile?.displayName ?? 'ลูกค้า');

    try {
      const res = await fetch('/api/upload-slip', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'เกิดข้อผิดพลาด');
      }
      setUploadState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      setUploadState('error');
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────
  if (uploadState === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-line-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ส่งสลิปสำเร็จ! ✅</h2>
          <p className="text-gray-500 text-sm mb-6">
            แอดมินได้รับสลิปของคุณแล้ว จะรีบยืนยันออเดอร์ให้โดยเร็วค่ะ
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

  // ─── Main upload form ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`ส่งสลิป ออเดอร์ #${orderId}`} showBack />

      <div className="flex-1 p-4 space-y-4 pb-36">
        {/* Info banner */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-green-800 mb-1">📤 อัปโหลดสลิปโอนเงิน</p>
          <p className="text-xs text-green-700">
            กรุณาถ่ายรูปหรือเลือกสลิปจากคลังรูปภาพ แล้วกดส่งสลิป แอดมินจะได้รับทันทีค่ะ
          </p>
        </div>

        {/* Order info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">เลขออเดอร์</span>
            <span className="font-bold text-gray-800">#{orderId}</span>
          </div>
          {profile && (
            <div className="flex justify-between text-sm mt-1.5">
              <span className="text-gray-500">ชื่อลูกค้า</span>
              <span className="font-semibold text-gray-700">{profile.displayName}</span>
            </div>
          )}
        </div>

        {/* File picker */}
        <div
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[220px] ${
            preview
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-line-green hover:bg-green-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
            onChange={handleFileChange}
            className="hidden"
            capture="environment"
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="slip preview"
              className="max-h-72 rounded-xl object-contain"
            />
          ) : (
            <>
              <span className="text-4xl mb-3">📷</span>
              <p className="text-sm font-semibold text-gray-600">แตะเพื่อเลือกหรือถ่ายรูปสลิป</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — ไม่เกิน 5 MB</p>
            </>
          )}
        </div>

        {preview && (
          <button
            type="button"
            onClick={() => { setPreview(null); setFile(null); }}
            className="text-xs text-gray-400 underline w-full text-center"
          >
            เลือกรูปใหม่
          </button>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 shadow-lg p-4">
        <button
          onClick={handleUpload}
          disabled={!file || uploadState === 'uploading'}
          className="w-full bg-line-green text-white py-3.5 rounded-2xl font-bold text-base hover:bg-line-dark active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploadState === 'uploading' ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              กำลังส่ง…
            </>
          ) : (
            '📤 ส่งสลิปให้แอดมิน'
          )}
        </button>
      </div>
    </div>
  );
}
