import { Injectable, Logger } from '@nestjs/common';
import { LineService } from '../line/line.service';
import { NotifyOrderDto } from './notify-order.dto';
import { NotifySlipDto } from './notify-slip.dto';

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
    // If customer chose bank transfer, send payment details + QR code
    if (order.paymentMethod === 'transfer') {
      await this.lineService.sendPaymentInfo(order);
    }
    this.logger.log(`Notifications sent for order #${order.id}`);
  }

  async handleSlipNotification(dto: NotifySlipDto): Promise<void> {
    this.logger.log(`Slip received for order #${dto.orderId} from ${dto.customerName}`);
    await this.lineService.notifyAdminSlip(dto.orderId, dto.slipUrl, dto.customerName);
  }
}
