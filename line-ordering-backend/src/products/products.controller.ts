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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddImageDto } from './dto/add-image.dto';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Public — list active products */
  @Get()
  findAll(@Query('admin') admin?: string, @Query('lineUserId') lineUserId?: string) {
    if (admin === 'true' && lineUserId) {
      return this.productsService.findAllAdmin(lineUserId);
    }
    return this.productsService.findAll();
  }

  /** Admin — create product */
  @Post()
  create(@Body() dto: CreateProductDto, @Query('lineUserId') lineUserId: string) {
    return this.productsService.create(dto, lineUserId);
  }

  /** Admin — update product */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.productsService.update(id, dto, lineUserId);
  }

  /** Admin — delete product */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('lineUserId') lineUserId: string,
  ) {
    await this.productsService.remove(id, lineUserId);
    return { ok: true };
  }

  // ── Image endpoints ────────────────────────────────────────────────

  /** Admin — get a presigned S3 URL for direct browser upload */
  @Post('presigned-url')
  getPresignedUrl(
    @Body() dto: PresignedUrlDto,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.productsService.getPresignedUrl(dto, lineUserId);
  }

  /** Admin — attach an image URL to a product */
  @Post(':id/images')
  addImage(
    @Param('id', ParseIntPipe) productId: number,
    @Body() dto: AddImageDto,
    @Query('lineUserId') lineUserId: string,
  ) {
    return this.productsService.addImage(productId, dto, lineUserId);
  }

  /** Admin — remove an image from a product */
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('id', ParseIntPipe) productId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Query('lineUserId') lineUserId: string,
  ) {
    await this.productsService.removeImage(productId, imageId, lineUserId);
    return { ok: true };
  }
}
