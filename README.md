# Enterprise Resource Planning System

A production-ready ERP system built with clean architecture principles, featuring comprehensive business operations including Accounting, HR/Payroll, Sales/CRM, Purchasing, Manufacturing, Projects, Inventory/Warehouse, and E-commerce integration.

**🤖 AI-First Development**: This project is designed for AI-assisted development with comprehensive guardrails, team protocols, and advanced cognitive enhancements.

---

## Quick Start

**New team members?** Start with [QUICKSTART.md](QUICKSTART.md)

**Need to set up the database?** See [DATABASE_SETUP.md](DATABASE_SETUP.md) for complete setup instructions

**Setting up AI development?** Read [AI_RULES.md](AI_RULES.md)

**Setting up MCP servers?** See [MCP_SETUP.md](MCP_SETUP.md) for custom AI tools

**Setting up Claude Code?** See [CLAUDE_CODE_SETUP.md](CLAUDE_CODE_SETUP.md) for enhanced configuration

**Working as a team?** See [TEAM_COLLABORATION.md](TEAM_COLLABORATION.md) for safe workflow

**Team collaboration?** See [TEAM_OPERATIONS.md](TEAM_OPERATIONS.md)

**Advanced AI features?** See [ENHANCEMENTS_SUMMARY.md](ENHANCEMENTS_SUMMARY.md) 🚀

---

## Architecture

```
erp-system/
├── packages/
│   ├── backend/          # Node.js/Express API + PostgreSQL
│   ├── frontend/         # React + TypeScript
│   ├── shared/           # Shared types and utilities
│   └── ml/               # Machine Learning pipeline (Python)
├── scripts/              # Utility scripts
├── prompts/              # AI context templates
├── patterns/             # Approved code patterns
├── AI_RULES.md           # AI agent constraints and rules
├── CLINE_RULES.md        # Cline-specific execution rules
├── MCP_USAGE.md          # MCP tool usage guidelines
├── TEAM_OPERATIONS.md    # Team collaboration protocols
├── AI_ENHANCEMENTS.md    # Advanced AI enhancements guide
├── ENHANCEMENTS_SUMMARY.md  # Quick reference for enhancements
├── MODULE_OWNERSHIP.json # Module ownership configuration
└── package.json          # Monorepo root
```

## Core Design Principles

1. **Backend owns all domain state** - Frontend is a thin presentation layer
2. **All mutations use database transactions** - No partial updates allowed
3. **State transitions are server-side only** - API-driven, never direct manipulation
4. **Comprehensive audit logging** - Every inventory change tracked
5. **Event-driven ready** - Architecture supports scaling via pub/sub

## Tech Stack

### Backend

- Node.js 20+ with TypeScript
- Express.js with proper middleware stack
- PostgreSQL with proper indexing and constraints
- Redis for caching and sessions
- Passport.js for authentication
- Joi for input validation
- Jest for testing

### Frontend

