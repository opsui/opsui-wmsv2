# AI Rules for Warehouse Management System

**Purpose**: This file defines boundaries and guardrails for AI agents working on this codebase.

**Version**: 1.1.0
**Last Updated**: 2026-01-30

---

## Project Overview

This is a **Warehouse Management System (WMS)** built as a TypeScript/Node.js monorepo with PostgreSQL and React frontend. The system manages order fulfillment workflow: `PENDING → PICKING → PACKING → SHIPPED`.

**Architecture**:

- **Backend owns all domain state** - frontend is presentation-only
- **Shared types package** - single source of truth for domain model
- **Database is authoritative** - all business logic must validate against DB constraints

---

## What AI Agents MAY DO

### Code Modifications

- Implement new features following existing patterns
- Fix bugs in business logic, services, or UI components
- Add tests for new or existing functionality
- Refactor code within the same architectural layer
- Update type definitions when adding new features
- Modify UI components and styling

### Analysis

- Read any file in the codebase to understand implementation
- Search for patterns and dependencies
- Run tests and build commands
- Analyze logs and error messages

### Safe File Operations

- Create new components following existing patterns
- Add new API endpoints following controller → service → repository pattern
- Update configuration within `.env.example` (NOT `.env`)

---

## What AI Agents MUST NEVER DO

### Read-Only Files (DO NOT MODIFY)

```
packages/backend/.env                    # Production credentials
packages/backend/src/db/schema.sql       # Canonical DB schema (unless explicitly requested)
packages/backend/.env.example            # Environment template (only for documentation)
packages/*/tsconfig.json                 # TypeScript compiler configuration
packages/frontend/vite.config.ts         # Build configuration
packages/frontend/tailwind.config.js     # Styling configuration
package.json                             # Root monorepo config (without explicit request)
packages/*/package.json                  # Package configs (without explicit request)
packages/ml/                             # Entire ML pipeline (unless ML-specific task)
```

### Architectural Violations (FORBIDDEN)

- **NEVER add business logic to frontend components** - all domain logic lives in `packages/backend/src/services/`
- **NEVER bypass database constraints** - enums, foreign keys, and CHECK constraints are authoritative
- **NEVER invent new order states** - use only `OrderStatus` enum from `packages/shared/src/types/index.ts`
- **NEVER modify shared types without updating backend and frontend**
- **NEVER skip transactions** - all multi-step DB operations must use transactions
- **NEVER disable foreign key constraints**
- **NEVER commit migrations that break existing data** - always provide rollback path

### Dangerous Patterns

- **NEVER use string literals for enum values** - always import and use the enum
- **NEVER write raw SQL without parameterization** - use query builders or parameterized queries
- **NEVER log sensitive data** (passwords, tokens, personal customer information)
- **NEVER expose error details to API clients** - use structured error responses
- **NEVER assume inventory exists without checking** - always validate availability

---

## State Machine Rules

### Order Status Transitions (STRICT)

```
PENDING    → PICKING    (valid)
PENDING    → CANCELLED  (valid)
PENDING    → BACKORDER  (valid)
PICKING    → PICKED     (valid - all items picked)
PICKING    → CANCELLED  (valid)
PICKED     → PACKING    (valid)
PACKING    → PACKED     (valid - all items packed)
PACKED     → SHIPPED    (valid)

ALL OTHER TRANSITIONS ARE INVALID
```

**Implementation**: All transitions must be logged to `order_state_changes` table via database trigger.

### State Validation Requirements

- Before `PENDING → PICKING`: Verify picker has < 10 orders, inventory available
- Before `PICKING → PICKED`: Verify all items have `picked_quantity >= quantity`
- Before `PICKED → PACKING`: Verify packer assigned
- Before `PACKED → SHIPPED`: Verify shipping information provided

---

## Persistence Rules

### Data Survival (MUST PRESERVE)

- **Inventory transactions** - never delete from `inventory_transactions` table
- **Order state changes** - never delete from `order_state_changes` table
- **Audit trails** - all historical data must be preserved
- **User activity logs** - retain for compliance

### Transaction Rules

- All inventory modifications MUST use database transactions
- All order status changes MUST be atomic (either complete fully or roll back)
- Reserved inventory MUST be released on order cancellation
- Race conditions MUST be handled via `SELECT FOR UPDATE` or database constraints

---

## Server Startup / Shutdown Rules

### Development Servers

- Backend: `npm run dev` in `packages/backend/` (runs on port 3001)
- Frontend: `npm run dev` in `packages/frontend/` (runs on port 5173)
- **NEVER start servers in background without user consent**
- **ALWAYS shutdown servers after completing tasks** (use Ctrl+C or kill process)

