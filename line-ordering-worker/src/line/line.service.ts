import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';
import { OrderPayload } from './order-payload.interface';
import { buildAdminOrderFlex } from './flex/admin-order.flex';
import { buildUserConfirmFlex } from './flex/user-confirm.flex';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: messagingApi.MessagingApiClient;

  constructor(private readonly config: ConfigService) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: this.config.getOrThrow('LINE_CHANNEL_ACCESS_TOKEN'),
    });
  }

  /** Send Flex Message to admin user/group when a new order is placed. */
  async notifyAdmin(order: OrderPayload): Promise<void> {
    const flex = buildAdminOrderFlex(order);
    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');
    const adminGroupId = this.config.get<string>('LINE_ADMIN_GROUP_ID');

    const targets: string[] = [];
    if (adminGroupId) targets.push(adminGroupId);
    else if (adminUserId) targets.push(adminUserId);

    if (targets.length === 0) {
      this.logger.warn('No LINE_ADMIN_USER_ID or LINE_ADMIN_GROUP_ID configured');
      return;
    }

    await Promise.all(
      targets.map((to) =>
        this.client.pushMessage({ to, messages: [flex as unknown as messagingApi.Message] }).catch((err) => {
          this.logger.error(`Failed to push admin message to ${to}: ${err.message}`);
        }),
      ),
    );
    this.logger.log(`Admin notified for order #${order.id}`);
  }

  /** Send Flex Message confirmation to the customer who placed the order. */
  async confirmUser(order: OrderPayload): Promise<void> {
    const flex = buildUserConfirmFlex(order);
    await this.client
      .pushMessage({ to: order.lineUserId, messages: [flex as unknown as messagingApi.Message] })
      .catch((err) => {
        this.logger.error(`Failed to confirm user ${order.lineUserId}: ${err.message}`);
      });
    this.logger.log(`User ${order.lineUserId} confirmed for order #${order.id}`);
  }
}
