# Database Management Quick Reference

## Streamlined Data Operations

GLM now has a single, streamlined way to handle all database operations:

### Basic Usage

```bash
npm run db <command>
# or
node scripts/data-manager.js <command>
```

### All Available Commands

| Command    | Args                                           | What It Does                               |
| ---------- | ---------------------------------------------- | ------------------------------------------ |
| `seed`     | `--users-only`, `--skus-only`, `--orders-only` | Add sample data (safe)                     |
| `reset`    |                                                | Complete database reset (with backup)      |
| `clean`    |                                                | Remove all data (keep schema, with backup) |
| `refresh`  |                                                | Update existing data and add new           |
| `status`   |                                                | Show database status and record counts     |
| `validate` |                                                | Validate data integrity                    |
| `backup`   | `[name]`                                       | Create a backup                            |
| `restore`  | `<file\|list>`                                 | Restore from backup or list backups        |
| `export`   | `[filename]`                                   | Export database to JSON                    |
| `import`   | `<file>`                                       | Import database from JSON                  |
| `fix`      | `stuck-orders [id]`                            | Fix stuck orders or list them              |
| `fix`      | `activate-users`                               | Activate all users                         |

### Common Workflows

**Start Fresh:**

```bash
npm run db clean
npm run db seed
```

**Complete Reset:**

```bash
npm run db reset  # Automatically creates backup first
```

**Check Status:**

```bash
npm run db status
```

**Fix Issues:**

```bash
npm run db fix stuck-orders      # List stuck orders
npm run db fix stuck-orders ORD123  # Fix specific order
npm run db fix activate-users    # Activate all users
```

**Backup/Restore:**

```bash
npm run db backup my-backup      # Create named backup
npm run db restore list          # List available backups
npm run db restore my-backup     # Restore from backup
```

### Sample Data Structure

**Users (5 total):**

- `admin@wms.local` / `admin123` (Admin)
- `john.picker@wms.local` / `password123` (Picker)
- `jane.picker@wms.local` / `password123` (Picker)
- `bob.packer@wms.local` / `password123` (Packer)
- `alice.supervisor@wms.local` / `password123` (Supervisor)

**SKUs (8 total):**

- WIDGET-A, WIDGET-B (Widgets)
- GADGET-X, GADGET-Y (Gadgets)
- TOOL-001, TOOL-002 (Tools)
- PART-123, PART-456 (Parts)

**Orders:** 10 sample orders with varying priorities

### Safety Features

1. **Seed is safe** - Won't overwrite existing data
2. **Reset/Clean creates backups** - Automatic backup before destructive operations
3. **Countdowns** - 5-second safety countdown for dangerous operations
4. **Status verification** - Check before making changes
5. **Validation** - Check data integrity issues
6. **Fix operations** - Consolidated from ad-hoc scripts

### What GLM Will Do

**"Seed the database"**

```bash
npm run db seed
```

- ✅ Safe - won't overwrite existing data
- ✅ Adds: 8 SKUs, 5 users, 10 orders
- ✅ Proper bcrypt password hashes

**"Reset all data"**

```bash
npm run db reset
```

- ✅ 5-second safety countdown
- ✅ Creates backup first
- ✅ DROP → MIGRATE → SEED
- ✅ Completely fresh database

**"Clean the database"**

```bash
npm run db clean
```

- ✅ Creates backup first
- ✅ Removes all data
- ✅ Keeps schema intact

**"Show database status"**

```bash
npm run db status
```

- ✅ Shows table sizes
- ✅ Shows record counts
- ✅ Shows potential issues

**"Validate data"**

```bash
npm run db validate
```

- ✅ Checks for users without passwords
- ✅ Checks for inactive users
- ✅ Checks for stuck orders
- ✅ Checks for negative inventory

**"Fix stuck orders"**

```bash
npm run db fix stuck-orders
```

- ✅ Lists stuck orders
- ✅ Fixes specific orders if ID provided

**"Create backup"**

```bash
npm run db backup my-backup
```

- ✅ Saves to `backups/` directory
- ✅ JSON format
- ✅ Includes all tables

**"List backups"**

```bash
npm run db restore list
```

- ✅ Shows all available backups
- ✅ Shows file sizes

**"Restore from backup"**

```bash
npm run db restore my-backup
```

- ✅ 5-second safety countdown
- ✅ Restores all data from backup

### Backup Directory

Backups are stored in: `packages/backend/backups/`

Format: `backup-YYYY-MM-DDTHH-MM-SS-mmmZ.json` or custom name

### Selective Seeding

You can seed only specific data types:

```bash
npm run db seed --users-only     # Only users
npm run db seed --skus-only      # Only SKUs and inventory
npm run db seed --orders-only    # Only orders
```

### Data Validation

The `validate` command checks for:

- Users without passwords
- Inactive users
- Orders stuck in PICKING status for > 1 hour
- Negative inventory quantities

### Fix Operations

Consolidated from ad-hoc scripts:

- `fix stuck-orders` - From `reset-stuck-orders.ts`
- `fix activate-users` - From `activate-users.ts`
- Both integrated into data-manager for consistency
