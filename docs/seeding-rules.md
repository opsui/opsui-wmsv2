# Seeding Rules

## Seeding System (Flattened)

### Required Properties

1. **Idempotent** - Running multiple times produces same result
2. **Deterministic** - Same input = same output
3. **Environment-aware** - Knows dev/staging/prod
4. **Schema-validated** - Matches current schema
5. **Non-destructive** - Never deletes existing data

### Seed File Location

All seeds in: `/packages/backend/src/db/seeds/`

```
seeds/
├── 001_reference_data.ts    # Static reference data
├── 002_lookup_tables.ts     # Lookup/enumeration values
├── 003_core_entities.ts     # Main business entities
├── 004_relational_data.ts   # Junction tables, relationships
└── seed-runner.ts           # Orchestrator
```

### Seeding Order (Enforced)

1. **Base reference tables** - users, roles, permissions
2. **Lookup tables** - statuses, categories, types
3. **Core entities** - SKUs, locations, customers
4. **Relational tables** - orders, order_items, transactions

### Idempotency Enforcement

**Use UPSERTS only:**

```sql
INSERT INTO users (user_id, email, name)
VALUES ($1, $2, $3)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();
```

**Rules:**

- Use stable unique keys (NOT auto-increment IDs)
- Never rely on database-generated IDs for relationships
- Use `ON CONFLICT` for all inserts
- Running seeds 100x = same state

### Forbidden Actions

- NO `TRUNCATE`
- NO `DELETE FROM` (without explicit approval)
- NO `DROP TABLE`
- NO seeding inside migrations
- NO seeding on app startup
- NO reset commands

### Seed Version Tracking

Maintain `seed_history` table:

```sql
CREATE TABLE seed_history (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    seed_name VARCHAR(255) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    records_affected INTEGER,
    UNIQUE(version, seed_name, environment)
);
```

### Pre-Execution Validation

Before seeding:

```
TARGET DATABASE: 103.208.85.233:5432/wms_db
ENVIRONMENT: production
```

**Validate:**

- Host is NOT localhost/127.0.0.1/::1
- Environment matches intended target
- Schema version matches seed expectations

### Running Seeds

```bash
# Check seed status
npm run db:seed:status

# Run all pending seeds
npm run db:seed

# Run specific seed
npm run db:seed -- --file=001_reference_data

# Dry run (show what would happen)
npm run db:seed -- --dry-run
```

### Environment Safety

**Production seeding:**

- Only reference/lookup data (no test data)
- Requires explicit approval for entity seeds
- Must have backup before execution
- Audit log all changes

**Development seeding:**

- Full seed with test data allowed
- Still non-destructive (upserts only)

### Seed File Template

```typescript
import { Pool } from 'pg';

const SEED_VERSION = '001';
const SEED_NAME = 'reference_data';

export async function seed(pool: Pool): Promise<number> {
  const client = await pool.connect();
  let recordsAffected = 0;

  try {
    await client.query('BEGIN');

    // Check if already executed
    const { rows } = await client.query(
      `SELECT 1 FROM seed_history
             WHERE version = $1 AND seed_name = $2`,
      [SEED_VERSION, SEED_NAME]
    );

    if (rows.length > 0) {
      console.log(`Seed ${SEED_NAME} already executed, skipping...`);
      return 0;
    }

    // Perform seed operations with UPSERTS
    // ...

    // Record execution
    await client.query(
      `INSERT INTO seed_history (version, seed_name, environment, records_affected)
             VALUES ($1, $2, $3, $4)`,
      [SEED_VERSION, SEED_NAME, process.env.NODE_ENV, recordsAffected]
    );

    await client.query('COMMIT');
    return recordsAffected;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```
