import { FlexMessage, FlexBubble } from '@line/bot-sdk';
import { OrderPayload } from '../order-payload.interface';

const LIFF_ID = process.env.LIFF_ID || '2009692421-qzL3USNe';

/**
 * Builds a Flex Message sent to CUSTOMER confirming their order.
 */
export function buildUserConfirmFlex(order: OrderPayload): FlexMessage {
  const itemRows = order.items.map((item) => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      {
        type: 'text' as const,
        text: `${item.productName} x${item.quantity}`,
        size: 'sm',
        color: '#555555',
        flex: 4,
        wrap: true,
      },
      {
        type: 'text' as const,
        text: `฿${(item.price * item.quantity).toLocaleString()}`,
        size: 'sm',
        color: '#111111',
        align: 'end' as const,
        flex: 2,
      },
    ],
    margin: 'sm',
  }));

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '✅ ยืนยันการสั่งซื้อ',
          weight: 'bold',
          size: 'xl',
          color: '#ffffff',
        },
        {
          type: 'text',
          text: `เลขที่ออเดอร์ #${order.id}`,
          size: 'sm',
          color: '#ffffffcc',
          margin: 'xs',
        },
      ],
      backgroundColor: '#1DB446',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `สวัสดีคุณ ${order.name} 👋`,
          weight: 'bold',
          size: 'md',
        },
        {
          type: 'text',
          text: 'เราได้รับออเดอร์ของคุณแล้ว และกำลังดำเนินการ',
          size: 'sm',
          color: '#555555',
          wrap: true,
          margin: 'sm',
        },
        { type: 'separator', margin: 'md' },
        // Items
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'รายการสินค้า',
              weight: 'bold',
              size: 'sm',
              color: '#1DB446',
            },
            ...itemRows,
          ],
          margin: 'md',
        },
        { type: 'separator', margin: 'md' },
        // Total
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'ยอดรวม', weight: 'bold', size: 'md', flex: 4 },
            {
              type: 'text',
              text: `฿${order.totalPrice.toLocaleString()}`,
              weight: 'bold',
              size: 'md',
              color: '#E8503A',
              align: 'end',
              flex: 3,
            },
          ],
          margin: 'md',
        },
        { type: 'separator', margin: 'md' },
        // Address
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'จัดส่งไปที่',
              weight: 'bold',
              size: 'sm',
              color: '#1DB446',
            },
            {
              type: 'text',
              text: order.address,
              size: 'sm',
              color: '#555555',
              wrap: true,
              margin: 'sm',
            },
          ],
          margin: 'md',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '📦 รายละเอียดการสั่งซื้อ',
            uri: `https://liff.line.me/${LIFF_ID}/orders/${order.id}`,
          },
          style: 'primary',
          color: '#1DB446',
        },
        {
          type: 'text',
          text: 'ขอบคุณที่ใช้บริการ 🙏',
          size: 'xs',
          color: '#aaaaaa',
          align: 'center',
          margin: 'sm',
        },
      ],
      paddingAll: '12px',
    },
  };

  return {
    type: 'flex',
    altText: `ยืนยันออเดอร์ #${order.id} ยอด ฿${order.totalPrice} — ขอบคุณที่สั่งซื้อ!`,
    contents: bubble,
  };
}
