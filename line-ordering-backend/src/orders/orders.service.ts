import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
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

    return this.ordersRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
