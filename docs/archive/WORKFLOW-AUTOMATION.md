# Developer Workflow Automation Guide

## 🚀 One-Command Development Setup

### First Time Setup

```bash
# Run once to install and configure everything
npm run dev:setup
```

This automatically:

- ✅ Installs all dependencies
- ✅ Sets up Git hooks
- ✅ Configures development environment
- ✅ Validates system requirements

### Daily Development

```bash
# Start everything with one command
npm run dev:start
```

This automatically:

- ✅ Kills processes on occupied ports (no more manual cleanup!)
- ✅ Starts backend on port 3001
- ✅ Starts frontend on port 5173
- ✅ Waits for services to be ready
- ✅ Opens browser to http://localhost:5173
- ✅ Shows all service URLs

---

## ⚡ Code Generation

Stop writing boilerplate! Generate it instantly:

### Generate React Components

```bash
# Generate a page component
npm run generate:component --name UserProfile --type page

# Generate a component with hooks
npm run generate:component --name DataTable --type component --hooks query,mutation

# Generate a layout component
npm run generate:component --name MainLayout --type layout
```

**Generated files include:**

- TypeScript interfaces
- Proper imports and exports
- Hook scaffolding
- Basic structure ready for customization

### Generate API Routes

```bash
# Generate complete API with routes, service, and repository
npm run generate:api --resource Product
```

**Generates:**

- `packages/backend/src/routes/Product.ts` - Express routes with validation
- `packages/backend/src/services/ProductService.ts` - Business logic layer
- `packages/backend/src/repositories/ProductRepository.ts` - Data access layer
- Full CRUD operations
- OpenAPI documentation scaffolding

### Generate Tests

```bash
# Generate test file for any source file
npm run generate:test --file packages/backend/src/services/OrderService.ts
```

---

## 🔒 Automated Quality Checks

### Pre-Commit Hooks (Already Active!)

Git automatically runs these checks before every commit:

```bash
git commit
# ✅ Format check (Prettier)
# ✅ Linting (ESLint)
# ✅ Type checking (TypeScript)
# ✅ Unused exports check
# ✅ File size validation
# ✅ Test execution for changed files
```

**If any check fails, the commit is blocked** with clear error messages.

**Fix issues automatically:**

```bash
npm run format:fix    # Auto-format all code
npm run lint:fix     # Auto-fix linting issues
```

### Pre-Push Validation

Before pushing, run the complete validation:

```bash
npm run test:validate
```

This runs:

- ✅ Backend type check
- ✅ Frontend type check
- ✅ Backend unit tests
- ✅ Frontend component tests
- ✅ Integration tests
- ✅ Connection validation
- ✅ Backend build
- ✅ Frontend build
- ✅ Linting

---

## 🛠️ Smart Development Tools

### 1. Development Helper

```bash
# Start all services with automatic port cleanup
npm run dev:start

# Start without opening browser
npm run dev:start:no-browser
```

**Features:**

- 🔧 Kills processes on ports 3001, 5173, 5174
- ⏱️ Waits for backend to be healthy
- ⏱️ Waits for frontend to be ready
- 🌐 Opens browser automatically
- 📊 Shows all service URLs
- 🛑 Graceful shutdown on Ctrl+C

### 2. Test Watch Mode

```bash
# Watch all tests
npm run test:watch

# Watch only backend
npm run test:watch:backend

# Watch only frontend
npm run test:watch:frontend
```

**Features:**

- 🔍 Typeahead to filter tests
- 🎨 Colored output (PASS/FAIL)
- ⚡ Instant feedback on file changes
- 🎯 One-key exit (any key press)

### 3. Connection Validator

```bash
# Verify frontend + backend connectivity
npm run test:connection
```

**Checks:**

- ✅ Backend API is running (port 3001)
- ✅ Frontend is running (port 5173)
- ✅ Database is connected
- ✅ WebSocket is available
- ✅ API communication works

### 4. Performance Monitor

```bash
# Real-time performance dashboard
npm run perf
```

**Shows:**

- API response times (avg, median, P95)
- Error rate percentage
- Memory usage
- Active connections
- Health indicators

### 5. Bundle Analyzer

```bash
# Analyze frontend bundle size
npm run analyze
```

**Shows:**

- Visual treemap of modules
- Bundle size breakdown
- Gzip vs Brotli compression
- Identify large dependencies

---

## 📊 Database Management

### Apply Performance Indexes

```bash
# Create optimized database indexes
npm run db:indexes
```

**Indexes created:**

- Orders: status, priority, picker assignments
- Pick tasks: status, order, picker
- Inventory: SKU, bin, availability
- Users: email, role, active status
- And 10+ more!

### Data Management

```bash
# View database status
npm run db:status

# Validate data integrity
npm run db validate

# Reset database (with automatic backup!)
npm run db reset

# Export data to JSON
npm run db export

# Import data from JSON
npm run db import
```

---

## 🔧 Dependency Management

### Check for Updates

```bash
# Check for outdated packages
npm run deps
```

**Shows:**

- Current version vs latest
- Major/minor/patch differences
- Upgrade recommendations

### Interactive Updates

```bash
# Interactive dependency updater
npm run deps:update
```

**Features:**

- Select which packages to update
- See breaking changes
- Safe upgrade recommendations

---

## 🎯 MCP Server Monitoring

### Start Health Monitor

```bash
# Monitor MCP server with auto-recovery
npm run mcp:monitor
```

**Dashboard shows:**

- Server status (RUNNING/DOWN)
- Process ID
- Uptime
- Restart count
- Last health check

