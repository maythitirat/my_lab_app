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

@Controller('notify')
export class NotifyController {
  private readonly logger = new Logger(NotifyController.name);

  constructor(
    private readonly notifyService: NotifyService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Backend → Worker
   * Called by line-ordering-backend after a new order is saved to DB.
   * Protected by a shared WORKER_SECRET header.
   */
  @Post('order')
  @HttpCode(200)
  async notifyOrder(
    @Headers('x-worker-secret') secret: string,
    @Body() dto: NotifyOrderDto,
  ) {
    const expected = this.config.getOrThrow<string>('WORKER_SECRET');
    if (secret !== expected) {
      this.logger.warn('Unauthorized notify attempt');
      throw new UnauthorizedException('Invalid worker secret');
    }

    await this.notifyService.handleNewOrder(dto);
    return { ok: true };
  }
}
