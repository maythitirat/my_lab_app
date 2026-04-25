export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
  sortOrder: number;
}

export interface Product {
  id: number;
  name: string;
  /** Legacy static-data field */
  image?: string;
  /** API field from backend */
  imageUrl?: string;
  /** Multiple images from product_images table */
  images?: ProductImage[];
  price: number;
  category: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

/** Structured Thai address broken into individual fields */
export interface AddressDetail {
  /** บ้านเลขที่ หมู่ ซอย ถนน / House no., Moo, Soi, Street */
  addressLine: string;
  /** แขวง / ตำบล */
  subDistrict: string;
  /** เขต / อำเภอ */
  district: string;
  /** จังหวัด */
  province: string;
  /** รหัสไปรษณีย์ */
  postalCode: string;
}

export interface OrderPayload {
  lineUserId: string;
  name: string;
  phone: string;
  /** Legacy single-string address — kept for backwards compat */
  address: string;
  // Structured address fields
  addressLine: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  /** Cloudflare / S3 URL of uploaded address-photo (optional) */
  addressPhotoUrl?: string;
  /** Cloudflare / S3 URL of uploaded phone-card photo (optional) */
  phonePhotoUrl?: string;
  totalPrice: number;
  /** 'cod' = เก็บเงินปลายทาง  |  'transfer' = โอนจ่าย */
  paymentMethod: 'cod' | 'transfer';
  items: OrderItem[];
}

/** Payload for PATCH /orders/:id — only contact & address fields, no items */
export interface UpdateOrderPayload {
  lineUserId: string;
  name?: string;
  phone?: string;
  address?: string;
  addressLine?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

export interface Order {
  id: number;
  lineUserId: string;
  name: string;
  phone: string;
  address: string;
  addressLine: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  addressPhotoUrl: string | null;
  phonePhotoUrl: string | null;
  totalPrice: number;
  paymentMethod: string;
  /** 'pending' | 'confirmed' | 'cancelled' */
  status: string;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface Customer {
  id: number;
  lineUserId: string | null;
  phone: string;
  name: string | null;
  lineDisplayName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineFollower {
  id: number;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  lastSeenAt: string;
  createdAt: string;
}
