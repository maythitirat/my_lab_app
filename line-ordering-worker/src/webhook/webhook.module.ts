import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { LineModule } from '../line/line.module';

@Module({
  imports: [LineModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
