import { IsString, IsNumber, IsOptional, IsBoolean, IsPositive, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString() @MaxLength(255) name: string;
  @IsNumber() @IsPositive() price: number;
  @IsString() @MaxLength(100) category: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Min(0) sortOrder?: number;
}
