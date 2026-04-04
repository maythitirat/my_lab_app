import { Injectable, Logger } from '@nestjs/common';
import { LineService } from '../line/line.service';
import { NotifyOrderDto } from './notify-order.dto';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private readonly lineService: LineService) {}

  async handleNewOrder(order: NotifyOrderDto): Promise<void> {
    this.logger.log(`Handling new order #${order.id} for ${order.name}`);
    // Run both notifications in parallel; errors are caught inside LineService
    await Promise.all([
      this.lineService.notifyAdmin(order),
      this.lineService.confirmUser(order),
    ]);
    this.logger.log(`Notifications sent for order #${order.id}`);
  }
}
