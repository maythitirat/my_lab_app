'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useLiff } from '@/context/LiffContext';
import {
  getCustomers, upsertCustomer, linkLineUser, unlinkLineUser,
  notifyCustomer, deleteCustomer, searchFollowers,
} from '@/lib/api';
import { Customer, LineFollower } from '@/types';

const ADMIN_USER_ID = (process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '').trim();

type Sheet =
  | { type: 'add' }
  | { type: 'link'; customer: Customer }
  | { type: 'notify'; customer: Customer }
  | { type: 'confirmDelete'; customer: Customer }
  | null;

export default function AdminCustomersPage() {
  const { profile } = useLiff();
  const lineUserId = profile?.userId ?? '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── form states ────────────────────────────────────────────────────────────
  const [addPhone, setAddPhone] = useState('');
  const [addName, setAddName] = useState('');
  const [addNote, setAddNote] = useState('');

  const [linkUserId, setLinkUserId] = useState('');
  const [followerSearch, setFollowerSearch] = useState('');
  const [followers, setFollowers] = useState<LineFollower[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);

  const [notifyMsg, setNotifyMsg] = useState('');

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const reload = () => {
    setLoading(true);
    getCustomers(lineUserId)
      .then(setCustomers)
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (lineUserId) reload();
  }, [lineUserId]);

  // ── filtered list ──────────────────────────────────────────────────────────
  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name ?? '').toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.lineDisplayName ?? '').toLowerCase().includes(q)
    );
  });

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addPhone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const c = await upsertCustomer({ phone: addPhone.trim(), name: addName.trim() || undefined, note: addNote.trim() || undefined }, lineUserId);
      setCustomers((prev) => {
        const idx = prev.findIndex((x) => x.id === c.id);
        return idx >= 0 ? prev.map((x) => x.id === c.id ? c : x) : [c, ...prev];
      });
      setSheet(null);
      setAddPhone(''); setAddName(''); setAddNote('');
      flash('บันทึกแล้ว ✅');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const handleLink = async (customer: Customer) => {
    if (!linkUserId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const c = await linkLineUser({ phone: customer.phone, lineUserId: linkUserId.trim() }, lineUserId);
      setCustomers((prev) => prev.map((x) => x.id === c.id ? c : x));
      setSheet(null);
      setLinkUserId('');
      flash(`เชื่อม LINE แล้ว ✅${c.lineDisplayName ? ` (${c.lineDisplayName})` : ''}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (customer: Customer) => {
    setBusy(true);
    setError(null);
    try {
      const c = await unlinkLineUser(customer.id, lineUserId);
      setCustomers((prev) => prev.map((x) => x.id === c.id ? c : x));
      flash('ยกเลิกการเชื่อม LINE แล้ว');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const handleNotify = async (customer: Customer) => {
    if (!notifyMsg.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await notifyCustomer({ phone: customer.phone, message: notifyMsg.trim() }, lineUserId);
      setSheet(null);
      setNotifyMsg('');
      flash('ส่งข้อความแล้ว ✅');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    setBusy(true);
    setError(null);
    try {
      await deleteCustomer(customer.id, lineUserId);
      setCustomers((prev) => prev.filter((x) => x.id !== customer.id));
      setSheet(null);
      flash('ลบแล้ว');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 rounded-full border-4 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="ลูกค้า" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 pb-28">
        {/* Search + Add */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ เบอร์โทร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-line-green"
            />
          </div>
          <button
            onClick={() => { setAddPhone(''); setAddName(''); setAddNote(''); setError(null); setSheet({ type: 'add' }); }}
            className="px-4 py-2.5 bg-line-green text-white rounded-xl text-sm font-bold flex-shrink-0"
          >
            + เพิ่ม
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white rounded-xl px-3 py-2.5 text-center border border-gray-100">
            <p className="text-xl font-bold text-gray-800">{customers.length}</p>
            <p className="text-xs text-gray-500">ลูกค้าทั้งหมด</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-2.5 text-center border border-gray-100">
            <p className="text-xl font-bold text-green-600">{customers.filter((c) => c.lineUserId).length}</p>
            <p className="text-xs text-gray-500">เชื่อม LINE แล้ว</p>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">{search ? 'ไม่พบลูกค้า' : 'ยังไม่มีลูกค้า กด "+ เพิ่ม" เพื่อเริ่ม'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{c.name ?? <span className="text-gray-400 italic">ไม่มีชื่อ</span>}</p>
                      {c.lineUserId ? (
                        <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">✓ เชื่อม LINE</span>
                      ) : (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">⚠ ยังไม่เชื่อม</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">📞 {c.phone}</p>
                    {c.lineDisplayName && (
                      <p className="text-xs text-blue-500 mt-0.5">LINE: {c.lineDisplayName}</p>
                    )}
                    {c.note && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">📝 {c.note}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {c.lineUserId ? (
                      <>
                        <button
                          onClick={() => { setNotifyMsg(''); setError(null); setSheet({ type: 'notify', customer: c }); }}
                          className="text-[11px] px-2.5 py-1.5 bg-line-green text-white rounded-lg font-semibold"
                        >💬 ส่งข้อความ</button>
                        <button
                          onClick={() => handleUnlink(c)}
                          disabled={busy}
                          className="text-[11px] px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg"
                        >❌ ยกเลิก LINE</button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setLinkUserId(''); setError(null); setSheet({ type: 'link', customer: c }); }}
                        className="text-[11px] px-2.5 py-1.5 bg-blue-500 text-white rounded-lg font-semibold"
                      >🔗 เชื่อม LINE</button>
                    )}
                    <button
                      onClick={() => { setError(null); setSheet({ type: 'confirmDelete', customer: c }); }}
                      className="text-[11px] px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg"
                    >🗑 ลบ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom sheets / modals ──────────────────────────────────────────── */}

      {sheet !== null && (
        <div
          className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setSheet(null); setError(null); } }}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8">

            {/* ── Add Customer ── */}
            {sheet.type === 'add' && (
              <>
                <h3 className="text-base font-bold text-gray-800 mb-4">➕ เพิ่มลูกค้า</h3>
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">เบอร์โทร *</label>
                    <input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="0812345678" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line-green" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ (จากระบบ A)</label>
                    <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="รูจิรัตน์ ทองแก้ว" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line-green" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">โน้ต</label>
                    <input value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="โน้ตเพิ่มเติม" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line-green" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setSheet(null); setError(null); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
                    <button onClick={handleAdd} disabled={busy || !addPhone.trim()} className="flex-1 py-3 rounded-xl bg-line-green text-white text-sm font-bold disabled:opacity-50">
                      {busy ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Link LINE ── */}
            {sheet.type === 'link' && (
              <>
                <h3 className="text-base font-bold text-gray-800 mb-1">🔗 เชื่อม LINE</h3>
                <p className="text-xs text-gray-500 mb-4">{sheet.customer.name} · {sheet.customer.phone}</p>
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <div className="space-y-3">
                  {/* Search followers */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ค้นหาจากลูกค้าที่พิมพ์ "รับออเดอร์"</label>
                    <input
                      value={followerSearch}
                      onChange={async (e) => {
                        setFollowerSearch(e.target.value);
                        setFollowersLoading(true);
                        try {
                          const res = await searchFollowers(e.target.value, lineUserId);
                          setFollowers(res);
                        } catch { /* ignore */ } finally {
                          setFollowersLoading(false);
                        }
                      }}
                      onFocus={async () => {
                        if (followers.length === 0) {
                          setFollowersLoading(true);
                          try { setFollowers(await searchFollowers('', lineUserId)); } catch { /* ignore */ } finally { setFollowersLoading(false); }
                        }
                      }}
                      placeholder="พิมพ์ชื่อ LINE..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {followersLoading && <p className="text-xs text-gray-400 mt-1">กำลังโหลด...</p>}
                    {followers.length > 0 && (
                      <div className="mt-1.5 border border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                        {followers.map((f) => (
                          <button
                            key={f.lineUserId}
                            onClick={() => { setLinkUserId(f.lineUserId); setFollowers([]); setFollowerSearch(f.displayName ?? ''); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0"
                          >
                            {f.pictureUrl && <img src={f.pictureUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{f.displayName ?? 'ไม่มีชื่อ'}</p>
                              <p className="text-[10px] text-gray-400 font-mono truncate">{f.lineUserId}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Or paste manually */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">หรือวาง LINE User ID เอง</label>
                    <input
                      value={linkUserId}
                      onChange={(e) => setLinkUserId(e.target.value)}
                      placeholder="U985da4891ecd..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-line-green"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">ลูกค้าพิมพ์ "รับออเดอร์" ใน LINE OA แล้วเลือกได้จากด้านบน</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setSheet(null); setError(null); setFollowers([]); setFollowerSearch(''); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
                    <button onClick={() => handleLink(sheet.customer)} disabled={busy || !linkUserId.trim()} className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-50">
                      {busy ? 'กำลังเชื่อม...' : 'เชื่อม LINE'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Notify ── */}
            {sheet.type === 'notify' && (
              <>
                <h3 className="text-base font-bold text-gray-800 mb-1">💬 ส่งข้อความ LINE</h3>
                <p className="text-xs text-gray-500 mb-1">{sheet.customer.name} · {sheet.customer.phone}</p>
                {sheet.customer.lineDisplayName && (
                  <p className="text-xs text-blue-500 mb-3">LINE: {sheet.customer.lineDisplayName}</p>
                )}
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <div className="space-y-3">
                  <textarea
                    value={notifyMsg}
                    onChange={(e) => setNotifyMsg(e.target.value)}
                    rows={4}
                    placeholder="พิมพ์ข้อความที่จะส่งให้ลูกค้า..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line-green resize-none"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => { setSheet(null); setError(null); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
                    <button onClick={() => handleNotify(sheet.customer)} disabled={busy || !notifyMsg.trim()} className="flex-1 py-3 rounded-xl bg-line-green text-white text-sm font-bold disabled:opacity-50">
                      {busy ? 'กำลังส่ง...' : 'ส่งข้อความ'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Confirm Delete ── */}
            {sheet.type === 'confirmDelete' && (
              <>
                <h3 className="text-base font-bold text-gray-800 mb-2">ยืนยันการลบลูกค้า</h3>
                <p className="text-sm text-gray-500 mb-6">
                  「{sheet.customer.name ?? sheet.customer.phone}」จะถูกลบถาวร และข้อมูล LINE ที่เชื่อมไว้จะหายไปด้วย
                </p>
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setSheet(null); setError(null); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
                  <button onClick={() => handleDelete(sheet.customer)} disabled={busy} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50">
                    {busy ? 'กำลังลบ...' : 'ยืนยันลบ'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
