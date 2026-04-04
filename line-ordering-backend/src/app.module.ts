import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        // Prefer a single DATABASE_URL (Supabase / any PaaS postgres)
        // Falls back to individual DB_* vars for local dev
        const databaseUrl = config.get<string>('DATABASE_URL');
        const base = databaseUrl
          ? {
              url: databaseUrl,
              ssl: { rejectUnauthorized: false }, // required by Supabase
            }
          : {
              host: config.get<string>('DB_HOST', 'localhost'),
              port: config.get<number>('DB_PORT', 5432),
              username: config.get<string>('DB_USERNAME', 'postgres'),
              password: config.get<string>('DB_PASSWORD', 'postgres'),
              database: config.get<string>('DB_NAME', 'line_liff_ordering'),
            };
        return {
          type: 'postgres' as const,
          ...base,
          entities: [Order, OrderItem],
          // Never auto-sync in production — use SQL migrations instead
          synchronize: !isProd,
          logging: !isProd,
          // Keep the connection alive between Lambda warm invocations
          keepConnectionAlive: true,
          extra: {
            // Limit pool size to avoid exhausting Supabase free-tier connections
            max: 2,
          },
        };
      },
      inject: [ConfigService],
    }),
    OrdersModule,
  ],
})
export class AppModule {}
