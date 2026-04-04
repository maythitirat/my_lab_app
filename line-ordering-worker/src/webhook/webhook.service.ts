import { Injectable, Logger } from '@nestjs/common';
import { WebhookEvent, MessageEvent, TextEventMessage } from '@line/bot-sdk';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async handleEvents(events: WebhookEvent[]): Promise<void> {
    for (const event of events) {
      if (event.type === 'message') {
        await this.handleMessage(event as MessageEvent);
      }
      // Add more event types here (postback, follow, etc.) as needed
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    if (event.message.type !== 'text') return;
    const text = (event.message as TextEventMessage).text.trim().toLowerCase();
    const source = event.source;
    const from = source.userId ?? (source.type === 'group' ? source.groupId : source.type === 'room' ? source.roomId : undefined) ?? 'unknown';
    this.logger.log(`Message from ${from}: "${text}"`);
    // Future: parse admin commands like "confirm 5", "cancel 5"
  }
}
