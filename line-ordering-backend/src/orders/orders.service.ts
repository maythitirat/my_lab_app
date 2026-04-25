import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly config: ConfigService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = this.ordersRepository.create({
      lineUserId: createOrderDto.lineUserId,
      name: createOrderDto.name,
      phone: createOrderDto.phone,
      address: createOrderDto.address,
      addressLine: createOrderDto.addressLine,
      subDistrict: createOrderDto.subDistrict,
      district: createOrderDto.district,
      province: createOrderDto.province,
      postalCode: createOrderDto.postalCode,
      addressPhotoUrl: createOrderDto.addressPhotoUrl ?? null,
      phonePhotoUrl: createOrderDto.phonePhotoUrl ?? null,
      totalPrice: createOrderDto.totalPrice,
      paymentMethod: createOrderDto.paymentMethod,
      items: createOrderDto.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    const saved = await this.ordersRepository.save(order);
    // Must await in Lambda — fire-and-forget gets killed when handler returns
    await this.notifyWorker(saved);
    return saved;
  }

  private async notifyWorker(order: Order): Promise<void> {
    const workerUrl = this.config.get<string>('WORKER_URL');
    const workerSecret = this.config.get<string>('WORKER_SECRET');
    if (!workerUrl || !workerSecret) return;

    const fullOrder = await this.ordersRepository.findOne({
      where: { id: order.id },
      relations: ['items'],
    });
    if (!fullOrder) return;

    await fetch(`${workerUrl}/notify/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': workerSecret,
      },
      body: JSON.stringify({
        id: fullOrder.id,
        lineUserId: fullOrder.lineUserId,
        name: fullOrder.name,
        phone: fullOrder.phone,
        address: fullOrder.address,
        addressLine: fullOrder.addressLine,
        subDistrict: fullOrder.subDistrict,
        district: fullOrder.district,
        province: fullOrder.province,
        postalCode: fullOrder.postalCode,
        addressPhotoUrl: fullOrder.addressPhotoUrl,
        phonePhotoUrl: fullOrder.phonePhotoUrl,
        totalPrice: Number(fullOrder.totalPrice),
        paymentMethod: fullOrder.paymentMethod,
        status: 'pending',
        createdAt: fullOrder.createdAt,
        items: fullOrder.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          price: Number(i.price),
          quantity: i.quantity,
        })),
      }),
    });
    this.logger.log(`Worker notified for order #${order.id}`);
  }

  async findAll(adminUserId: string): Promise<Order[]> {
    const adminId = this.config.get<string>('LINE_ADMIN_USER_ID');
    if (!adminId || adminUserId !== adminId) {
      throw new ForbiddenException('Admin access only');
    }
    return this.ordersRepository.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findByUser(lineUserId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { lineUserId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async findOne(id: number, lineUserId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    if (order.lineUserId !== lineUserId)
      throw new ForbiddenException('You do not have access to this order');
    return order;
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    if (order.lineUserId !== dto.lineUserId)
      throw new ForbiddenException('You do not have access to this order');

    if (dto.name !== undefined) order.name = dto.name;
    if (dto.phone !== undefined) order.phone = dto.phone;
    if (dto.address !== undefined) order.address = dto.address;
    if (dto.addressLine !== undefined) order.addressLine = dto.addressLine;
    if (dto.subDistrict !== undefined) order.subDistrict = dto.subDistrict;
    if (dto.district !== undefined) order.district = dto.district;
    if (dto.province !== undefined) order.province = dto.province;
    if (dto.postalCode !== undefined) order.postalCode = dto.postalCode;

    return this.ordersRepository.save(order);
  }

  /**
   * Cancel an order. Only the order owner can cancel, and only while status = 'pending'.
   * Returns the updated order (status = 'cancelled').
   */
  async cancel(id: number, lineUserId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    if (order.lineUserId !== lineUserId)
      throw new ForbiddenException('You do not have access to this order');
    if (order.status === 'cancelled')
      throw new BadRequestException('Order is already cancelled');
    if (order.status !== 'pending')
      throw new BadRequestException('Only pending orders can be cancelled');

    order.status = 'cancelled';
    const saved = await this.ordersRepository.save(order);
    await this.notifyWorkerCancel(saved);
    return saved;
  }

  /** Admin: set order status (confirmed / cancelled / pending) */
  async setStatus(id: number, status: string, adminUserId: string): Promise<Order> {
    const adminId = this.config.get<string>('LINE_ADMIN_USER_ID');
    if (!adminId || adminUserId.trim() !== adminId.trim()) {
      throw new ForbiddenException('Admin access only');
    }
    const allowed = ['pending', 'confirmed', 'cancelled'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    const order = await this.ordersRepository.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    order.status = status;
    return this.ordersRepository.save(order);
  }

  /** Admin: set or update tracking number */
  async setTracking(id: number, trackingNumber: string, adminUserId: string): Promise<Order> {
    const adminId = this.config.get<string>('LINE_ADMIN_USER_ID');
    if (!adminId || adminUserId.trim() !== adminId.trim()) {
      throw new ForbiddenException('Admin access only');
    }
    const order = await this.ordersRepository.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    order.trackingNumber = trackingNumber?.trim() || null;
    return this.ordersRepository.save(order);
  }

  private async notifyWorkerCancel(order: Order): Promise<void> {
    const workerUrl = this.config.get<string>('WORKER_URL');
    const workerSecret = this.config.get<string>('WORKER_SECRET');
    if (!workerUrl || !workerSecret) return;

    await fetch(`${workerUrl}/notify/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': workerSecret,
      },
      body: JSON.stringify({
        id: order.id,
        name: order.name,
        totalPrice: Number(order.totalPrice),
        cancelledAt: new Date().toISOString(),
        items: order.items.map((i) => ({
          productName: i.productName,
          price: Number(i.price),
          quantity: i.quantity,
        })),
      }),
    }).catch((err) => {
      this.logger.error(`Failed to notify worker of cancellation for order #${order.id}: ${err.message}`);
    });
    this.logger.log(`Worker notified of cancellation for order #${order.id}`);
  }

  /**
   * Returns an aggregate report for the daily period that contains "now" (or a given label date).
   *
   * Cut-off logic (BKK = UTC+7):
   *   Period  :  day N  15:00 BKK  →  day N+1  14:59:59 BKK
   *   Label   :  day N+1 (the end calendar date)
   *
   * Example: now = Apr 5 19:03 BKK → label = "6 เม.ย. 2569"
   *                                    start = Apr 5 15:00 BKK = Apr 5 08:00 UTC
   *                                    end   = Apr 6 15:00 BKK = Apr 6 08:00 UTC (exclusive)
   *
   * @param labelDate  Optional "YYYY-MM-DD" in BKK calendar (the label / end date of the period).
   *                   Omit to get the current ongoing period.
   */
  async getReport(labelDate?: string) {
    const { startUTC, endUTC, periodLabel, periodStartBKK, periodEndBKK } =
      this.resolvePeriod(labelDate);

    const orders = await this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .where('o.created_at >= :start', { start: startUTC })
      .andWhere('o.created_at < :end', { end: endUTC })
      .orderBy('o.created_at', 'ASC')
      .getMany();

    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalPrice), 0);
    const codList = orders.filter((o) => o.paymentMethod === 'cod');
    const transferList = orders.filter((o) => o.paymentMethod === 'transfer');

    return {
      periodLabel,
      periodStartBKK,
      periodEndBKK,
      totalOrders: orders.length,
      totalRevenue,
      codOrders: codList.length,
      codRevenue: codList.reduce((s, o) => s + Number(o.totalPrice), 0),
      transferOrders: transferList.length,
      transferRevenue: transferList.reduce((s, o) => s + Number(o.totalPrice), 0),
      orders: orders.map((o) => ({
        id: o.id,
        name: o.name,
        totalPrice: Number(o.totalPrice),
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: Number(i.price),
        })),
      })),
    };
  }

  /**
   * Returns a UTF-8 CSV (with BOM for Excel Thai support) of the daily period.
   *
   * Columns: ชื่อ | เบอร์ | ที่อยู่ | แขวง/ตำบล เขต จังหวัด รหัสไปรษณีย์ | ชื่อสินค้า | ราคา
   * One row per item line — customer info repeats when an order has multiple items.
   */
  async getReportCsv(labelDate?: string): Promise<{ csv: string; filename: string }> {
    const { startUTC, endUTC, periodLabel, labelDateISO } = this.resolvePeriod(labelDate);

    const orders = await this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .where('o.created_at >= :start', { start: startUTC })
      .andWhere('o.created_at < :end', { end: endUTC })
      .orderBy('o.created_at', 'ASC')
      .getMany();

    const headers = [
      'ชื่อ',
      'เบอร์',
      'ที่อยู่',
      'แขวง/ตำบล เขต จังหวัด รหัสไปรษณีย์',
      'ชื่อสินค้า',
      'ราคา',
    ];

    const lines: string[] = [headers.map(csvCell).join(',')];

    for (const order of orders) {
      const addr = order.addressLine || order.address;
      const locality = [
        order.subDistrict,
        order.district,
        order.province,
        order.postalCode,
      ]
        .filter(Boolean)
        .join(' ');

      if (order.items.length === 0) {
        lines.push(
          [order.name, order.phone, addr, locality, '', ''].map(csvCell).join(','),
        );
      } else {
        for (const item of order.items) {
          const itemLabel =
            item.quantity > 1
              ? `${item.productName} x${item.quantity}`
              : item.productName;
          const subtotal = Number(item.price) * item.quantity;
          lines.push(
            [order.name, order.phone, addr, locality, itemLabel, String(subtotal)]
              .map(csvCell)
              .join(','),
          );
        }
      }
    }

    const BOM = '\uFEFF';
    const csv = BOM + lines.join('\r\n');
    // Use ISO date as ASCII-safe filename (Thai chars are not allowed in headers)
    const filename = `report-${labelDateISO}.csv`;

    return { csv, filename };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private resolvePeriod(labelDate?: string) {
    const BKK_MS = 7 * 60 * 60 * 1000;
    const THAI_MONTHS = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];

    let startUTC: Date;
    let labelDay: Date;

    if (labelDate) {
      const [y, m, d] = labelDate.split('-').map(Number);
      startUTC = new Date(Date.UTC(y, m - 1, d - 1, 8, 0, 0));
      labelDay = new Date(Date.UTC(y, m - 1, d));
    } else {
      const nowBKK = new Date(Date.now() + BKK_MS);
      const y = nowBKK.getUTCFullYear();
      const mo = nowBKK.getUTCMonth();
      const d = nowBKK.getUTCDate();
      const h = nowBKK.getUTCHours();

      if (h >= 15) {
        startUTC = new Date(Date.UTC(y, mo, d, 8, 0, 0));
        labelDay = new Date(Date.UTC(y, mo, d + 1));
      } else {
        startUTC = new Date(Date.UTC(y, mo, d - 1, 8, 0, 0));
        labelDay = new Date(Date.UTC(y, mo, d));
      }
    }

    const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

    const fmtDate = (d: Date) => `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]}`;
    const fmtTime = (d: Date) =>
      `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

    const startBKK = new Date(startUTC.getTime() + BKK_MS);
    const endBKK = new Date(endUTC.getTime() + BKK_MS - 60_000);

    const periodLabel = `${labelDay.getUTCDate()} ${THAI_MONTHS[labelDay.getUTCMonth()]} ${labelDay.getUTCFullYear() + 543}`;
    const periodStartBKK = `${fmtDate(startBKK)} ${fmtTime(startBKK)}`;
    const periodEndBKK = `${fmtDate(endBKK)} ${fmtTime(endBKK)}`;

    const labelDateISO = `${labelDay.getUTCFullYear()}-${String(labelDay.getUTCMonth() + 1).padStart(2, '0')}-${String(labelDay.getUTCDate()).padStart(2, '0')}`;
    return { startUTC, endUTC, periodLabel, periodStartBKK, periodEndBKK, labelDateISO };
  }
}

/** Escape a value for RFC-4180 CSV: wrap in quotes if it contains comma, quote, or newline. */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
