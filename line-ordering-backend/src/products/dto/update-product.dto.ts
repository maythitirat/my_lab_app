import { IsString, IsNumber, IsOptional, IsBoolean, IsPositive, Min, MaxLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsNumber() @IsPositive() price?: number;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Min(0) sortOrder?: number;
}
