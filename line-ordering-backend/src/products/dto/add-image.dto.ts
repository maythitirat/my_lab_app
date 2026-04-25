import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class AddImageDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
