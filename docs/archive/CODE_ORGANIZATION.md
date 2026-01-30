# Code Organization & Auto-Cleanup Rules for Cline

**Purpose**: Ensure codebase remains clean, modular, and efficient as development progresses.

**Version**: 1.0.0
**Last Updated**: 2025-01-12

---

## The Golden Rule

> **"Leave the codebase cleaner than you found it."**

Every time Cline makes changes, it should:

1. Remove unused code
2. Organize imports
3. Follow consistent formatting
4. Eliminate redundancies
5. Maintain modularity

---

## Auto-Cleanup Triggers

Cline should automatically clean up when:

### Before Completing Any Task

- [ ] Check for unused imports
- [ ] Check for unused variables/functions
- [ ] Check for duplicate code
- [ ] Check for inconsistent formatting
- [ ] Check for missing exports
- [ ] Check for circular dependencies

### After Making Changes

- [ ] Remove any code that became unused
- [ ] Reorganize imports (alphabetical, grouped)
- [ ] Format consistently (prettier/eslint)
- [ ] Add missing exports
- [ ] Update barrel exports

### On File Creation

- [ ] Place in correct directory
- [ ] Export from appropriate barrel file
- [ ] Add to index if needed
- [ ] Follow naming conventions

---

## File Organization Standards

### Directory Structure Rules

```
packages/
├── backend/src/
│   ├── controllers/     # HTTP request handlers (one per route)
│   ├── services/        # Business logic (one per domain entity)
│   ├── repositories/    # Data access layer (one per table)
│   ├── routes/          # API route definitions (one per feature)
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions (shared helpers)
│   ├── validators/      # Joi validation schemas
│   └── types/           # Backend-specific types
│
├── frontend/src/
│   ├── pages/           # Page components (one per route)
│   ├── components/      # Reusable components
│   │   ├── ui/          # Basic UI components
│   │   ├── forms/       # Form components
│   │   └── shared/      # Shared components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client calls
│   ├── stores/          # Zustand state stores
│   ├── utils/           # Utility functions
│   └── types/           # Frontend-specific types
│
└── shared/src/
    ├── types/           # Domain types (shared by all)
    ├── constants/       # System constants
    └── utils/           # Shared utilities
```

### File Naming Conventions

| Type         | Pattern                     | Example              |
| ------------ | --------------------------- | -------------------- |
| Components   | PascalCase                  | `UserProfile.tsx`    |
| Utilities    | camelCase                   | `formatDate.ts`      |
| Types        | camelCase                   | `orderTypes.ts`      |
| Hooks        | camelCase with 'use' prefix | `useAuth.ts`         |
| Services     | camelCase                   | `orderService.ts`    |
| Controllers  | camelCase                   | `orderController.ts` |
| Repositories | camelCase                   | `orderRepository.ts` |
| Constants    | UPPER_SNAKE_CASE            | `API_CONSTANTS.ts`   |

---

## Import Organization Standards

### Import Order (Enforced)

```typescript
// 1. Node.js built-ins
import path from 'path';
import fs from 'fs';

// 2. External dependencies
import express from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';

// 3. Shared types
import { Order, OrderStatus } from '@wms/shared/types';

// 4. Internal modules (relative)
import { orderService } from '../services/orderService';
import { validateOrder } from '../validators/orderValidator';

// 5. Types (if separate)
import type { CreateOrderDTO } from '../types/orderTypes';
```

### Barrel Exports (index.ts)

Every directory should have an `index.ts` that exports its contents:

```typescript
// services/index.ts
export * from './orderService';
export * from './inventoryService';
export * from './userService';
```

This allows clean imports:

```typescript
import { orderService, inventoryService } from '../services';
```

---

## Code Cleanup Rules

### 1. Remove Unused Imports

```typescript
// ❌ BEFORE - Unused imports
import { Order, OrderStatus, User, PickTask } from '@wms/shared/types';
import { formatDate } from '../utils/dateUtils';

function getOrder(id: string): Order {
  return db('orders').where({ id }).first();
}

// ✅ AFTER - Only what's used
import { Order } from '@wms/shared/types';

function getOrder(id: string): Order {
  return db('orders').where({ id }).first();
}
```

### 2. Remove Unused Variables

```typescript
// ❌ BEFORE - Unused variables
const order = await getOrder(id);
const user = await getUser(userId);
const items = await getOrderItems(id);
return order;

// ✅ AFTER - Only what's used
const order = await getOrder(id);
return order;
```