### Database

- PostgreSQL must be running on `localhost:5432`
- Database name: `wms_db` (per `.env.example`)
- **NEVER drop or truncate tables in development environment**
- **NEVER modify schema without running migrations**

---

## Type Safety Rules

### TypeScript Strict Mode

- **ALL new code must use TypeScript strict mode**
- **NEVER use `any` type** - use proper domain types or `unknown`
- **NEVER use type assertions** unless absolutely necessary
- **ALWAYS import types from `packages/shared/src/types/`** - do not redefine

### Schema Alignment

- Backend types MUST match database schema (see `packages/backend/src/db/schema.sql`)
- Frontend types MUST match backend API responses
- Shared types are SINGLE SOURCE OF TRUTH

---

## File Structure Conventions

### Backend (Node.js/Express)

```
packages/backend/src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic (THIS IS WHERE DOMAIN LOGIC LIVES)
├── repositories/    # Data access layer
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── utils/           # Utility functions
└── db/              # Database connection and migrations
```

### Frontend (React + TypeScript)

```
packages/frontend/src/
├── components/      # React components
├── pages/           # Page components
├── stores/          # Zustand state stores
├── services/        # API client calls
├── hooks/           # Custom React hooks
└── types/           # Frontend-specific types (import from shared when possible)
```

### Shared

```
packages/shared/src/
├── types/           # Domain types (imported by both frontend and backend)
└── utils/           # Shared utility functions
```

---

## Testing Requirements

### Before Submitting Changes

1. Run `npm test` in relevant package(s)
2. Run `npm run build` to verify TypeScript compilation
3. Run `npm run lint` to verify code style
4. **NEVER commit failing tests**

### Test Coverage

- All business logic in `services/` MUST have unit tests
- All API endpoints MUST have integration tests
- Critical user flows MUST have E2E tests

---

## Security Rules

### Authentication & Authorization

- All API endpoints (except login) MUST require authentication
- Role-based access control MUST be enforced (see `UserRole` enum)
- Pickers can only modify orders they have claimed
- Packers can only access orders in `PICKED` state

### Input Validation

- **NEVER trust client input** - always validate on backend
- Use Joi schemas for request validation
- Sanitize all database inputs (use parameterized queries)

### Data Protection

- Passwords MUST be hashed with bcrypt (minimum 10 rounds)
- JWT secrets MUST NOT be committed to repository
- Customer data MUST be logged at appropriate levels only

---

## Error Handling Rules

### Database Errors

- **NEVER expose SQL errors to clients** - map to domain errors
- Constraint violations → `ConflictError` (409)
- Not found → `NotFoundError` (404)
- Validation failures → `ValidationError` (400)

### Business Logic Errors

- Insufficient inventory → `InventoryError` (409)
- Invalid state transitions → `ValidationError` (400)
- Permission denied → `ForbiddenError` (403)

### Error Classes (from shared types)

```typescript
import {
  WMSError,
  InventoryError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '@wms/shared/types';
```

---

## Undo/Revert Requirements (CRITICAL)

### The Golden Rule

**"Every Action Must Be Reversible"**

Users WILL make mistakes. The system MUST handle:

- Wrong item selected → Must be able to deselect
- Wrong quantity entered → Must be able to correct
- Accidental skip → Must be able to unskip
- Wrong bin location → Must be able to change
- Cancelled operations → Must be able to restore
- Changed mind mid-flow → Must be able to go back

### Mandatory Undo Patterns

1. **Soft Delete Only** - NEVER hard delete user data

   ```typescript
   // ❌ WRONG
   await db('pick_tasks').where({ id }).delete();

   // ✅ CORRECT
   await db('pick_tasks').where({ id }).update({ deleted_at: new Date() });
   ```

2. **Record All Actions** - Every mutation must be undoable

   ```typescript
   await updateStatus(id, newStatus);
   await recordUndoHistory({ entityId: id, oldStatus, newStatus });
   ```

3. **Show Undo Option** - Always display undo after action

   ```typescript
   showToast('Action complete', { undo: () => undoLastAction() });
   ```

4. **Editable Until Locked** - Allow corrections until final state

   ```typescript
   <EditableField value={value} onSave={update} canEdit={!isFinal} />
   ```

5. **Bidirectional State Transitions** - Allow going back

   ```typescript
   // Valid undo transitions:
   PICKING → PENDING (unclaim order)
   PICKED → PICKING (reopen for picking)
   PACKING → PICKED (return to picked)
   PACKED → PACKING (reopen for packing)
   CANCELLED → PENDING (restore cancelled order)
   ```

