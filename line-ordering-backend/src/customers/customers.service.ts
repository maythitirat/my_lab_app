import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Customer } from './entities/customer.entity';
import { LineFollower } from './entities/line-follower.entity';
import { UpsertCustomerDto, LinkLineUserDto, NotifyCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
    @InjectRepository(LineFollower)
    private readonly followerRepo: Repository<LineFollower>,
    private readonly config: ConfigService,
  ) {}

  private assertAdmin(lineUserId: string): void {
    const adminId = this.config.get<string>('LINE_ADMIN_USER_ID');
    if (!adminId || lineUserId.trim() !== adminId.trim()) {
      throw new ForbiddenException('Admin access only');
    }
  }

  /** List all customers */
  async findAll(adminUserId: string): Promise<Customer[]> {
    this.assertAdmin(adminUserId);
    return this.repo.find({ order: { updatedAt: 'DESC' } });
  }

  /** Add or update a customer record from external system A (by phone) */
  async upsert(dto: UpsertCustomerDto, adminUserId: string): Promise<Customer> {
    this.assertAdmin(adminUserId);
    let customer = await this.repo.findOne({ where: { phone: dto.phone } });
    if (customer) {
      if (dto.name !== undefined) customer.name = dto.name;
      if (dto.note !== undefined) customer.note = dto.note;
    } else {
      customer = this.repo.create({
        phone: dto.phone,
        name: dto.name ?? null,
        note: dto.note ?? null,
        lineUserId: null,
        lineDisplayName: null,
      });
    }
    return this.repo.save(customer);
  }

  /** Link a LINE userId to a customer (admin pastes from OA Manager URL) */
  async linkLine(dto: LinkLineUserDto, adminUserId: string): Promise<Customer> {
    this.assertAdmin(adminUserId);

    const customer = await this.repo.findOne({ where: { phone: dto.phone } });
    if (!customer) throw new NotFoundException(`Customer with phone ${dto.phone} not found`);

    // Check userId not already used by another customer
    const existing = await this.repo.findOne({ where: { lineUserId: dto.lineUserId } });
    if (existing && existing.id !== customer.id) {
      throw new ConflictException(`LINE userId already linked to phone ${existing.phone}`);
    }

    customer.lineUserId = dto.lineUserId;

    // Fetch LINE display name
    const displayName = await this.fetchLineDisplayName(dto.lineUserId);
    if (displayName) customer.lineDisplayName = displayName;

    return this.repo.save(customer);
  }

  /** Unlink LINE userId from a customer */
  async unlinkLine(id: number, adminUserId: string): Promise<Customer> {
    this.assertAdmin(adminUserId);
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer #${id} not found`);
    customer.lineUserId = null;
    customer.lineDisplayName = null;
    return this.repo.save(customer);
  }

  /** Delete a customer record */
  async remove(id: number, adminUserId: string): Promise<void> {
    this.assertAdmin(adminUserId);
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer #${id} not found`);
    await this.repo.remove(customer);
  }

  /** Send a text message to customer via LINE (requires lineUserId to be linked) */
  async notify(dto: NotifyCustomerDto, adminUserId: string): Promise<{ sent: boolean }> {
    this.assertAdmin(adminUserId);

    const customer = await this.repo.findOne({ where: { phone: dto.phone } });
    if (!customer) throw new NotFoundException(`Customer with phone ${dto.phone} not found`);
    if (!customer.lineUserId) {
      throw new ConflictException(`Customer phone ${dto.phone} has no LINE account linked yet`);
    }

    const workerUrl = this.config.get<string>('WORKER_URL');
    const workerSecret = this.config.get<string>('WORKER_SECRET');
    if (!workerUrl || !workerSecret) {
      throw new Error('WORKER_URL or WORKER_SECRET not configured');
    }

    const res = await fetch(`${workerUrl}/notify/push-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': workerSecret,
      },
      body: JSON.stringify({ lineUserId: customer.lineUserId, message: dto.message }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Worker error ${res.status}: ${body}`);
    }

    this.logger.log(`Message sent to customer phone=${dto.phone} lineUserId=${customer.lineUserId}`);
    return { sent: true };
  }

  /** Called by worker webhook when a customer types the keyword */
  async upsertFollower(lineUserId: string, displayName: string | null, pictureUrl: string | null): Promise<void> {
    const existing = await this.followerRepo.findOne({ where: { lineUserId } });
    if (existing) {
      existing.displayName = displayName ?? existing.displayName;
      existing.pictureUrl = pictureUrl ?? existing.pictureUrl;
      existing.lastSeenAt = new Date();
      await this.followerRepo.save(existing);
    } else {
      await this.followerRepo.save(this.followerRepo.create({ lineUserId, displayName, pictureUrl }));
    }
    this.logger.log(`Follower upserted: ${lineUserId} (${displayName})`);
  }

  /** Search LINE followers by display name — used by admin link modal */
  async searchFollowers(q: string, adminUserId: string): Promise<LineFollower[]> {
    this.assertAdmin(adminUserId);
    if (!q || q.trim().length < 1) {
      return this.followerRepo.find({ order: { lastSeenAt: 'DESC' }, take: 20 });
    }
    return this.followerRepo.find({
      where: { displayName: ILike(`%${q.trim()}%`) },
      order: { lastSeenAt: 'DESC' },
      take: 20,
    });
  }

  private async fetchLineDisplayName(lineUserId: string): Promise<string | null> {
    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (!token) return null;
    try {
      const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as { displayName: string };
      return data.displayName ?? null;
    } catch {
      return null;
    }
  }
}
