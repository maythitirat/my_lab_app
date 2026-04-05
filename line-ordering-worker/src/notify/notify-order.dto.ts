import { IsNumber, IsString, IsArray, IsOptional, ValidateNested, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NotifyOrderItemDto {
  @IsNumber() @IsPositive() productId: number;
  @IsString() productName: string;
  @IsNumber() @IsPositive() price: number;
  @IsNumber() @Min(1) quantity: number;
}

export class NotifyOrderDto {
  @IsNumber() id: number;
  @IsString() lineUserId: string;
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() address: string;
  @IsString() addressLine: string;
  @IsString() subDistrict: string;
  @IsString() district: string;
  @IsString() province: string;
  @IsString() postalCode: string;
  @IsOptional() @IsString() addressPhotoUrl?: string;
  @IsOptional() @IsString() phonePhotoUrl?: string;
  @IsNumber() @IsPositive() totalPrice: number;
  @IsString() paymentMethod: string;
  @IsString() status: string;
  @IsString() createdAt: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => NotifyOrderItemDto) items: NotifyOrderItemDto[];
}
