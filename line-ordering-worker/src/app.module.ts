import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotifyModule } from './notify/notify.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    NotifyModule,
    WebhookModule,
  ],
})
export class AppModule {}
