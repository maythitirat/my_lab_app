import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class UpdateOrderDto {
  /** LINE user ID — used to verify ownership; must match the order's lineUserId */
  @IsString()
  @IsNotEmpty()
  lineUserId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Legacy concatenated address string */
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  subDistrict?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'postalCode must be exactly 5 digits' })
  postalCode?: string;

  /** Tracking number — admin only */
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
