import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
  findAll(@Query('lineUserId') lineUserId: string) {
    return this.ordersService.findAll(lineUserId);
  }

  /**
   * Daily report for the current period (or a specific label date via ?date=YYYY-MM-DD).
   * Must be declared before :id to avoid route collision.
   */
  @Get('report')
  getReport(@Query('date') date?: string) {
    return this.ordersService.getReport(date);
  }

  /** Download the daily report as CSV (UTF-8 BOM for Excel Thai support). */
  @Get('report/csv')
  async getReportCsv(
    @Query('date') date: string | undefined,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.ordersService.getReportCsv(date);
    const encodedName = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodedName}`,
    );
    res.send(csv);
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

  /** Admin: set order status (confirmed / cancelled / pending) */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.setStatus(id, status, lineUserId);
  }

  /** Admin: set tracking number on an order */
  @Patch(':id/tracking')
  @HttpCode(HttpStatus.OK)
  setTracking(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    return this.ordersService.setTracking(id, trackingNumber, lineUserId);
  }

  /** Cancel an order — only the owner can cancel, and only while status = 'pending'. */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.ordersService.cancel(id, lineUserId);
  }
}
