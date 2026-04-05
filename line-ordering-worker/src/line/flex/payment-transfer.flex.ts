import { OrderPayload } from '../order-payload.interface';

const PAYMENT_TEXT = `โอนจ่าย 📌📌

❌ไม่รับการชำระเงินจาก TrueMoney ❌

  💚 ธนาคาร กสิกรไทย 💚
    เลขบัญชี  172-1-07458-3

ชื่อบช. วรพล อุทัยธรรม

✅หลังโอนจ่ายแล้ว รบกวนส่งสลิป พร้อมชื่อ ที่อยู่ และเบอร์ติดต่อ  ให้แอดมินด้วยค่ะ`;

/**
 * Returns messages to send when a customer selects transfer payment:
 * 1. A Flex Message bubble with bank details + QR code + upload slip button
 */
export function buildPaymentTransferMessages(
  order: OrderPayload,
  qrImageUrl: string,
  liffId: string,
): object[] {
  const uploadSlipUrl = `https://liff.line.me/${liffId}/upload-slip/${order.id}`;

  const flexMessage = {
    type: 'flex',
    altText: `💳 ข้อมูลการโอนจ่าย ออเดอร์ #${order.id}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1B5E20',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '💳 ข้อมูลการชำระเงิน',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: `ออเดอร์ #${order.id}  •  ฿${order.totalPrice.toLocaleString()}`,
            color: '#A5D6A7',
            size: 'sm',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '❌ ไม่รับการชำระเงินจาก TrueMoney ❌',
            color: '#C62828',
            size: 'sm',
            weight: 'bold',
            align: 'center',
            wrap: true,
          },
          {
            type: 'separator',
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F1F8E9',
            cornerRadius: '8px',
            paddingAll: '12px',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '💚 ธนาคาร กสิกรไทย (KBank)',
                color: '#1B5E20',
                weight: 'bold',
                size: 'sm',
                align: 'center',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เลขบัญชี', color: '#616161', size: 'sm', flex: 2 },
                  { type: 'text', text: '172-1-07458-3', color: '#212121', weight: 'bold', size: 'sm', flex: 3 },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ชื่อบัญชี', color: '#616161', size: 'sm', flex: 2 },
                  { type: 'text', text: 'วรพล อุทัยธรรม', color: '#212121', weight: 'bold', size: 'sm', flex: 3 },
                ],
              },
            ],
          },
          {
            type: 'image',
            url: qrImageUrl,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'fit',
          },
          {
            type: 'text',
            text: '📎 หลังโอนเงินแล้ว กรุณาอัปโหลดสลิปเพื่อยืนยันการชำระเงิน',
            color: '#2E7D32',
            size: 'xs',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📤 อัปโหลดสลิปโอนเงิน',
              uri: uploadSlipUrl,
            },
            style: 'primary',
            color: '#1B5E20',
            height: 'sm',
            cornerRadius: '12px',
          },
        ],
      },
    },
  };

  return [flexMessage];
}

/**
 * Slip reminder message — sent separately after the payment info flex.
 */
export function buildSlipReminderMessages(order: OrderPayload, liffId: string): object[] {
  const uploadSlipUrl = `https://liff.line.me/${liffId}/upload-slip/${order.id}`;

  return [
    {
      type: 'flex',
      altText: `📤 กรุณาอัปโหลดสลิปออเดอร์ #${order.id}`,
      contents: {
        type: 'bubble',
        size: 'micro',
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '📤 อย่าลืมส่งสลิปนะคะ!',
              weight: 'bold',
              size: 'sm',
              color: '#1B5E20',
            },
            {
              type: 'text',
              text: 'หลังโอนเงินแล้ว กรุณาอัปโหลดสลิปเพื่อให้แอดมินตรวจสอบและยืนยันออเดอร์ได้รวดเร็วขึ้นค่ะ',
              size: 'xs',
              color: '#616161',
              wrap: true,
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '10px',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '📤 อัปโหลดสลิป',
                uri: uploadSlipUrl,
              },
              style: 'primary',
              color: '#2E7D32',
              height: 'sm',
              cornerRadius: '10px',
            },
          ],
        },
      },
    },
  ];
}

/** Plain-text fallback */
export { PAYMENT_TEXT };

