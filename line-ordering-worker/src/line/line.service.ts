import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';
import { OrderPayload } from './order-payload.interface';
import { buildAdminOrderFlex } from './flex/admin-order.flex';
import { buildUserConfirmFlex } from './flex/user-confirm.flex';
import { buildPaymentTransferMessages, buildSlipReminderMessages } from './flex/payment-transfer.flex';
import { buildAdminReportFlex, ReportData } from './flex/admin-report.flex';

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

  /** Send bank transfer payment info + QR code + upload slip button to the customer. */
  async sendPaymentInfo(order: OrderPayload): Promise<void> {
    const qrImageUrl = this.config.get<string>('PAYMENT_QR_IMAGE_URL');
    const liffId = this.config.get<string>('LIFF_ID') ?? '2009692421-qzL3USNe';
    if (!qrImageUrl) {
      this.logger.warn('PAYMENT_QR_IMAGE_URL not configured — skipping payment info message');
      return;
    }
    const messages = buildPaymentTransferMessages(order, qrImageUrl, liffId);
    const slipReminder = buildSlipReminderMessages(order, liffId);
    await this.client
      .pushMessage({
        to: order.lineUserId,
        messages: [...messages, ...slipReminder] as messagingApi.Message[],
      })
      .catch((err) => {
        this.logger.error(`Failed to send payment info to ${order.lineUserId}: ${err.message}`);
      });
    this.logger.log(`Payment info + slip reminder sent to user ${order.lineUserId} for order #${order.id}`);
  }

  /** Notify admin that a payment slip was uploaded for an order. */
  async notifyAdminSlip(orderId: number, slipUrl: string, customerName: string): Promise<void> {
    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');
    const adminGroupId = this.config.get<string>('LINE_ADMIN_GROUP_ID');

    const targets: string[] = [];
    if (adminGroupId) targets.push(adminGroupId);
    else if (adminUserId) targets.push(adminUserId);

    if (targets.length === 0) {
      this.logger.warn('No admin target configured for slip notification');
      return;
    }

    const flexBadge: messagingApi.Message = {
      type: 'flex',
      altText: `💸 สลิปโอนเงิน ออเดอร์ #${orderId}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0D47A1',
          paddingAll: '14px',
          contents: [
            {
              type: 'text',
              text: '💸 สลิปโอนเงินใหม่!',
              color: '#FFFFFF',
              weight: 'bold',
              size: 'md',
            },
            {
              type: 'text',
              text: `ออเดอร์ #${orderId}  •  ${customerName}`,
              color: '#90CAF9',
              size: 'sm',
              margin: 'xs',
            },
          ],
        },
        hero: {
          type: 'image',
          url: slipUrl,
          size: 'full',
          aspectRatio: '4:3',
          aspectMode: 'fit',
          action: { type: 'uri', label: 'ดูสลิป', uri: slipUrl },
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '14px',
          contents: [
            {
              type: 'text',
              text: '✅ ลูกค้าอัปโหลดสลิปแล้ว กรุณาตรวจสอบและยืนยันออเดอร์ค่ะ',
              size: 'xs',
              color: '#424242',
              wrap: true,
            },
          ],
        },
      } as unknown as messagingApi.FlexContainer,
    } as messagingApi.FlexMessage;

    await Promise.all(
      targets.map((to) =>
        this.client.pushMessage({ to, messages: [flexBadge] }).catch((err) => {
          this.logger.error(`Failed to notify admin slip to ${to}: ${err.message}`);
        }),
      ),
    );
    this.logger.log(`Admin notified for slip on order #${orderId}`);
  }

  /**
   * Send the daily report flex message to the admin.
   * @param to   LINE user ID or group ID to push the message to.
   * @param data Report payload returned by the backend.
   */
  async sendReport(to: string, data: ReportData): Promise<void> {
    const flex = buildAdminReportFlex(data);
    await this.client
      .pushMessage({ to, messages: [flex as unknown as messagingApi.Message] })
      .catch((err) => {
        this.logger.error(`Failed to send report to ${to}: ${err.message}`);
      });
    this.logger.log(`Report sent to ${to} (${data.totalOrders} orders, ${data.periodLabel})`);
  }

  /**
   * Send report + command hint bubble together.
   */
  async sendReportWithHint(to: string, data: ReportData): Promise<void> {
    const reportFlex = buildAdminReportFlex(data);
    const hintFlex: messagingApi.Message = {
      type: 'flex',
      altText: '💡 วิธีขอรายงาน',
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#424242',
          paddingAll: '14px',
          contents: [
            {
              type: 'text',
              text: '💡 วิธีขอรายงานวันอื่น',
              weight: 'bold',
              size: 'md',
              color: '#FFFFFF',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '14px',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: 'พิมพ์คำสั่งเหล่านี้ใน LINE ได้เลย',
              size: 'xs',
              color: '#888888',
              margin: 'none',
            },
            { type: 'separator', margin: 'sm' },
            ...[
              ['รายงาน', 'รอบปัจจุบัน'],
              ['รายงานวันนี้', 'รอบปัจจุบัน'],
              ['รายงาน 6/4', 'วันที่ 6 เม.ย. (ปีนี้)'],
              ['รายงาน 6/4/26', 'วันที่ 6 เม.ย. 2026'],
              ['รายงาน 6/4/2026', 'วันที่ 6 เม.ย. 2026'],
              ['รายงาน 2026-04-06', 'รูปแบบ ISO'],
            ].map(([cmd, desc]) => ({
              type: 'box' as const,
              layout: 'horizontal' as const,
              margin: 'sm' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: cmd,
                  size: 'sm',
                  color: '#1A7D4A',
                  weight: 'bold' as const,
                  flex: 5,
                },
                {
                  type: 'text' as const,
                  text: desc,
                  size: 'xs',
                  color: '#888888',
                  flex: 4,
                  align: 'end' as const,
                  wrap: true,
                },
              ],
            })),
          ],
        },
      } as unknown as messagingApi.FlexContainer,
    } as messagingApi.FlexMessage;

    await this.client
      .pushMessage({ to, messages: [reportFlex as unknown as messagingApi.Message, hintFlex] })
      .catch((err) => {
        this.logger.error(`Failed to send report+hint to ${to}: ${err.message}`);
      });
    this.logger.log(`Report+hint sent to ${to} (${data.totalOrders} orders, ${data.periodLabel})`);
  }
}
