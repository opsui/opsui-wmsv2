# Complete Testing & Validation Guide

## Overview

This project now has a **comprehensive testing ecosystem** that validates both frontend and backend functionality, ensuring everything is properly connected before marking tasks as complete.

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    E2E Tests (5%)                            │
│                  Full user workflows                         │
│                                                               │
│              ┌─────────────────────────┐                     │
│              │   Integration Tests    │  ← NEW!             │
│              │  (API + Backend Comms)  │  (15%)              │
│              └─────────────────────────┘                     │
│                                                               │
│         ┌─────────────────────────────────────┐              │
│         │     Component Tests (Frontend)      │  ← NEW!      │
│         │     Unit Tests (Backend)            │  (80%)        │
│         └─────────────────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## What's New

### ✅ Frontend Testing (Vitest + React Testing Library)

- **Component Tests**: Test React components, hooks, stores
- **Integration Tests**: Test API communication with backend
- **Coverage**: 80% threshold for lines, functions, branches, statements
- **Watch Mode**: Instant feedback during development
- **UI Mode**: Visual test runner

### ✅ Integration Tests

- **API Communication**: Validates frontend can reach backend
- **Authentication Flow**: Tests login, token handling, protected routes
- **Data Fetching**: Validates order retrieval, updates, etc.
- **Error Handling**: Tests 404, validation errors, timeouts
- **Response Times**: Ensures API responds within SLA

### ✅ Connection Validation

- **Backend Health**: Checks backend API is running
- **Frontend Health**: Checks frontend dev server is running
- **Database Connectivity**: Validates database connection
- **WebSocket Availability**: Checks WebSocket endpoint
- **API Communication**: Tests actual API calls

### ✅ Pre-Completion Checklist

- **TypeScript Checks**: Backend + frontend type validation
- **Unit Tests**: Backend + frontend test suites
- **Integration Tests**: API communication validation
- **Build Checks**: Ensures both packages build successfully
- **Linting**: Code quality validation
- **Format Check**: Code formatting validation

## Quick Start

### Run All Tests (Before Completing a Task)

```bash
npm run test:validate
```

This runs the complete pre-completion checklist:

- ✅ Backend type check
- ✅ Frontend type check
- ✅ Backend unit tests
- ✅ Frontend unit tests
- ✅ Integration tests
- ✅ Connection validation
- ✅ Backend build
- ✅ Frontend build
- ✅ Linting
- ⚠️ Format check (optional)

### Run Frontend Tests Only

```bash
# Run all frontend tests
npm run test:frontend

# Run with UI
npm run test:frontend:ui

# Run with coverage
npm run test:frontend:coverage
```

### Run Integration Tests

```bash
# Test API + backend communication
npm run test:integration
```

### Validate System Connections

```bash
# Check that frontend + backend are connected
npm run test:connection
```

### Run Backend Tests

```bash
# Backend unit tests
npm run test --workspace=packages/backend

# Watch mode
npm run test:watch:backend
```

## Test Structure

### Frontend Tests

```
packages/frontend/
├── src/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Badge.tsx
│   │   │   └── Badge.test.tsx        ← Component tests
│   │   ├── ml/
│   │   └── pages/
│   ├── test/
│   │   ├── setup.ts                  ← Test configuration
│   │   ├── utils.tsx                 ← Testing utilities
│   │   └── integration/
│   │       └── api.test.ts           ← Integration tests
│   └── vitest.config.ts              ← Vitest configuration
```

### Backend Tests

```
packages/backend/
├── src/
│   ├── services/
│   │   └── *.test.ts                 ← Service tests
│   ├── routes/
│   │   └── *.test.ts                 ← Route tests
│   └── tests/
│       └── *.test.ts                 ← Integration tests
└── jest.config.js                    ← Jest configuration
```

## Writing Tests

### Frontend Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyComponent />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('API Integration', () => {
  it('should fetch orders from backend', async () => {
    const response = await axios.get('http://localhost:3001/api/orders');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  });
});
```

## Continuous Integration

### Before Marking a Task Complete

**ALWAYS run:**

```bash
npm run test:validate
```

This ensures:

- ✅ No TypeScript errors
- ✅ All tests pass
- ✅ Frontend and backend are connected
- ✅ API communication works
- ✅ Build succeeds
- ✅ Code quality standards met

### During Development

**Watch mode for instant feedback:**

```bash
# Terminal 1: Watch backend tests
npm run test:watch:backend

# Terminal 2: Watch frontend tests
npm run test:frontend

# Terminal 3: Watch integration tests
npm run test:integration -- --watch
```

## Coverage Reports

### Generate Coverage Report

```bash
# Frontend coverage
npm run test:frontend:coverage

# Backend coverage
npm run test:coverage --workspace=packages/backend

# All coverage
npm run test:coverage --workspaces
```

### Coverage Thresholds

- **Backend**: 80% for lines, functions, branches, statements
- **Frontend**: 80% for lines, functions, branches, statements

Coverage reports are generated in:

- `packages/frontend/coverage/`
- `packages/backend/coverage/`

## Troubleshooting

### Frontend Tests Fail

**Symptoms:** Component tests throw errors

**Solutions:**

1. Check that test utilities are properly configured
2. Verify all providers are wrapped (Router, QueryClient, etc.)
3. Check for missing mocks (IntersectionObserver, WebSocket, etc.)
4. Ensure `setup.ts` is running before tests

### Integration Tests Fail

**Symptoms:** API tests fail with connection errors

**Solutions:**

1. Ensure backend is running on port 3001
2. Check that database is connected
3. Verify test user exists (john.picker@wms.local)
4. Run `npm run test:connection` to diagnose

### Connection Validation Fails

**Symptoms:** `npm run test:connection` fails

**Solutions:**

1. Start backend: `npm run dev:backend`
2. Start frontend: `npm run dev:frontend`
3. Check ports: 3001 (backend), 5173 (frontend)
4. Verify database is running

### Type Check Fails

**Symptoms:** TypeScript errors during validation

**Solutions:**

1. Run `npm run typecheck` to see all errors
2. Fix type errors in source files
3. Ensure all imports are properly typed
4. Check for missing type definitions

## Best Practices

### Before Completing Any Task

```bash
# 1. Run full validation
npm run test:validate

# 2. If validation passes, task is complete
# 3. If validation fails, fix issues and re-run
```

### Test-Driven Development

1. Write test first
2. Run test (should fail)
3. Write minimal code to pass
4. Refactor
5. Repeat

### Testing Checklist

For every feature, ensure:

- [ ] Unit tests for business logic
- [ ] Component tests for UI
- [ ] Integration tests for API calls
- [ ] Error handling tests
- [ ] Edge case tests
- [ ] Coverage meets threshold (80%)

## Summary

### What We Have Now

✅ **Frontend Testing** - Component tests with Vitest + RTL
✅ **Backend Testing** - Unit tests with Jest
✅ **Integration Tests** - API + backend communication
✅ **Connection Validation** - Automated connectivity checks
✅ **Pre-Completion Checklist** - Comprehensive validation
✅ **Coverage Tracking** - 80% threshold enforcement
✅ **Watch Mode** - Instant feedback during development
✅ **CI/CD Ready** - All checks automated

### Your Workflow

1. **Write code** with test watch mode running
2. **Run tests** - see instant feedback
3. **Validate** - `npm run test:validate` before completing
4. **Ship** - confidence that everything works!

Your system now has **comprehensive testing for both frontend and backend**, with **automated validation** ensuring everything is connected before task completion! 🚀
