'use client';

import { useState } from 'react';
import { useLiff } from '@/context/LiffContext';
import { checkIn, checkOut } from '@/lib/api';

// ─── Office location config ────────────────────────────────────────────────────
// Set NEXT_PUBLIC_OFFICE_LAT / NEXT_PUBLIC_OFFICE_LNG / NEXT_PUBLIC_OFFICE_RADIUS_METERS
// in your .env to match the real office coordinates.
const OFFICE_LAT = parseFloat(process.env.NEXT_PUBLIC_OFFICE_LAT ?? '13.7563');
const OFFICE_LNG = parseFloat(process.env.NEXT_PUBLIC_OFFICE_LNG ?? '100.5018');
const OFFICE_RADIUS_M = parseFloat(process.env.NEXT_PUBLIC_OFFICE_RADIUS_METERS ?? '200');

/** Haversine distance (metres) between two lat/lng points */
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Request browser GPS and resolve with locationType + coordinates */
function getLocationType(): Promise<{ locationType: 'onSite' | 'online'; lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับ Location'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const dist = distanceMetres(lat, lng, OFFICE_LAT, OFFICE_LNG);
        resolve({ locationType: dist <= OFFICE_RADIUS_M ? 'onSite' : 'online', lat, lng });
      },
      (err) => {
        // Permission denied or unavailable → treat as online
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          resolve({ locationType: 'online', lat: 0, lng: 0 });
        } else {
          reject(new Error('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่'));
        }
      },
      { timeout: 10_000, maximumAge: 0, enableHighAccuracy: true },
    );
  });
}

type Status = 'idle' | 'locating' | 'loading' | 'success-in' | 'success-out' | 'error';

export default function CheckInPage() {
  const { profile, isReady, error: liffError } = useLiff();
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [locationType, setLocationType] = useState<'onSite' | 'online' | null>(null);

  const handleAction = async (type: 'IN' | 'OUT') => {
    if (!profile) return;

    // Step 1 — get location
    setStatus('locating');
    setMessage('');
    setLocationType(null);
    let locationResult: { locationType: 'onSite' | 'online'; lat: number; lng: number };
    try {
      locationResult = await getLocationType();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'ไม่สามารถระบุตำแหน่งได้');
      return;
    }

    // Step 2 — call API
    setStatus('loading');
    try {
      const result = await (type === 'IN'
        ? checkIn({ lineUserId: profile.userId, note, ...locationResult })
        : checkOut({ lineUserId: profile.userId, note, ...locationResult }));
      setStatus(type === 'IN' ? 'success-in' : 'success-out');
      setLocationType(locationResult.locationType);
      setMessage(result?.message ?? (type === 'IN' ? 'Check-in สำเร็จ!' : 'Check-out สำเร็จ!'));
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  /* ---------- Loading ---------- */
  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#06C755] border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Initializing LINE LIFF…</p>
      </div>
    );
  }

  /* ---------- LIFF error ---------- */
  if (liffError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">{liffError}</p>
      </div>
    );
  }

  const isLoading = status === 'loading' || status === 'locating';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">

        {/* Avatar */}
        {profile?.pictureUrl && (
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.pictureUrl}
              alt="profile"
              className="w-20 h-20 rounded-full object-cover border-4 border-[#06C755]/30"
            />
          </div>
        )}

        {/* Greeting */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">
          Hi, {profile?.displayName ?? 'User'}
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Press button to Check-in or Check-out
        </p>

        {/* Note input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional Note"
            disabled={isLoading}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06C755]/50 disabled:opacity-50"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            id="btn-in"
            onClick={() => handleAction('IN')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#00B900] active:scale-95 text-white font-bold py-4 rounded-full transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>🟢</span>
            <span>Check-in</span>
          </button>

          <button
            id="btn-out"
            onClick={() => handleAction('OUT')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#FF3B30] hover:bg-[#d63027] active:scale-95 text-white font-bold py-4 rounded-full transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>🔴</span>
            <span>Check-out</span>
          </button>
        </div>

        {/* Locating spinner */}
        {status === 'locating' && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-blue-500">
            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span>กำลังระบุตำแหน่ง…</span>
          </div>
        )}

        {/* Saving spinner */}
        {status === 'loading' && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 rounded-full border-2 border-[#06C755] border-t-transparent animate-spin" />
            <span>กำลังบันทึก…</span>
          </div>
        )}

        {/* Status message */}
        {status !== 'idle' && status !== 'loading' && status !== 'locating' && (
          <div
            className={`mt-5 rounded-xl overflow-hidden ${
              status === 'error'
                ? 'bg-red-50'
                : status === 'success-in'
                ? 'bg-green-50'
                : 'bg-orange-50'
            }`}
          >
            {/* Location badge */}
            {locationType && (
              <div
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold ${
                  locationType === 'onSite'
                    ? 'bg-[#06C755] text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                <span>{locationType === 'onSite' ? '🏢' : '🌐'}</span>
                <span>{locationType === 'onSite' ? 'OnSite' : 'Online'}</span>
              </div>
            )}
            {/* Message */}
            <p
              className={`text-center text-sm font-bold py-3 px-4 ${
                status === 'error'
                  ? 'text-red-600'
                  : status === 'success-in'
                  ? 'text-[#06C755]'
                  : 'text-orange-600'
              }`}
            >
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
