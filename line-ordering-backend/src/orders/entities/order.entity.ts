import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'line_user_id' })
  lineUserId: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  /** Legacy concatenated address string — kept for backwards compat */
  @Column({ type: 'text' })
  address: string;

  // ── Structured Thai address fields ──────────────────────────────────────────

  /** บ้านเลขที่ หมู่ ซอย รายละเอียดเพิ่มเติม */
  @Column({ name: 'address_line', type: 'text', default: '' })
  addressLine: string;

  /** แขวง / ตำบล */
  @Column({ name: 'sub_district', default: '' })
  subDistrict: string;

  /** เขต / อำเภอ */
  @Column({ default: '' })
  district: string;

  /** จังหวัด */
  @Column({ default: '' })
  province: string;

  /** รหัสไปรษณีย์ */
  @Column({ name: 'postal_code', length: 10, default: '' })
  postalCode: string;

  // ── Optional photo URLs ──────────────────────────────────────────────────────

  /** CDN / storage URL for address photo */
  @Column({ name: 'address_photo_url', type: 'text', nullable: true, default: null })
  addressPhotoUrl: string | null;

  /** CDN / storage URL for phone / business-card photo */
  @Column({ name: 'phone_photo_url', type: 'text', nullable: true, default: null })
  phonePhotoUrl: string | null;

  // ── Financial ────────────────────────────────────────────────────────────────

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalPrice: number;

  /** 'cod' = เก็บเงินปลายทาง  |  'transfer' = โอนจ่าย */
  @Column({ name: 'payment_method', default: 'cod' })
  paymentMethod: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];
}