6. **Confirmation Before Destruction** - Always confirm permanent actions
   ```typescript
   <button onClick={() => confirmDelete(id)}>Delete</button>
   ```

### Undo Checklist (Mandatory)

Before completing ANY feature, AI MUST verify:

- [ ] Can user undo this action?
- [ ] Can user correct wrong input?
- [ ] Can user backtrack from any state?
- [ ] Can user recover from mistakes?
- [ ] Is undo intuitive and visible?
- [ ] Are keyboard shortcuts supported? (Ctrl+Z)
- [ ] Does soft delete work for all deletions?
- [ ] Is there a confirmation before permanent actions?

**See [UNDO_REVERT_PRINCIPLES.md](UNDO_REVERT_PRINCIPLES.md) for complete patterns.**

---

## Security Requirements (MANDATORY)

### The Security First Mindset

> **"Security is not a feature, it's a foundation."**

Every line of code must be written with security in mind.

### Mandatory Security Rules

1. **Never Trust Client Input** - Always validate with Joi

   ```typescript
   // ❌ WRONG
   const { quantity } = req.body;
   await createOrder(quantity);

   // ✅ CORRECT
   const { quantity } = await orderCreateSchema.validateAsync(req.body);
   if (quantity <= 0) throw new ValidationError('Quantity must be positive');
   await createOrder(quantity);
   ```

2. **Always Use Parameterized Queries** - Prevent SQL injection

   ```typescript
   // ❌ WRONG
   db.raw(`SELECT * FROM orders WHERE id = '${orderId}'`);

   // ✅ CORRECT
   db('orders').where({ id: orderId });
   ```

3. **Always Hash Passwords** - Use bcrypt with 10+ rounds

   ```typescript
   // ❌ WRONG
   const hash = md5(password);

   // ✅ CORRECT
   const hash = await bcrypt.hash(password, 10);
   ```

4. **Always Enforce Authorization** - Check roles and ownership

   ```typescript
   // ❌ WRONG
   app.delete('/orders/:id', deleteOrderHandler);

   // ✅ CORRECT
   app.delete(
     '/orders/:id',
     authenticate,
     authorize([UserRole.ADMIN]),
     deleteOrderHandler
   );
   ```

5. **Always Escape Output** - Prevent XSS

   ```typescript
   // ❌ WRONG
   <div dangerouslySetInnerHTML={{ __html: userInput }} />

   // ✅ CORRECT
   <div>{DOMPurify.sanitize(userInput)}</div>
   ```

6. **Always Rate Limit** - Prevent brute force

   ```typescript
   app.post(
     '/api/auth/login',
     authLimiter, // 5 attempts per 15 minutes
     loginHandler
   );
   ```

7. **Never Commit Secrets** - Use environment variables

   ```typescript
   // ❌ WRONG
   const API_KEY = 'sk_live_abc123...';

   // ✅ CORRECT
   const API_KEY = process.env.API_KEY!;
   ```

8. **Always Log Security Events** - Audit trail

   ```typescript
   logSecurityEvent({
     type: 'auth_success',
     userId: user.id,
     ip: req.ip,
   });
   ```

9. **Always Use HTTPS in Production** - Encrypt data in transit

   ```typescript
   if (process.env.NODE_ENV === 'production') {
     app.use(forceHTTPS);
   }
   ```

10. **Always Validate File Uploads** - Check type, size, content
    ```typescript
    const upload = multer({
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(new Error('Invalid file type'));
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    });
    ```

### Security Checklist (Mandatory)

Before completing ANY feature, AI MUST verify:

#### Input Validation

- [ ] Is all input validated with Joi?
- [ ] Are numbers bounded (min/max)?
- [ ] Are strings length-limited?
- [ ] Are UUIDs validated?
- [ ] Are regex patterns safe?

#### SQL Injection Prevention

- [ ] Are all queries parameterized?
- [ ] No raw SQL with user input?
- [ ] No string concatenation in queries?

#### Authentication & Authorization

- [ ] Does endpoint require authentication?
- [ ] Are roles checked properly?
- [ ] Can users only access their own resources?
- [ ] Are admin actions protected?

#### XSS Prevention

- [ ] Is user output escaped?
- [ ] Are CSP headers set?
- [ ] Is dangerous HTML sanitized?

#### Data Protection

- [ ] Are passwords hashed with bcrypt (10+ rounds)?
- [ ] Is sensitive data encrypted?
- [ ] Are secrets in environment variables?
- [ ] Are secrets never committed?

#### Rate Limiting

- [ ] Are auth endpoints rate-limited?
- [ ] Are API endpoints rate-limited?
- [ ] Can brute force attacks be prevented?

