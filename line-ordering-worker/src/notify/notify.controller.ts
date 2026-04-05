import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotifyService } from './notify.service';
import { NotifyOrderDto } from './notify-order.dto';
import { NotifySlipDto } from './notify-slip.dto';

@Controller('notify')
export class NotifyController {
  private readonly logger = new Logger(NotifyController.name);

  constructor(
    private readonly notifyService: NotifyService,
    private readonly config: ConfigService,
  ) {}

  private checkSecret(secret: string): void {
    const expected = this.config.getOrThrow<string>('WORKER_SECRET');
    if (secret !== expected) {
      this.logger.warn('Unauthorized notify attempt');
      throw new UnauthorizedException('Invalid worker secret');
    }
  }

  /**
   * Backend → Worker
   * Called by line-ordering-backend after a new order is saved to DB.
   */
  @Post('order')
  @HttpCode(200)
  async notifyOrder(
    @Headers('x-worker-secret') secret: string,
    @Body() dto: NotifyOrderDto,
  ) {
    this.checkSecret(secret);
    await this.notifyService.handleNewOrder(dto);
    return { ok: true };
  }

  /**
   * Frontend → Worker
   * Called after a customer uploads a payment slip.
   */
  @Post('slip')
  @HttpCode(200)
  async notifySlip(
    @Headers('x-worker-secret') secret: string,
    @Body() dto: NotifySlipDto,
  ) {
    this.checkSecret(secret);
    await this.notifyService.handleSlipNotification(dto);
    return { ok: true };
  }
}
