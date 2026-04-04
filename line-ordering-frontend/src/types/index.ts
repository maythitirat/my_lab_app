export interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  category: string;
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
  items: OrderItem[];
}

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}
