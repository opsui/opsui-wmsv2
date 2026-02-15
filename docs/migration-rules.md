# Migration Rules

## Migration System (Hardened)

### Required Properties

1. **Timestamped** - File prefix: `YYYYMMDDHHMMSS_description.sql`
2. **Sequential** - Executed in timestamp order
3. **Immutable** - Never modify after commit to main branch
4. **Version-controlled** - All migrations in git
5. **Atomic** - Wrapped in transactions
6. **Reversible** - Include DOWN migration when possible

### Migration File Structure

```sql
-- Migration: 001_create_users_table
-- Created: 2024-01-15
-- Author: System

BEGIN;

-- Up migration
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('001_create_users_table', 'Create users table');

COMMIT;
```

### Naming Convention

```
{sequence}_{action}_{target}.sql

Examples:
001_create_users_table.sql
002_add_email_to_users.sql
003_create_orders_table.sql
004_add_foreign_keys.sql
```

### Destructive Change Protection

**Blocked by default (require explicit approval):**

- `DROP TABLE`
- `DROP COLUMN`
- Type narrowing (e.g., VARCHAR(255) → VARCHAR(50))
- Removing NOT NULL constraint
- Changing foreign key behavior
- Removing indexes used in production

**Required for destructive changes:**

1. Create backup: `pg_dump wms_db > backup_YYYYMMDD.sql`
2. Document reason in migration file
3. Add rollback plan
4. Get explicit approval

### Drift Detection

Run before migrations:

```bash
# Compare local schema with expected
npm run db:validate

# Check migration history
npm run db:history
```

**Fail conditions:**

- Missing migrations in history
- Checksum mismatch
- Unexpected tables/columns

### Running Migrations

**Pre-execution validation (MANDATORY):**

```
TARGET DATABASE: 103.208.85.233:5432/wms_db
ENVIRONMENT: production
```

**If localhost detected without ALLOW_LOCAL_DB=true → ABORT**

```bash
# Check current state
npm run db:status

# Run pending migrations
npm run db:migrate

# Rollback last migration (if reversible)
npm run db:rollback
```

### Migration Checklist

- [ ] Migration file follows naming convention
- [ ] Migration wrapped in transaction
- [ ] Down migration provided (if possible)
- [ ] Tested locally with test database
- [ ] No destructive changes without approval
- [ ] Foreign keys have proper ON DELETE/UPDATE
- [ ] Indexes created for new foreign keys
- [ ] Schema version recorded