### 3. Remove Unused Functions

```typescript
// ❌ BEFORE - Dead code
function calculateTax(amount: number): number {
  return amount * 0.1;
}

function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ AFTER - Only what's used
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### 4. Consolidate Duplicate Code

```typescript
// ❌ BEFORE - Duplicated logic
async function getOrdersByStatus(status: string) {
  return await db('orders').where({ status }).select('*');
}

async function getOrdersByCustomer(customerId: string) {
  return await db('orders').where({ customer_id: customerId }).select('*');
}

async function getOrdersByDateRange(start: Date, end: Date) {
  return await db('orders')
    .whereBetween('created_at', [start, end])
    .select('*');
}

// ✅ AFTER - Consolidated
async function getOrders(whereClause: object): Promise<Order[]> {
  return await db('orders').where(whereClause).select('*');
}

// Usage
getOrders({ status: 'PENDING' });
getOrders({ customer_id: customerId });
getOrdersRaw('created_at', 'between', [start, end]);
```

### 5. Extract Magic Numbers to Constants

```typescript
// ❌ BEFORE - Magic numbers
function calculatePickScore(task: PickTask): number {
  const ageScore = Math.max(0, 100 - task.ageInMinutes);
  const priorityBonus = task.priority === 'URGENT' ? 50 : 0;
  return ageScore + priorityBonus;
}

// ✅ AFTER - Named constants
const PICK_SCORE = {
  MAX_AGE_SCORE: 100,
  URGENT_BONUS: 50,
} as const;

function calculatePickScore(task: PickTask): number {
  const ageScore = Math.max(0, PICK_SCORE.MAX_AGE_SCORE - task.ageInMinutes);
  const priorityBonus =
    task.priority === OrderPriority.URGENT ? PICK_SCORE.URGENT_BONUS : 0;
  return ageScore + priorityBonus;
}
```

### 6. Simplify Complex Functions

```typescript
// ❌ BEFORE - Too complex
async function processOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) throw new NotFoundError('Order not found');
  if (order.status !== 'PENDING')
    throw new ValidationError('Order not pending');
  const picker = await getPicker(order.pickerId);
  if (!picker) throw new NotFoundError('Picker not found');
  if (!picker.active) throw new ValidationError('Picker not active');
  const items = await getOrderItems(orderId);
  for (const item of items) {
    const inventory = await getInventory(item.sku);
    if (!inventory) throw new NotFoundError('Inventory not found');
    if (inventory.available < item.quantity)
      throw new ValidationError('Insufficient inventory');
    await reserveInventory(item.sku, item.quantity);
  }
  await updateOrderStatus(orderId, 'PICKING');
  return order;
}

// ✅ AFTER - Broken down
async function processOrder(orderId: string) {
  const order = await validateOrder(orderId);
  await validatePicker(order.pickerId);
  await validateInventory(orderId);
  await reserveAllInventory(orderId);
  return await transitionToPicking(orderId);
}

async function validateOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) throw new NotFoundError('Order not found');
  if (order.status !== OrderStatus.PENDING) {
    throw new ValidationError('Order not pending');
  }
  return order;
}

async function validatePicker(pickerId: string) {
  const picker = await getPicker(pickerId);
  if (!picker) throw new NotFoundError('Picker not found');
  if (!picker.active) throw new ValidationError('Picker not active');
  return picker;
}
```

---

## Modular Design Principles

### 1. Single Responsibility

Each file/module should have one reason to change:

```typescript
// ❌ WRONG - Multiple responsibilities
// orderService.ts handles orders, users, and inventory
export async function createOrder(data) {
  /* ... */
}
export async function createUser(data) {
  /* ... */
}
export async function updateInventory(sku, qty) {
  /* ... */
}

// ✅ CORRECT - One responsibility per file
// orderService.ts - only orders
export async function createOrder(data) {
  /* ... */
}

// userService.ts - only users
export async function createUser(data) {
  /* ... */
}

// inventoryService.ts - only inventory
export async function updateInventory(sku, qty) {
  /* ... */
}
```

### 2. Clear Dependencies

Dependencies should flow in one direction:

```
controllers → services → repositories → database
     ↓          ↓           ↓
  types ←─────┴───────────┘
```

### 3. Barrel Exports for Clean Imports

```typescript
// ❌ WRONG - Deep imports
import { createOrder } from '../../../services/orderService';
import { getUser } from '../../../services/userService';

