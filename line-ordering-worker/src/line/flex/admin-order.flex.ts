import { FlexMessage, FlexBubble } from '@line/bot-sdk';
import { OrderPayload } from '../order-payload.interface';

/**
 * Builds a Flex Message bubble sent to ADMIN when a new order arrives.
 * Shows full order details, address, and items.
 */
export function buildAdminOrderFlex(order: OrderPayload): FlexMessage {
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
          text: '🛒 ออเดอร์ใหม่!',
          weight: 'bold',
          size: 'xl',
          color: '#ffffff',
        },
        {
          type: 'text',
          text: `#${order.id} · ${new Date(order.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
          size: 'xs',
          color: '#ffffffcc',
          margin: 'xs',
        },
      ],
      backgroundColor: '#27ACB2',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Customer info
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ข้อมูลผู้สั่ง',
              weight: 'bold',
              size: 'sm',
              color: '#27ACB2',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ชื่อ', size: 'sm', color: '#555555', flex: 2 },
                { type: 'text', text: order.name, size: 'sm', color: '#111111', flex: 5, wrap: true },
              ],
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'โทร', size: 'sm', color: '#555555', flex: 2 },
                { type: 'text', text: order.phone, size: 'sm', color: '#111111', flex: 5 },
              ],
              margin: 'sm',
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
              text: 'ที่อยู่จัดส่ง',
              weight: 'bold',
              size: 'sm',
              color: '#27ACB2',
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
              color: '#27ACB2',
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
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#27ACB2',
          action: {
            type: 'uri',
            label: 'ดูรายละเอียด',
            uri: `${process.env.BACKEND_URL || 'https://example.com'}/orders`,
          },
          height: 'sm',
        },
      ],
      paddingAll: '12px',
    },
  };

  return {
    type: 'flex',
    altText: `ออเดอร์ใหม่ #${order.id} จาก ${order.name} ยอด ฿${order.totalPrice}`,
    contents: bubble,
  };
}
