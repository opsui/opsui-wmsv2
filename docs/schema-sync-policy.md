# Schema Sync Policy

## Single Source of Truth

The canonical schema is defined in:

```
/packages/backend/src/db/schema.sql
```

All migrations must be generated from and validate against this schema.

## Schema Definition Rules

1. **One canonical schema file** - `schema.sql`
2. **Migrations generated from schema changes**
3. **No manual production edits**
4. **No schema changes outside version control**

## Drift Detection

### Automated Checks

Run drift detection during:

- Development startup
- CI/CD pipeline
- Pre-deployment
- Post-deployment verification

### Detection Script

```bash
# Export current production schema
pg_dump -h 103.208.85.233 -U wms_user -s wms_db > current_schema.sql

# Compare with canonical schema
diff schema.sql current_schema.sql

# If differences found → FAIL
```

### Fail Conditions

Hard fail if:

- Table exists in production but not in schema.sql
- Column exists in production but not in schema.sql
- Constraint mismatch
- Index mismatch
- Migration history checksum mismatch

## Schema Validation

### Pre-Migration Validation

```typescript
async function validateSchema(
  expected: Schema,
  actual: Schema
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check for missing tables
  for (const table of expected.tables) {
    if (!actual.tables.find(t => t.name === table.name)) {
      errors.push(`Missing table: ${table.name}`);
    }
  }

  // Check for missing columns
  for (const table of expected.tables) {
    const actualTable = actual.tables.find(t => t.name === table.name);
    if (actualTable) {
      for (const column of table.columns) {
        if (!actualTable.columns.find(c => c.name === column.name)) {
          errors.push(`Missing column: ${table.name}.${column.name}`);
        }
      }
    }
  }

  // Check migration history
  const expectedMigrations = getExpectedMigrations();
  const actualMigrations = await getExecutedMigrations();

  for (const migration of expectedMigrations) {
    const executed = actualMigrations.find(
      m => m.version === migration.version
    );
    if (!executed) {
      errors.push(`Missing migration: ${migration.version}`);
    } else if (executed.checksum !== migration.checksum) {
      errors.push(`Checksum mismatch: ${migration.version}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Post-Migration Validation

After running migrations:

1. Verify all expected tables exist
2. Verify all expected columns exist
3. Verify constraints are applied
4. Verify indexes are created
5. Update schema checksum

## Schema Version Control

### Version Format

```
SCHEMA_VERSION=YYYYMMDD.HHMMSS
```

Example: `20240115.143022`

### Version Tracking

Store in database:

```sql
CREATE TABLE schema_version (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    migrations_applied TEXT[]
);
```

### Sync Procedure

When schema drift is detected:

1. **STOP** - Do not proceed with deployment
2. **EXPORT** - Export production schema
3. **COMPARE** - Identify differences
4. **DECIDE**:
   - If production is behind: Run missing migrations
   - If production is ahead: Update canonical schema (requires approval)
   - If diverged: Manual resolution required
5. **DOCUMENT** - Record resolution in changelog
6. **VERIFY** - Re-run drift detection

## Backup Before Schema Changes

```bash
# Full backup
pg_dump -h 103.208.85.233 -U wms_user wms_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup
pg_dump -h 103.208.85.233 -U wms_user -s wms_db > schema_backup_$(date +%Y%m%d_%H%M%S).sql
```

## CI/CD Integration

```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation

on:
  push:
    paths:
      - 'packages/backend/src/db/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Validate Schema
        run: |
          npm run db:validate

      - name: Check Migration Checksums
        run: |
          npm run db:checksum
```
