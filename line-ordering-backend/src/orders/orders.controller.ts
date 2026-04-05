import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  /**
   * Daily report for the current period (or a specific label date via ?date=YYYY-MM-DD).
   * Must be declared before :id to avoid route collision.
   */
  @Get('report')
  getReport(@Query('date') date?: string) {
    return this.ordersService.getReport(date);
  }

  /** Returns recent orders for the given LINE user (used by the edit-order page) */
  @Get('my')
  findMy(@Query('lineUserId') lineUserId: string) {
    return this.ordersService.findByUser(lineUserId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.ordersService.findOne(id, lineUserId);
  }

  /** Allows updating name / phone / address only — items are locked (COD cutoff risk) */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }
}
