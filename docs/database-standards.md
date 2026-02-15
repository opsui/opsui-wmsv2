# Database Standards

## Target Database

**Canonical Production Database:**

- Host: 103.208.85.233
- Port: 5432
- Database: wms_db
- User: wms_user

**Local Development (via SSH tunnel):**

```bash
ssh -f -N -L 5433:localhost:5432 root@103.208.85.233
```

Connect to localhost:5433

## Table Naming Rules

- Use snake_case for all table names
- Use plural form for table names (e.g., `users`, `orders`, `order_items`)
- Use singular form for junction tables describing relationships
- Prefix with domain if needed (e.g., `inventory_`, `warehouse_`)

## Column Naming Rules

- Use snake_case for all column names
- Use singular form for column names
- Boolean columns should be prefixed with `is_`, `has_`, or `can_`
- Timestamp columns should end with `_at` (e.g., `created_at`, `updated_at`)
- ID columns should end with `_id` (e.g., `user_id`, `order_id`)
- Foreign key columns should match the referenced table's primary key name

## Data Type Standards

| PostgreSQL Type            | Use Case                              |
| -------------------------- | ------------------------------------- |
| `uuid`                     | Primary keys, external identifiers    |
| `varchar(n)`               | Short text with known max length      |
| `text`                     | Long-form text, descriptions          |
| `integer`                  | Counts, quantities, small numbers     |
| `bigint`                   | Large numbers, timestamps as epoch    |
| `decimal(p,s)`             | Monetary values, precise measurements |
| `boolean`                  | True/false flags                      |
| `timestamp with time zone` | All datetime fields                   |
| `date`                     | Date-only fields                      |
| `jsonb`                    | Flexible JSON data, settings          |

## Nullability Standards

- Primary keys: NOT NULL
- Foreign keys: NULLABLE (unless required relationship)
- Timestamps: `created_at` NOT NULL, `updated_at` NOT NULL
- Status fields: NOT NULL with default
- Optional fields: NULLABLE

## Indexing Policy

**Required Indexes:**

- Primary keys (automatic)
- Foreign keys (manual)
- Columns used in WHERE clauses
- Columns used in ORDER BY
- Columns used in JOINs

**Index Naming:**

- Primary key: `pk_{table}`
- Foreign key: `fk_{table}_{referenced_table}`
- Unique: `uq_{table}_{columns}`
- Index: `idx_{table}_{columns}`

## Foreign Key Rules

- Always use `ON DELETE` and `ON UPDATE` clauses
- Use `RESTRICT` by default (prevent accidental deletion)
- Use `CASCADE` only when child records should be deleted with parent
- Use `SET NULL` when relationship is optional

Example:

```sql
FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE CASCADE
```

## Unique Constraints

- Natural keys should have unique constraints
- Composite unique constraints for multi-column uniqueness
- Use partial unique indexes for conditional uniqueness

## Soft vs Hard Delete Policy

**Default: Soft Delete**

- Add `deleted_at` timestamp column (NULLABLE)
- Set timestamp when record is "deleted"
- Filter out deleted records in queries

**Hard Delete:**

- Only with explicit approval
- Only for non-critical, non-audited data
- Must log deletion in audit table

## Default Value Policy

- `created_at`: `NOW()` or `CURRENT_TIMESTAMP`
- `updated_at`: `NOW()` (updated via trigger)
- `status`: First status in enum
- `active`: `true`
- `version`: `1`

## Schema Version Table

Maintain `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);
```
