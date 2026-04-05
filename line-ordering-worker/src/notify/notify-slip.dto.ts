import { IsNumber, IsString, IsPositive } from 'class-validator';

export class NotifySlipDto {
  @IsNumber()
  @IsPositive()
  orderId: number;

  /** HTTPS URL of the uploaded slip image (Supabase Storage public URL) */
  @IsString()
  slipUrl: string;

  /** Customer name (for admin notification text) */
  @IsString()
  customerName: string;
}
