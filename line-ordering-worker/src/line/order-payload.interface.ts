export interface OrderItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

export interface OrderPayload {
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
  addressPhotoUrl?: string | null;
  phonePhotoUrl?: string | null;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}
