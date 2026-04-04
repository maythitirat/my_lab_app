import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { validateSignature, WebhookEvent } from '@line/bot-sdk';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {}

  /**
   * LINE Platform → Worker
   * Receives events from LINE Messaging API (e.g. admin replies, button taps).
   */
  @Post('line')
  @HttpCode(200)
  async lineWebhook(@Req() req: Request, @Res() res: Response) {
    const channelSecret = this.config.getOrThrow<string>('LINE_CHANNEL_SECRET');
    const signature = req.headers['x-line-signature'] as string;
    const rawBody: Buffer | undefined = (req as any).rawBody;

    if (!rawBody || !validateSignature(rawBody, channelSecret, signature)) {
      this.logger.warn('Invalid LINE signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const events: WebhookEvent[] = req.body?.events ?? [];
    await this.webhookService.handleEvents(events);
    return res.status(200).json({ ok: true });
  }
}
