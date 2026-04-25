import { OrderPayload, UpdateOrderPayload } from '@/types';
import { uploadViaPresignedUrl } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Check-in / Check-out ────────────────────────────────────────────────────

export interface AttendancePayload {
  lineUserId: string;
  note?: string;
  locationType?: 'onSite' | 'online';
  lat?: number;
  lng?: number;
}

async function attendance(type: 'IN' | 'OUT', payload: AttendancePayload) {
  const response = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, type }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(', ')
        : (data.message ?? `Request failed with status ${response.status}`),
    );
  }
  return data;
}

export const checkIn = (payload: AttendancePayload) => attendance('IN', payload);
export const checkOut = (payload: AttendancePayload) => attendance('OUT', payload);

export async function createOrder(payload: OrderPayload) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(', ')
        : (data.message ?? `Request failed with status ${response.status}`),
    );
  }

  return response.json();
}

export async function getOrders() {
  const response = await fetch(`${API_BASE_URL}/orders`);
  if (!response.ok) throw new Error(`Failed to fetch orders: ${response.status}`);
  return response.json();
}

export async function getAdminOrders(lineUserId: string): Promise<import('@/types').Order[]> {
  const response = await fetch(
    `${API_BASE_URL}/orders?lineUserId=${encodeURIComponent(lineUserId)}`,
  );
  if (!response.ok) throw new Error(`Failed to fetch orders: ${response.status}`);
  return response.json();
}

export async function getMyOrders(lineUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/orders/my?lineUserId=${encodeURIComponent(lineUserId)}`,
  );
  if (!response.ok) throw new Error(`Failed to fetch orders: ${response.status}`);
  return response.json();
}

export async function getOrder(id: number, lineUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/orders/${id}?lineUserId=${encodeURIComponent(lineUserId)}`,
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message ?? `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function setOrderTracking(id: number, trackingNumber: string, adminUserId: string) {
  const res = await fetch(
    `${API_BASE_URL}/orders/${id}/tracking?lineUserId=${encodeURIComponent(adminUserId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber }),
    },
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${res.status}`);
  }
  return res.json();
}

export async function updateOrder(id: number, payload: UpdateOrderPayload) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(', ')
        : (data.message ?? `Request failed with status ${response.status}`),
    );
  }
  return response.json();
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<import('@/types').Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
  return response.json();
}

export async function getAdminProducts(lineUserId: string): Promise<import('@/types').Product[]> {
  const response = await fetch(
    `${API_BASE_URL}/products?admin=true&lineUserId=${encodeURIComponent(lineUserId)}`,
  );
  if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
  return response.json();
}

export async function createProduct(
  data: { name: string; price: number; category: string; imageUrl?: string; description?: string; isActive?: boolean; sortOrder?: number },
  lineUserId: string,
) {
  const response = await fetch(`${API_BASE_URL}/products?lineUserId=${encodeURIComponent(lineUserId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? `Error ${response.status}`));
  }
  return response.json();
}

export async function updateProduct(
  id: number,
  data: Partial<{ name: string; price: number; category: string; imageUrl: string; description: string; isActive: boolean; sortOrder: number }>,
  lineUserId: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/products/${id}?lineUserId=${encodeURIComponent(lineUserId)}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
  );
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? `Error ${response.status}`));
  }
  return response.json();
}

export async function deleteProduct(id: number, lineUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/products/${id}?lineUserId=${encodeURIComponent(lineUserId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? `Error ${response.status}`));
  }
  return response.json();
}

/** Request a presigned S3 URL from the backend for direct browser upload */
async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  lineUserId: string,
): Promise<{ presignedUrl: string; fileUrl: string }> {
  const response = await fetch(
    `${API_BASE_URL}/products/presigned-url?lineUserId=${encodeURIComponent(lineUserId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, contentType }),
    },
  );
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${response.status}`);
  }
  return response.json();
}

/**
 * Upload an image file:
 *  1. Get a presigned S3 PUT URL from the backend
 *  2. PUT the file directly to S3 (browser → S3, no Lambda relay)
 *  Returns { url } — the public S3 URL to store in the DB
 */
export async function uploadProductImage(file: File, lineUserId: string): Promise<{ url: string }> {
  const { presignedUrl, fileUrl } = await getPresignedUploadUrl(file.name, file.type, lineUserId);
  await uploadViaPresignedUrl(presignedUrl, file);
  return { url: fileUrl };
}

/** Attach an already-uploaded URL to a product */
export async function addProductImage(productId: number, imageUrl: string, lineUserId: string, sortOrder = 0) {
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}/images?lineUserId=${encodeURIComponent(lineUserId)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl, sortOrder }) },
  );
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${response.status}`);
  }
  return response.json();
}

/** Remove an image from a product */
export async function removeProductImage(productId: number, imageId: number, lineUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}/images/${imageId}?lineUserId=${encodeURIComponent(lineUserId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${response.status}`);
  }
  return response.json();
}

export async function setOrderStatus(id: number, status: string, adminUserId: string) {
  const res = await fetch(
    `${API_BASE_URL}/orders/${id}/status?lineUserId=${encodeURIComponent(adminUserId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────

export async function cancelOrder(id: number, lineUserId: string) {
  const response = await fetch(
    `${API_BASE_URL}/orders/${id}?lineUserId=${encodeURIComponent(lineUserId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(', ')
        : (data.message ?? `Request failed with status ${response.status}`),
    );
  }
  return response.json();
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomers(lineUserId: string): Promise<import('@/types').Customer[]> {
  const res = await fetch(`${API_BASE_URL}/customers?lineUserId=${encodeURIComponent(lineUserId)}`);
  if (!res.ok) throw new Error(`Failed to fetch customers: ${res.status}`);
  return res.json();
}

export async function upsertCustomer(
  data: { phone: string; name?: string; note?: string },
  lineUserId: string,
): Promise<import('@/types').Customer> {
  const res = await fetch(`${API_BASE_URL}/customers?lineUserId=${encodeURIComponent(lineUserId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? `Error ${res.status}`));
  }
  return res.json();
}

export async function linkLineUser(
  data: { phone: string; lineUserId: string },
  adminUserId: string,
): Promise<import('@/types').Customer> {
  const res = await fetch(`${API_BASE_URL}/customers/link?lineUserId=${encodeURIComponent(adminUserId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? `Error ${res.status}`));
  }
  return res.json();
}

export async function unlinkLineUser(id: number, adminUserId: string): Promise<import('@/types').Customer> {
  const res = await fetch(
    `${API_BASE_URL}/customers/${id}/unlink?lineUserId=${encodeURIComponent(adminUserId)}`,
    { method: 'PATCH' },
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${res.status}`);
  }
  return res.json();
}

export async function notifyCustomer(
  data: { phone: string; message: string },
  adminUserId: string,
): Promise<{ sent: boolean }> {
  const res = await fetch(`${API_BASE_URL}/customers/notify?lineUserId=${encodeURIComponent(adminUserId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? `Error ${res.status}`));
  }
  return res.json();
}

export async function deleteCustomer(id: number, adminUserId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/customers/${id}?lineUserId=${encodeURIComponent(adminUserId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message ?? `Error ${res.status}`);
  }
}

export async function searchFollowers(q: string, adminUserId: string): Promise<import('@/types').LineFollower[]> {
  const res = await fetch(
    `${API_BASE_URL}/customers/followers?q=${encodeURIComponent(q)}&lineUserId=${encodeURIComponent(adminUserId)}`,
  );
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
