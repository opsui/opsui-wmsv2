# Database Setup Guide for Team Members

This guide walks you through setting up the PostgreSQL database for the Warehouse Management System.

## Quick Setup (Recommended)

The easiest way to get started is using Docker Compose, which sets up PostgreSQL, Redis, and the application automatically.

### Prerequisites

- Docker Desktop installed and running
- Git installed

### Step 1: Clone the Repository

```bash
git clone https://github.com/opsui/opsui-wmsv2.git
cd opsui-wmsv2
```

### Step 2: Start the Database

```bash
docker-compose up -d postgres redis
```

This will:
- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Initialize the database with the schema from `packages/backend/src/db/schema.sql`

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment

```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` if needed (defaults should work for local development):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wms_db
DB_USER=wms_user
DB_PASSWORD=wms_password
```

### Step 5: Run Migrations

```bash
npm run db:migrate
```

This applies all database migrations from `packages/backend/src/db/migrations/`.

### Step 6: Seed Initial Data (Optional)

For development with sample data:

```bash
npm run db:seed
```

This creates:
- Sample SKUs (20 products)
- Bin locations (17 locations across zones A-D)
- Sample orders (15 orders with various priorities)
- Order items and pick tasks

### Step 7: Start the Application

```bash
npm run dev
```

The application will be available at:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

## Default Login Credentials

After seeding, you can login with:

**Admin User:**
- Email: `admin@wms.local`
- Password: `admin123`

**Test Pickers** (created by seed):
- `picker1@wms.local` / `password123`
- `picker2@wms.local` / `password123`
- `picker3@wms.local` / `password123`

## Manual PostgreSQL Setup (Without Docker)

If you prefer to use a local PostgreSQL installation:

### 1. Install PostgreSQL 15+

- Windows: Download from https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql@15`
- Linux: `sudo apt install postgresql-15`

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Run these commands in psql
CREATE DATABASE wms_db;
CREATE USER wms_user WITH PASSWORD 'wms_password';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
\q
```

### 3. Load Schema

```bash
psql -U wms_user -d wms_db -f packages/backend/src/db/schema.sql
```

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Seed Data (Optional)

```bash
npm run db:seed
```

## Using pgAdmin (Optional)

Docker Compose includes pgAdmin for database management:

```bash
docker-compose --profile tools up -d
```

Access pgAdmin at: http://localhost:5050

**Login:**
- Email: `admin@wms.local`
- Password: `admin`

**Connection Details:**
- Host: `postgres` (or `localhost` if outside Docker)
- Port: `5432`
- Database: `wms_db`
- Username: `wms_user`
- Password: `wms_password`

## Troubleshooting

### Port Already in Use

If port 5432 is already in use, edit `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Use 5433 instead
```

Then update your `.env` file:
```
DB_PORT=5433
```

### Database Connection Errors

1. Check Docker is running: `docker ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify credentials in `.env` match docker-compose.yml

### Migration Errors

If migrations fail:

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
# Wait for database to be healthy
npm run db:migrate
npm run db:seed
```

### Permission Errors

If you get permission errors:

```bash
# Grant privileges manually
psql -U postgres -d wms_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wms_user;"
psql -U postgres -d wms_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wms_user;"
psql -U postgres -d wms_db -c "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO wms_user;"
```

## Database Schema

The schema is defined in `packages/backend/src/db/schema.sql` and includes:

- **Users** - System users with roles (Admin, Supervisor, Packer, Picker)
- **SKUs** - Product catalog
- **Bin Locations** - Warehouse storage locations
- **Inventory Units** - Stock levels at each location
- **Orders** - Customer orders with status tracking
- **Order Items** - Line items for each order
- **Pick Tasks** - Individual picking tasks
- **Inventory Transactions** - Audit log of all inventory changes
- **Order State Changes** - Audit log of order status changes

See [packages/backend/docs/DATABASE_SCHEMA.md](packages/backend/docs/DATABASE_SCHEMA.md) for complete documentation.

## Running Tests

Database tests require a test database:

```bash
# Test database is created automatically
npm run test
```

## Stopping the Database

```bash
docker-compose down
```

To remove all data volumes (fresh start):

```bash
docker-compose down -v
```

## Next Steps

After setting up the database:

1. Read the [README.md](README.md) for development overview
2. Review [QUICKSTART.md](QUICKSTART.md) for team onboarding
3. Check [API.md](packages/backend/docs/API.md) for API documentation

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Review Docker logs: `docker-compose logs`
3. Contact the team via GitHub Issues