#### Audit Logging

- [ ] Are auth attempts logged?
- [ ] Are unauthorized attempts logged?
- [ ] Are privilege escalations logged?

**See [SECURITY_RULES.md](SECURITY_RULES.md) for complete security guidelines.**

---

## When in Doubt

1. **Read existing code** - follow established patterns
2. **Check the database schema** - constraints are authoritative
3. **Look at similar features** - consistency is key
4. **Ask for clarification** - don't guess on architectural decisions
5. **Test thoroughly** - broken workflows halt warehouse operations
6. **Ensure undo works** - every action must be reversible

---

## Summary of Critical Invariants

1. **Backend owns domain state** - frontend displays only
2. **Database constraints are law** - never bypass them
3. **Order states are immutable** - use the enum, don't invent new ones
4. **Audit trails are sacred** - never delete transaction history
5. **Inventory cannot be negative** - always validate before deducting
6. **State transitions are logged** - automatic via database triggers
7. **TypeScript strict mode is mandatory** - no `any`, no loose types
8. **Transactions for multi-step operations** - all-or-nothing changes only
9. **Every action must be reversible** - optimize for user error

---

## Code Organization & Cleanup Requirements (MANDATORY)

### The Golden Rule

> **"Leave the codebase cleaner than you found it."**

### Mandatory Cleanup Actions

After making ANY changes, AI MUST:

1. **Remove Unused Code**
   - Remove unused imports
   - Remove unused variables
   - Remove unused functions
   - Remove commented-out code
   - Remove dead TODOs

2. **Organize Imports**
   - Group by type (node, external, internal)
   - Sort alphabetically within groups
   - Use barrel exports for clean imports

3. **Format Consistently**
   - Run prettier on all changed files
   - Fix all ESLint warnings
   - Follow consistent naming conventions
   - Use proper indentation

4. **Eliminate Redundancies**
   - Consolidate duplicate code
   - Extract magic numbers to constants
   - Simplify complex functions
   - Remove dead code

5. **Maintain Modularity**
   - Keep files small (< 500 lines)
   - Keep functions focused (< 50 lines)
   - Follow single responsibility principle
   - Use barrel exports (index.ts)

### Auto-Cleanup Checklist (Mandatory)

Before completing ANY task, verify:

#### Code Cleanup ✅

- [ ] Removed unused imports
- [ ] Removed unused variables
- [ ] Removed unused functions
- [ ] Consolidated duplicate code
- [ ] Extracted magic numbers to constants
- [ ] Simplified complex functions
- [ ] Organized imports (alphabetical, grouped)

#### File Organization ✅

- [ ] Files in correct directories
- [ ] File names follow conventions
- [ ] Barrel exports updated
- [ ] No orphaned files
- [ ] No duplicate files

#### Code Quality ✅

- [ ] Formatting consistent (prettier)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Tests pass
- [ ] Complexity within limits

### Cleanup Commands (Run Before Committing)

```bash
# 1. Format code
npm run format

# 2. Fix linting issues
npm run lint:fix

# 3. Type check
npm run type-check

# 4. Run tests
npm test

# 5. Check for unused code
npm run clean:code
```

### File Size Limits

| File Type   | Max Lines | Action                         |
| ----------- | --------- | ------------------------------ |
| Components  | 300       | Split into smaller components  |
| Services    | 400       | Extract helper functions       |
| Controllers | 200       | Move logic to services         |
| Utilities   | 200       | Group related functions        |
| Tests       | 500       | Split into multiple test files |

### Import Organization Template

```typescript
// 1. Node.js built-ins
import path from 'path';

// 2. External dependencies
import express from 'express';

// 3. Shared types
import { Order, OrderStatus } from '@wms/shared/types';

// 4. Internal modules
import { orderService } from '../services';
```

**See [CODE_ORGANIZATION.md](CODE_ORGANIZATION.md) for complete guidelines.**

---

## Summary of Critical Requirements

1. **Backend owns domain state** - frontend displays only
2. **Database constraints are law** - never bypass them
3. **Order states are immutable** - use the enum, don't invent new ones
4. **Audit trails are sacred** - never delete transaction history
5. **Inventory cannot be negative** - always validate before deducting
6. **State transitions are logged** - automatic via database triggers
7. **TypeScript strict mode is mandatory** - no `any`, no loose types
8. **Transactions for multi-step operations** - all-or-nothing changes only
9. **Every action must be reversible** - optimize for user error
10. **Leave code cleaner than found** - remove unused code, organize imports, format consistently

**Violating these rules risks data corruption, lost inventory, halted warehouse operations, and unmaintainable code.**
