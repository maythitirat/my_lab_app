import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
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

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      order: { createdAt: 'DESC' },
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
    const BKK_MS = 7 * 60 * 60 * 1000;
    const THAI_MONTHS = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];

    let startUTC: Date;
    let labelDay: Date; // midnight UTC of the label date

    if (labelDate) {
      const [y, m, d] = labelDate.split('-').map(Number);
      // Period starts the day before the label at 15:00 BKK = 08:00 UTC
      startUTC = new Date(Date.UTC(y, m - 1, d - 1, 8, 0, 0));
      labelDay = new Date(Date.UTC(y, m - 1, d));
    } else {
      const nowBKK = new Date(Date.now() + BKK_MS);
      const y = nowBKK.getUTCFullYear();
      const mo = nowBKK.getUTCMonth();
      const d = nowBKK.getUTCDate();
      const h = nowBKK.getUTCHours();

      if (h >= 15) {
        // After cut-off: period started today, label = tomorrow
        startUTC = new Date(Date.UTC(y, mo, d, 8, 0, 0));
        labelDay = new Date(Date.UTC(y, mo, d + 1));
      } else {
        // Before cut-off: period started yesterday, label = today
        startUTC = new Date(Date.UTC(y, mo, d - 1, 8, 0, 0));
        labelDay = new Date(Date.UTC(y, mo, d));
      }
    }

    const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000); // exclusive

    // Human-readable period strings (BKK display)
    const fmtDate = (d: Date) => `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]}`;
    const fmtTime = (d: Date) =>
      `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

    const startBKK = new Date(startUTC.getTime() + BKK_MS);
    const endBKK = new Date(endUTC.getTime() + BKK_MS - 60_000); // show 14:59

    const periodLabel = `${labelDay.getUTCDate()} ${THAI_MONTHS[labelDay.getUTCMonth()]} ${labelDay.getUTCFullYear() + 543}`;
    const periodStartBKK = `${fmtDate(startBKK)} ${fmtTime(startBKK)}`;
    const periodEndBKK = `${fmtDate(endBKK)} ${fmtTime(endBKK)}`;

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
}
