import { FlexMessage, FlexBubble } from '@line/bot-sdk';

export interface ReportOrderItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface ReportOrder {
  id: number;
  name: string;
  totalPrice: number;
  paymentMethod: string;
  createdAt: string;
  items: ReportOrderItem[];
}

export interface ReportData {
  periodLabel: string;
  periodStartBKK: string;
  periodEndBKK: string;
  totalOrders: number;
  totalRevenue: number;
  codOrders: number;
  codRevenue: number;
  transferOrders: number;
  transferRevenue: number;
  orders: ReportOrder[];
}

const BKK_MS = 7 * 60 * 60 * 1000;

function toBKKTimeStr(createdAt: string): string {
  const d = new Date(new Date(createdAt).getTime() + BKK_MS);
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function bahtFmt(n: number): string {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Builds the daily sales report Flex Message sent to admin.
 *
 * Layout:
 *  Header  : "📊 รายงานประจำวัน  |  <label>"
 *  Body    : period range, aggregate stats (total / COD / transfer),
 *            separator, per-order rows
 */
export function buildAdminReportFlex(data: ReportData): FlexMessage {
  // ── Order rows ──────────────────────────────────────────────────────────────
  const orderRows =
    data.orders.length > 0
      ? data.orders.map((o) => {
          const payLabel = o.paymentMethod === 'cod' ? 'COD' : 'โอน';
          const payColor = o.paymentMethod === 'cod' ? '#E8820C' : '#27ACB2';
          const timeStr = toBKKTimeStr(o.createdAt);

          return {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              {
                type: 'text' as const,
                text: `#${o.id}`,
                size: 'xs',
                color: '#AAAAAA',
                flex: 1,
              },
              {
                type: 'text' as const,
                text: o.name,
                size: 'xs',
                color: '#333333',
                flex: 4,
                wrap: true,
              },
              {
                type: 'text' as const,
                text: bahtFmt(o.totalPrice),
                size: 'xs',
                color: '#111111',
                flex: 3,
                align: 'end' as const,
              },
              {
                type: 'text' as const,
                text: `${payLabel} ${timeStr}`,
                size: 'xs',
                color: payColor,
                flex: 3,
                align: 'end' as const,
              },
            ],
            margin: 'sm',
          };
        })
      : [
          {
            type: 'text' as const,
            text: 'ไม่มีออเดอร์ในรอบนี้',
            size: 'sm',
            color: '#AAAAAA',
            align: 'center' as const,
            margin: 'md' as const,
          },
        ];

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'mega',

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#1A7D4A',
      paddingAll: '16px',
      contents: [
        {
          type: 'text',
          text: '📊 รายงานประจำวัน',
          weight: 'bold',
          size: 'lg',
          color: '#FFFFFF',
        },
        {
          type: 'text',
          text: data.periodLabel,
          size: 'sm',
          color: '#FFFFFFCC',
          margin: 'xs',
        },
        {
          type: 'text',
          text: `${data.periodStartBKK} – ${data.periodEndBKK}`,
          size: 'xs',
          color: '#FFFFFF99',
          margin: 'xs',
        },
      ],
    },

    // ── Body ──────────────────────────────────────────────────────────────────
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: [
        // ── Aggregate stats ─────────────────────────────────────────
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            // Total
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'ออเดอร์ทั้งหมด',
                  size: 'sm',
                  color: '#555555',
                  flex: 3,
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: `${data.totalOrders} รายการ`,
                  size: 'sm',
                  color: '#111111',
                  flex: 2,
                  align: 'end',
                },
                {
                  type: 'text',
                  text: bahtFmt(data.totalRevenue),
                  size: 'sm',
                  color: '#1A7D4A',
                  flex: 2,
                  align: 'end',
                  weight: 'bold',
                },
              ],
            },
            // COD
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'เก็บเงินปลายทาง',
                  size: 'sm',
                  color: '#888888',
                  flex: 3,
                },
                {
                  type: 'text',
                  text: `${data.codOrders} รายการ`,
                  size: 'sm',
                  color: '#555555',
                  flex: 2,
                  align: 'end',
                },
                {
                  type: 'text',
                  text: bahtFmt(data.codRevenue),
                  size: 'sm',
                  color: '#E8820C',
                  flex: 2,
                  align: 'end',
                },
              ],
            },
            // Transfer
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'โอนเงิน',
                  size: 'sm',
                  color: '#888888',
                  flex: 3,
                },
                {
                  type: 'text',
                  text: `${data.transferOrders} รายการ`,
                  size: 'sm',
                  color: '#555555',
                  flex: 2,
                  align: 'end',
                },
                {
                  type: 'text',
                  text: bahtFmt(data.transferRevenue),
                  size: 'sm',
                  color: '#27ACB2',
                  flex: 2,
                  align: 'end',
                },
              ],
            },
          ],
        },

        // ── Divider ─────────────────────────────────────────────────
        { type: 'separator', margin: 'lg' },

        // ── Order list header ────────────────────────────────────────
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: '#', size: 'xs', color: '#AAAAAA', flex: 1 },
            { type: 'text', text: 'ชื่อ', size: 'xs', color: '#AAAAAA', flex: 4 },
            { type: 'text', text: 'ยอด', size: 'xs', color: '#AAAAAA', flex: 3, align: 'end' },
            { type: 'text', text: 'ชำระ / เวลา', size: 'xs', color: '#AAAAAA', flex: 3, align: 'end' },
          ],
        },

        // ── Order rows ───────────────────────────────────────────────
        ...(orderRows as any[]),
      ],
    },
  };

  return {
    type: 'flex',
    altText: `📊 รายงาน ${data.periodLabel} — ${data.totalOrders} รายการ ${bahtFmt(data.totalRevenue)}`,
    contents: bubble,
  };
}
