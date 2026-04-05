import { OrderPayload, UpdateOrderPayload } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
