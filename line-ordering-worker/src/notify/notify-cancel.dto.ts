import { IsNumber, IsString, IsArray, IsPositive, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NotifyCancelItemDto {
  @IsString() productName: string;
  @IsNumber() @IsPositive() price: number;
  @IsNumber() @Min(1) quantity: number;
}

export class NotifyCancelDto {
  @IsNumber() id: number;
  @IsString() name: string;
  @IsNumber() @IsPositive() totalPrice: number;
  @IsString() cancelledAt: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => NotifyCancelItemDto) items: NotifyCancelItemDto[];
}
