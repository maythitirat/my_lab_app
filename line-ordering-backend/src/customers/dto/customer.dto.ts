import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

/** Add/update a customer record (phone + name from external system A) */
export class UpsertCustomerDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

/** Link a LINE userId to an existing customer (admin pastes from OA Manager URL) */
export class LinkLineUserDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  lineUserId: string;
}

/** Send a text message to a customer identified by phone */
export class NotifyCustomerDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