- React 18 with TypeScript
- React Query for server state
- Zustand for local UI state
- Tailwind CSS for styling
- React Router for navigation
- Vitest for testing

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optional, degrades gracefully)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env with your database credentials
```

3. Initialize database:

```bash
npm run db:migrate
npm run db:seed
```

4. Start development servers:

```bash
npm run dev
```

Backend runs on http://localhost:3001
Frontend runs on http://localhost:5173

## Testing

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Database Schema

See [DATABASE_SCHEMA.md](packages/backend/docs/DATABASE_SCHEMA.md) for complete schema documentation.

## API Documentation

See [API.md](packages/backend/docs/API.md) for API endpoint documentation.

## AI Development Documentation

This project includes comprehensive guardrails and advanced cognitive enhancements for AI-assisted development:

### Core Rule Files

- **[AI_RULES.md](AI_RULES.md)** - What AI agents can/cannot do, read-only files, state machine rules
- **[CLINE_RULES.md](CLINE_RULES.md)** - Execution-specific rules for Cline agents
- **[MCP_USAGE.md](MCP_USAGE.md)** - MCP tool usage guidelines and patterns

### Team Operations

- **[TEAM_OPERATIONS.md](TEAM_OPERATIONS.md)** - Protocols for team-based AI development
- **[MODULE_OWNERSHIP.json](MODULE_OWNERSHIP.json)** - Module ownership configuration
- **[QUICKSTART.md](QUICKSTART.md)** - Onboarding guide for new team members

### Advanced AI Enhancements 🚀

- **[ENHANCEMENTS_SUMMARY.md](ENHANCEMENTS_SUMMARY.md)** - Quick guide to AI enhancements
- **[AI_ENHANCEMENTS.md](AI_ENHANCEMENTS.md)** - Complete enhancement documentation
- **[prompts/CONTEXT_HEADER.md](prompts/CONTEXT_HEADER.md)** - AI context template
- **[patterns/APPROVED_PATTERNS.md](patterns/APPROVED_PATTERNS.md)** - Approved code patterns

**Expected Improvements**:

- Significantly better context awareness
- Fewer bugs
- Better pattern adherence
- Fewer coordination issues
- Fewer merge conflicts

### User Experience 🎯

- **[UNDO_REVERT_PRINCIPLES.md](UNDO_REVERT_PRINCIPLES.md)** - Every action must be reversible
- **[UNDO_IMPLEMENTATION_SUMMARY.md](UNDO_IMPLEMENTATION_SUMMARY.md)** - Quick start for undo system

**Core Principle**: "Every Action Must Be Reversible" - Optimize for user error.

**Components Available**:

- [UndoToast.tsx](packages/frontend/src/components/shared/UndoToast.tsx) - Toast with undo button
- [useUndo.ts](packages/frontend/src/hooks/useUndo.ts) - Undo/redo hooks

### Security 🔒

- **[SECURITY_RULES.md](SECURITY_RULES.md)** - Comprehensive security guidelines

**Core Principles**:

- Never trust client input - Always validate
- Always use parameterized queries - Prevent SQL injection
- Always hash passwords - Use bcrypt with 10+ rounds
- Always enforce authorization - Check roles and ownership
- Always escape output - Prevent XSS

**Security Checklist**: All endpoints must be authenticated, authorized, validated, and rate-limited.

### Code Quality 🧹

- **[CODE_ORGANIZATION.md](CODE_ORGANIZATION.md)** - Auto-cleanup and organization rules

**Core Principle**: "Leave the codebase cleaner than you found it."

**Auto-Cleanup**: Remove unused code, organize imports, format consistently, eliminate redundancies.

### TypeScript Guardrails

- **[packages/shared/src/types/workflow.ts](packages/shared/src/types/workflow.ts)** - State machine validation
- **[packages/shared/src/types/invariants.ts](packages/shared/src/types/invariants.ts)** - System invariants
- **[packages/shared/src/constants/system.ts](packages/shared/src/constants/system.ts)** - System constants

### Utility Scripts

- **[scripts/check-ownership.ts](scripts/check-ownership.ts)** - Verify file ownership before changes

---

## Module Structure

| Module  | Owner    | Scope                                                 |
| ------- | -------- | ----------------------------------------------------- |
| Picking | @friend1 | Picker workflow, pick task management, bin validation |
| Packing | @friend2 | Packer workflow, shipment preparation, packaging      |
| Admin   | @you     | User management, reports, settings, supervision       |

See [MODULE_OWNERSHIP.json](MODULE_OWNERSHIP.json) for complete ownership details.

---

## Core Design Principles

1. **Backend owns all domain state** - Frontend is a thin presentation layer
2. **All mutations use database transactions** - No partial updates allowed
3. **State transitions are server-side only** - API-driven, never direct manipulation
4. **Comprehensive audit logging** - Every inventory change tracked
5. **Event-driven ready** - Architecture supports scaling via pub/sub
6. **AI-guarded development** - Rules prevent common mistakes and architectural violations

---

## Tech Stack

### Backend

- Node.js 20+ with TypeScript
- Express.js with proper middleware stack
- PostgreSQL with proper indexing and constraints
- Redis for caching and sessions
- Passport.js for authentication
- Joi for input validation
- Jest for testing

### Frontend

- React 18 with TypeScript
- React Query for server state
- Zustand for local UI state
- Tailwind CSS for styling
- React Router for navigation
- Vitest for testing

### AI/ML

- GLM-4.7 for AI assistance
- Cline for AI agent execution
- Python/FastAPI for ML pipeline
- MLflow for experiment tracking

---

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optional, degrades gracefully)

### Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment:**

```bash
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env with your database credentials
```

3. **Initialize database:**

```bash
npm run db:migrate
npm run db:seed
```

4. **Start development servers:**

```bash
npm run dev
```

**Backend**: http://localhost:3001
**Frontend**: http://localhost:5173

---

## Testing

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## Documentation

- **[DATABASE_SCHEMA.md](packages/backend/docs/DATABASE_SCHEMA.md)** - Complete schema documentation
- **[API.md](packages/backend/docs/API.md)** - API endpoint documentation
- **[AI_RULES.md](AI_RULES.md)** - AI development rules
- **[TEAM_OPERATIONS.md](TEAM_OPERATIONS.md)** - Team protocols

---

## Team Repository

**Repository**: https://github.com/opsui/opsui-erp

This is a team repository with automatic synchronization. See [TEAM_COLLABORATION.md](TEAM_COLLABORATION.md) for working safely with multiple team members.

## Auto-Push Configuration

This repository is configured to automatically push to GitHub after every commit with team-safe safeguards:

- Pulls latest changes before pushing
- Detects and prevents merge conflicts
- Only pushes when it's safe to do so

The post-commit hook in `.husky/post-commit` ensures all changes are synced to the team repository whenever a commit is made by Cline, GLM, or Claude Code.

## License

ISC
