# line-ordering-backend

NestJS REST API for the LINE LIFF Ordering System.

## Tech Stack
- **NestJS** (modular architecture)
- **TypeORM** + **PostgreSQL**
- **class-validator** DTO validation
- **@nestjs/config** for environment management

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DB credentials

# 3. Start PostgreSQL (requires Docker)
docker compose -f ../docker-compose.yml up -d
# or point DB_* env vars at any running Postgres instance

# 4. Start in dev mode (auto-reload)
npm run start:dev
```

API runs at **http://localhost:3001**

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/orders` | Create a new order |
| `GET`  | `/orders` | List all orders (newest first) |

### POST /orders — body

```json
{
  "lineUserId": "U1234567890abcdef",
  "name": "John Doe",
  "phone": "081-234-5678",
  "address": "123 Main St, Bangkok 10100",
  "totalPrice": 450,
  "items": [
    { "productId": 1, "productName": "Organic Green Tea", "price": 120, "quantity": 2 },
    { "productId": 17, "productName": "Pad Thai", "price": 120, "quantity": 1 }
  ]
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment name |
| `PORT` | `3001` | HTTP port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | DB username |
| `DB_PASSWORD` | `postgres` | DB password |
| `DB_NAME` | `line_liff_ordering` | Database name |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |

## Database Schema

TypeORM auto-syncs the schema in `development`. For production, disable `synchronize` and use migrations.

```
orders        — id, line_user_id, name, phone, address, total_price, created_at
order_items   — id, order_id (FK), product_id, product_name, price, quantity
```

## Production Build

```bash
npm run build
npm run start:prod
```
