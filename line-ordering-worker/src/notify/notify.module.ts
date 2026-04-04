import { Module } from '@nestjs/common';
import { NotifyController } from './notify.controller';
import { NotifyService } from './notify.service';
import { LineModule } from '../line/line.module';

@Module({
  imports: [LineModule],
  controllers: [NotifyController],
  providers: [NotifyService],
})
export class NotifyModule {}