// ✅ CORRECT - Barrel exports
import { createOrder, getUser } from '../services';
```

---

## Auto-Cleanup Commands for Cline

### Before Committing Changes

```bash
# 1. Check for unused imports
npm run lint:imports

# 2. Check for unused code
npm run lint:unused

# 3. Format code
npm run format

# 4. Run linter
npm run lint

# 5. Run type check
npm run type-check

# 6. Run tests
npm test
```

### Automatic Cleanup Scripts

```json
{
  "scripts": {
    "clean:imports": "ts-unused-exports tsconfig.json",
    "clean:code": "ts-prune --ignore unknown",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "precommit": "npm run format && npm run lint:fix && npm run type-check && npm test"
  }
}
```

---

## File Size Guidelines

### Maximum File Sizes

| File Type   | Max Lines | Rationale                      |
| ----------- | --------- | ------------------------------ |
| Components  | 300       | Break into smaller components  |
| Services    | 400       | Extract helper functions       |
| Controllers | 200       | Move logic to services         |
| Utilities   | 200       | Group related functions        |
| Tests       | 500       | Split into multiple test files |

### When to Split Files

**Signals a file is too large**:

- Hard to find specific code
- Multiple unrelated functions
- Deeply nested logic
- Excessive scrolling
- Multiple exports (> 10)

---

## Code Quality Metrics

### Maintainability Index

Track these metrics:

| Metric                | Target      | Tool                     |
| --------------------- | ----------- | ------------------------ |
| Cyclomatic complexity | < 10        | eslint-plugin-complexity |
| Function length       | < 50 lines  | eslint                   |
| File length           | < 500 lines | eslint                   |
| Parameter count       | < 5         | eslint                   |
| Nesting depth         | < 4         | eslint                   |
| Duplicate code        | < 3%        | sonarjs                  |

### ESLint Configuration

```json
{
  "rules": {
    "complexity": ["error", 10],
    "max-lines-per-function": ["warn", 50],
    "max-lines": ["warn", 500],
    "max-params": ["error", 5],
    "max-depth": ["error", 4],
    "no-duplicate-imports": "error",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

---

## Redundancy Detection

### Duplicate Code Patterns

```typescript
// ❌ BEFORE - Duplicated validation
function createOrder(data) {
  if (!data.customerId) throw new Error('Customer ID required');
  if (!data.customerName) throw new Error('Customer name required');
  if (!data.items || data.items.length === 0) throw new Error('Items required');
}

function updateOrder(id, data) {
  if (!data.customerId) throw new Error('Customer ID required');
  if (!data.customerName) throw new Error('Customer name required');
}

// ✅ AFTER - Extracted validator
const orderValidator = {
  validateCustomer(data) {
    if (!data.customerId) throw new ValidationError('Customer ID required');
    if (!data.customerName) throw new ValidationError('Customer name required');
  },

  validateItems(data) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Items required');
    }
  },
};

function createOrder(data) {
  orderValidator.validateCustomer(data);
  orderValidator.validateItems(data);
}

function updateOrder(id, data) {
  orderValidator.validateCustomer(data);
}
```

---

## Unused Code Detection

### Types of Unused Code to Remove

1. **Unused imports**

   ```typescript
   import { Order, User, PickTask } from './types';
   // Only Order is used
   ```

2. **Unused variables**

   ```typescript
   const result = await operation();
   const temp = calculateSomething(); // Never used
   return result;
   ```

3. **Unused functions**

   ```typescript
   function helper() {
     /* ... */
   } // Never called
   function main() {
     /* ... */
   }
   ```

4. **Commented-out code**

   ```typescript
   // function oldMethod() { /* ... */ } // Remove this!
   function newMethod() {
     /* ... */
   }
   ```

5. **Dead TODOs**
   ```typescript
   // TODO: Remove this function in v2.0
   function deprecated() {
     /* ... */
   } // Either remove or do it
   ```

---

## Auto-Cleanup Checklist

Before completing any task, Cline MUST verify:

### Code Cleanup

- [ ] Removed unused imports
- [ ] Removed unused variables
- [ ] Removed unused functions
- [ ] Consolidated duplicate code
- [ ] Extracted magic numbers to constants
- [ ] Simplified complex functions
- [ ] Organized imports (alphabetical, grouped)

### File Organization

- [ ] Files in correct directories
- [ ] File names follow conventions
- [ ] Barrel exports updated
- [ ] No orphaned files
- [ ] No duplicate files

### Code Quality

- [ ] Formatting consistent (prettier)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Tests pass
- [ ] Complexity within limits

### Documentation

- [ ] Updated relevant docs
- [ ] Removed outdated comments
- [ ] Added inline docs for complex logic
- [ ] Updated README if needed

---

## Industry Standards We Follow

### Clean Code Principles

1. **Meaningful names** - Intent-revealing
2. **Functions should do one thing** - Single responsibility
3. **Small functions** - < 50 lines ideally
4. **DRY** - Don't repeat yourself
5. **KISS** - Keep it simple, stupid

### SOLID Principles

1. **S**ingle Responsibility
2. **O**pen/Closed
3. **L**iskov Substitution
4. **I**nterface Segregation
5. **D**ependency Inversion

### Module Design

1. **Cohesion** - Related code together
2. **Coupling** - Minimal dependencies
3. **Encapsulation** - Hide implementation
4. **Reusability** - Write once, use everywhere

---

## Cline Auto-Cleanup Commands

### Automatic Cleanup Protocol

After making changes, Cline should:

1. **Scan for unused imports**

   ```typescript
   // Detect and remove
   import { unusedImport } from './types';
   ```

2. **Reorganize imports**

   ```typescript
   // Group and sort
   import { a, b, c } from 'external';
   import { x, y, z } from './internal';
   ```

3. **Format code**

   ```bash
   npm run format
   ```

4. **Fix linting issues**

   ```bash
   npm run lint:fix
   ```

5. **Type check**

   ```bash
   npm run type-check
   ```

6. **Run tests**
   ```bash
   npm test
   ```

---

## Example: Before and After

### Before Cleanup

```typescript
// orderController.ts
import {
  Order,
  OrderStatus,
  User,
  PickTask,
  Inventory,
} from '@wms/shared/types';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { inventoryService } from '../services/inventoryService';

const MAX_ORDERS = 10;

async function getOrders(req, res) {
  const orders = await orderService.getAll();
  const temp = calculateSomething();
  return res.json(orders);
}

async function createOrder(req, res) {
  const data = req.body;
  if (!data.customerId) throw new Error('Customer ID required');
  await orderService.create(data);
  return res.json({ success: true });
}

// TODO: Refactor this later
function oldMethod() {
  console.log('old');
}
```

### After Cleanup

```typescript
// orderController.ts
import type { Response } from 'express';

import { Order } from '@wms/shared/types';
import { ORDER_CONFIG } from '@wms/shared/constants/system';

import { orderService } from '../services';
import { validateCreateOrder } from '../validators';

async function getOrders(req: Request, res: Response): Promise<void> {
  const orders = await orderService.getAll();
  res.json(orders);
}

async function createOrder(req: Request, res: Response): Promise<void> {
  const validated = await validateCreateOrder(req.body);
  const order = await orderService.create(validated);
  res.status(201).json(order);
}
```

---

## Success Metrics

Track these to ensure codebase quality:

| Metric                  | Target      | How to Measure |
| ----------------------- | ----------- | -------------- |
| Unused imports          | 0           | ESLint         |
| Duplicate code          | < 3%        | SonarQube      |
| Average function length | < 30 lines  | Code climate   |
| Average file length     | < 300 lines | Code climate   |
| Cyclomatic complexity   | < 10        | ESLint         |
| Code coverage           | > 80%       | Jest           |
| Technical debt          | Low         | SonarQube      |

---

## Summary

### Auto-Cleanup Rules

1. **Remove unused code** - Imports, variables, functions
2. **Organize imports** - Alphabetical, grouped
3. **Format consistently** - Prettier, ESLint
4. **Eliminate redundancies** - DRY principle
5. **Maintain modularity** - Single responsibility
6. **Follow conventions** - Naming, structure
7. **Keep files small** - Split when needed
8. **Document clearly** - When complex

### Clean Code Commandments

1. **Leave code cleaner than you found it**
2. **Every function should do one thing**
3. **Names should reveal intent**
4. **Avoid magic numbers**
5. **DRY - Don't repeat yourself**
6. **KISS - Keep it simple**
7. **SOLID principles**
8. **Test everything**

---

**Remember**: Clean code is not about perfection, it's about maintainability.

**When in doubt**: Extract, simplify, organize, remove.

**You're now ready to maintain a clean, modular codebase!** 🧹
