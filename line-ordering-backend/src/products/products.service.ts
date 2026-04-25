import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddImageDto } from './dto/add-image.dto';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    private readonly config: ConfigService,
  ) {}

  private assertAdmin(lineUserId: string): void {
    const adminId = this.config.get<string>('LINE_ADMIN_USER_ID');
    if (!adminId || lineUserId !== adminId) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /** Public — returns active products ordered by sort_order */
  findAll(): Promise<Product[]> {
    return this.repo.find({
      where: { isActive: true },
      relations: ['images'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /** Admin — returns all products including inactive */
  findAllAdmin(lineUserId: string): Promise<Product[]> {
    this.assertAdmin(lineUserId);
    return this.repo.find({
      relations: ['images'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async create(dto: CreateProductDto, lineUserId: string): Promise<Product> {
    this.assertAdmin(lineUserId);
    const product = this.repo.create({
      name: dto.name,
      price: dto.price,
      category: dto.category,
      imageUrl: dto.imageUrl ?? '',
      description: dto.description ?? '',
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.repo.save(product);
    this.logger.log(`Product #${saved.id} created: ${saved.name}`);
    return saved;
  }

  async update(id: number, dto: UpdateProductDto, lineUserId: string): Promise<Product> {
    this.assertAdmin(lineUserId);
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    Object.assign(product, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
    const saved = await this.repo.save(product);
    this.logger.log(`Product #${saved.id} updated`);
    return saved;
  }

  async remove(id: number, lineUserId: string): Promise<void> {
    this.assertAdmin(lineUserId);
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    await this.repo.remove(product);
    this.logger.log(`Product #${id} deleted`);
  }

  // ── Image management ──────────────────────────────────────────────

  /** Add an image URL to a product (URL uploaded directly by the browser) */
  async addImage(
    productId: number,
    dto: AddImageDto,
    lineUserId: string,
  ): Promise<ProductImage> {
    this.assertAdmin(lineUserId);
    const product = await this.repo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product #${productId} not found`);

    const img = this.imageRepo.create({
      productId,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.imageRepo.save(img);
  }

  /** Remove an image from a product */
  async removeImage(
    productId: number,
    imageId: number,
    lineUserId: string,
  ): Promise<void> {
    this.assertAdmin(lineUserId);
    const img = await this.imageRepo.findOne({ where: { id: imageId, productId } });
    if (!img) throw new NotFoundException(`Image #${imageId} not found`);
    await this.imageRepo.remove(img);
  }

  // ── S3 Presigned URL ─────────────────────────────────────────────

  /** Generate a presigned PUT URL so the browser can upload directly to S3 */
  async getPresignedUrl(
    dto: PresignedUrlDto,
    lineUserId: string,
  ): Promise<{ presignedUrl: string; fileUrl: string }> {
    this.assertAdmin(lineUserId);

    const bucket = this.config.get<string>('PRODUCT_IMAGES_BUCKET');
    if (!bucket) throw new Error('PRODUCT_IMAGES_BUCKET env var not configured');

    const region = this.config.get<string>('AWS_REGION') ?? 'ap-southeast-1';
    const ext = dto.fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const client = new S3Client({ region });
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return { presignedUrl, fileUrl };
  }
}