**Features:**

- 🔄 Auto-restart on failure
- ⏱️ Health checks every 5 seconds
- 💔 Beatbeat signals
- 🎯 Exponential backoff for repeated failures

---

## 📝 Quick Reference Commands

### Development

| Command               | Purpose                                 |
| --------------------- | --------------------------------------- |
| `npm run dev:start`   | Start all services (auto-cleanup ports) |
| `npm run dev:setup`   | First-time setup                        |
| `npm run dev:restart` | Restart dev servers                     |

### Code Generation

| Command                                           | Purpose                       |
| ------------------------------------------------- | ----------------------------- |
| `npm run generate:component --name X --type page` | Generate page component       |
| `npm run generate:api --resource X`               | Generate API routes + service |
| `npm run generate:test --file X`                  | Generate test file            |

### Testing

| Command                   | Purpose                    |
| ------------------------- | -------------------------- |
| `npm run test:watch`      | Watch all tests            |
| `npm run test:connection` | Validate connectivity      |
| `npm run test:validate`   | Pre-commit validation      |
| `npm run test:all`        | Run all tests + validation |

### Database

| Command               | Purpose                   |
| --------------------- | ------------------------- |
| `npm run db:indexes`  | Apply performance indexes |
| `npm run db:status`   | View database status      |
| `npm run db validate` | Check data integrity      |
| `npm run db reset`    | Reset with backup         |

### Monitoring

| Command               | Purpose               |
| --------------------- | --------------------- |
| `npm run perf`        | Performance dashboard |
| `npm run analyze`     | Bundle size analyzer  |
| `npm run mcp:monitor` | MCP server health     |

### Quality

| Command              | Purpose                 |
| -------------------- | ----------------------- |
| `npm run format:fix` | Auto-format code        |
| `npm run lint:fix`   | Auto-fix linting        |
| `npm run typecheck`  | Type check all packages |
| `npm run deps`       | Check for updates       |

---

## 🎓 Typical Developer Workflow

### Morning Start

```bash
# 1. Pull latest changes
git pull

# 2. Install any new dependencies
npm install

# 3. Start development (one command!)
npm run dev:start
```

### During Development

```bash
# Terminal 1: Dev servers running
npm run dev:start

# Terminal 2: Test watch mode
npm run test:watch

# Terminal 3: Performance monitor
npm run perf
```

### Before Committing

```bash
# Pre-commit hooks run automatically!
git add .
git commit -m "feat: add new feature"
# ✅ Format check
# ✅ Linting
# ✅ Type checking
# ✅ Tests
```

### Before Pushing

```bash
# Complete validation
npm run test:validate

# Push if validation passes
git push
```

---

## 💡 Productivity Tips

### 1. Use Code Generation

Instead of writing boilerplate:

```bash
# Generate API in 5 seconds
npm run generate:api --resource Shipment
```

### 2. Trust the Pre-Commit Hooks

Don't run checks manually - let Git hooks do it:

```bash
git commit  # Hooks run automatically
```

### 3. Use Watch Mode for Tests

Keep tests running while developing:

```bash
npm run test:watch
```

### 4. Monitor Performance

Keep performance dashboard open:

```bash
npm run perf
```

### 5. Let Tools Handle Cleanup

No manual process killing:

```bash
npm run dev:start  # Automatically cleans ports
```

---

## 🔧 Troubleshooting

### Port Already in Use?

```bash
# No need to manually kill ports
npm run dev:start  # Automatically handles it
```

### Tests Failing?

```bash
# See which tests are affected
npm run test:watch

# Fix issues
npm run format:fix
npm run lint:fix
```

### Performance Issues?

```bash
# Check performance metrics
npm run perf

# Analyze bundle size
npm run analyze

# Apply database indexes
npm run db:indexes
```

### MCP Server Down?

```bash
# Start with auto-recovery
npm run mcp:monitor

# It will automatically restart if it crashes!
```

---

## 📊 Automation Impact

### Before (Manual Work)

- ❌ Manually kill processes on ports
- ❌ Wait for services to start (unknown when ready)
- ❌ Write boilerplate code manually
- ❌ Run tests manually
- ❌ Format/lint/typecheck manually
- ❌ No connection validation
- ❌ No performance monitoring

### After (Automated)

- ✅ Automatic port cleanup
- ✅ Waits for services, opens browser
- ✅ Generate code in seconds
- ✅ Tests run automatically on changes
- ✅ Pre-commit hooks handle quality
- ✅ Connection validation before push
- ✅ Real-time performance monitoring

### Time Savings

| Task                  | Before  | After  | Impact              |
| --------------------- | ------- | ------ | ------------------- |
| Start dev environment | 2-3 min | 10 sec | Massive savings     |
| Generate CRUD API     | 30 min  | 5 sec  | Massive savings     |
| Run quality checks    | 2 min   | Auto   | Complete automation |
| Validate connectivity | Manual  | Auto   | Complete automation |
| Troubleshoot ports    | 5 min   | Auto   | Complete automation |

**Total time saved per day: Significant time savings!**

---

## 🎯 Key Takeaways

1. **One command starts everything** - `npm run dev:start`
2. **Pre-commit hooks prevent bad code** - No manual checks needed
3. **Code generation saves hours** - Don't write boilerplate
4. **Automated validation** - `npm run test:validate` before pushing
5. **Performance monitoring** - `npm run perf` keeps you informed
6. **MCP auto-recovery** - `npm run mcp:monitor` keeps servers running

**Focus on writing business logic, let automation handle the rest!** 🚀
