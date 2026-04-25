import { FlexMessage, FlexBubble } from '@line/bot-sdk';

export interface CancelPayload {
  id: number;
  name: string;
  totalPrice: number;
  cancelledAt: string;
  items: { productName: string; quantity: number; price: number }[];
}

export function buildAdminCancelFlex(order: CancelPayload): FlexMessage {
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
          text: '❌ ยกเลิกออเดอร์',
          weight: 'bold',
          size: 'xl',
          color: '#ffffff',
        },
        {
          type: 'text',
          text: `#${order.id} · ${new Date(order.cancelledAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
          size: 'xs',
          color: '#ffffffcc',
          margin: 'xs',
        },
      ],
      backgroundColor: '#E53935',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ข้อมูลผู้สั่ง',
              weight: 'bold',
              size: 'sm',
              color: '#E53935',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ชื่อ', size: 'sm', color: '#555555', flex: 2 },
                { type: 'text', text: order.name, size: 'sm', color: '#111111', flex: 5, wrap: true },
              ],
              margin: 'xs',
            },
          ],
          paddingAll: '12px',
          backgroundColor: '#FFF5F5',
          borderWidth: '1px',
          borderColor: '#FFCDD2',
          cornerRadius: '8px',
        },
        {
          type: 'separator',
          margin: 'md',
          color: '#FFCDD2',
        },
        {
          type: 'text',
          text: 'รายการสินค้า',
          weight: 'bold',
          size: 'sm',
          color: '#555555',
          margin: 'md',
        },
        ...itemRows,
        {
          type: 'separator',
          margin: 'md',
          color: '#FFCDD2',
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: 'ยอดรวม', weight: 'bold', size: 'sm', color: '#111111', flex: 3 },
            {
              type: 'text',
              text: `฿${Number(order.totalPrice).toLocaleString()}`,
              weight: 'bold',
              size: 'sm',
              color: '#E53935',
              align: 'end',
              flex: 3,
            },
          ],
        },
      ],
      paddingAll: '16px',
    },
  };

  return {
    type: 'flex',
    altText: `❌ ออเดอร์ #${order.id} ถูกยกเลิกโดย ${order.name}`,
    contents: bubble,
  };
}
