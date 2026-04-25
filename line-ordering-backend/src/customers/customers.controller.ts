import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpsertCustomerDto, LinkLineUserDto, NotifyCustomerDto } from './dto/customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query('lineUserId') lineUserId: string) {
    return this.customersService.findAll(lineUserId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  upsert(
    @Body() dto: UpsertCustomerDto,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.customersService.upsert(dto, lineUserId);
  }

  @Post('link')
  @HttpCode(HttpStatus.OK)
  linkLine(
    @Body() dto: LinkLineUserDto,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.customersService.linkLine(dto, lineUserId);
  }

  @Patch(':id/unlink')
  @HttpCode(HttpStatus.OK)
  unlinkLine(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.customersService.unlinkLine(id, lineUserId);
  }

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  notify(
    @Body() dto: NotifyCustomerDto,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.customersService.notify(dto, lineUserId);
  }

  /** Search LINE followers by display name (for link modal autocomplete) */
  @Get('followers')
  searchFollowers(
    @Query('q') q: string = '',
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.customersService.searchFollowers(q, lineUserId);
  }

  /** Called by the worker webhook — no auth guard, secured by internal network */
  @Post('followers/upsert')
  @HttpCode(HttpStatus.OK)
  async upsertFollower(
    @Body() body: { lineUserId: string; displayName?: string; pictureUrl?: string },
  ) {
    await this.customersService.upsertFollower(body.lineUserId, body.displayName ?? null, body.pictureUrl ?? null);
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.customersService.remove(id, lineUserId);
  }
}
