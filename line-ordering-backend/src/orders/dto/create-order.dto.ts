import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  Min,
  IsPositive,
  ArrayMinSize,
  IsOptional,
  IsIn,
  Length,
  Matches,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  lineUserId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  /** Legacy single-string address (concatenated) — kept for backwards compat */
  @IsString()
  @IsNotEmpty()
  address: string;

  // ── Structured Thai address fields ────────────────────────────────────────

  /** บ้านเลขที่ หมู่ ซอย รายละเอียดเพิ่มเติม */
  @IsString()
  @IsNotEmpty()
  addressLine: string;

  /** แขวง / ตำบล */
  @IsString()
  @IsNotEmpty()
  subDistrict: string;

  /** เขต / อำเภอ */
  @IsString()
  @IsNotEmpty()
  district: string;

  /** จังหวัด */
  @IsString()
  @IsNotEmpty()
  province: string;

  /** รหัสไปรษณีย์ — must be exactly 5 digits */
  @IsString()
  @Matches(/^\d{5}$/, { message: 'postalCode must be exactly 5 digits' })
  postalCode: string;

  // ── Optional photo URLs ───────────────────────────────────────────────────

  /** URL of the uploaded address-photo (S3 / R2 / etc.) */
  @IsOptional()
  @IsString()
  addressPhotoUrl?: string;

  /** URL of the uploaded phone/business-card photo */
  @IsOptional()
  @IsString()
  phonePhotoUrl?: string;

  // ── Order items ───────────────────────────────────────────────────────────

  @IsNumber()
  @IsPositive()
  totalPrice: number;

  /** Payment method: 'cod' (เก็บเงินปลายทาง) or 'transfer' (โอนจ่าย) */
  @IsString()
  @IsIn(['cod', 'transfer'])
  paymentMethod: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

