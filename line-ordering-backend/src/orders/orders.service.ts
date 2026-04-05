import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from './dto/create-order.dto';
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
      items: createOrderDto.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    const saved = await this.ordersRepository.save(order);
    this.notifyWorker(saved).catch((err) =>
      this.logger.error(`Worker notify failed: ${err.message}`),
    );
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
}
