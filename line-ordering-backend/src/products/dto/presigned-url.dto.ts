import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class PresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^image\/(jpeg|png|gif|webp|svg\+xml)$/, {
    message: 'contentType must be a valid image MIME type (jpeg, png, gif, webp, svg+xml)',
  })
  contentType: string;
}
