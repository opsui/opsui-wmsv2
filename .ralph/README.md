# Ralph Integration for ERP

Automated workflows combining Anthropic Ralph + Cline + GLM 4.7 + MCP Dev Accelerator

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         Cline IDE                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Ralph Automation Layer                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │
│  │  │   Skills    │→ │  Workflows  │→ │   Triggers  │      │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                 │
│                              ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              MCP Servers (Auto-restart)                   │ │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐ │ │
│  │  │ ERP Accelerator  │  │  Context7, Firecrawl, etc.   │ │ │
│  │  │  (15 Tools)      │  │                              │ │ │
│  │  └──────────────────┘  └──────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                 │
│                              ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 GLM 4.7 (AI Engine)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Available Ralph Skills

### 1. **erp-entity-generator**

Generate complete CRUD stack (entity, service, controller, DTOs) for any ERP entity.

**Usage:**

```
ralph run erp-entity-generator \
  --entityName="Product" \
  --fields='[
    {"name": "sku", "type": "string", "required": true},
    {"name": "quantity", "type": "number", "required": true},
    {"name": "price", "type": "number", "required": true}
  ]'
```

**Automates:**

- TypeORM entity generation
- NestJS service with CRUD methods
- REST controller with endpoints
- TypeScript validation

### 2. **erp-prisma-workflow**

Complete Prisma database workflow automation.

**Usage:**

```
ralph run erp-prisma-workflow \
  --migrationName="add_inventory_table" \
  --schemaPath="./packages/backend/prisma/schema.prisma"
```

**Automates:**

- Schema validation
- Migration creation
- Client generation
- Database seeding
- Type checking

### 3. **erp-api-contract-validator**

Validate and sync API contracts between frontend/backend.

**Usage:**

```
ralph run erp-api-contract-validator \
  --backendPath="./packages/backend/src" \
  --frontendPath="./packages/frontend/src"
```

**Automates:**

- API contract validation
- TypeScript type sync
- OpenAPI spec generation

### 4. **erp-warehouse-optimizer**

Optimize warehouse operations with domain-specific tools.

**Usage:**

```
ralph run erp-warehouse-optimizer \
  --locations='["A-01-01", "B-05-03", "C-12-01"]' \
  --sku="PROD-12345" \
  --pickFrequency=25
```

**Automates:**

- Optimal pick path calculation
- Bin location optimization
- Performance analysis

### 5. **erp-code-quality-check**

Comprehensive code quality analysis.

**Usage:**

```
ralph run erp-code-quality-check \
  --projectPath="./packages/backend" \
  --fixIssues=true
```

**Automates:**

- TypeScript error detection
- Unused export identification
- Code complexity analysis
- Duplicate code detection
- Project structure validation

### 6. **erp-full-feature-workflow** ⭐

End-to-end feature creation from concept to deployment.

**Usage:**

```
ralph run erp-full-feature-workflow \
  --featureName="inventory-tracking" \
  --entities='[
    {
      "name": "Inventory",
      "fields": [
        {"name": "sku", "type": "string", "required": true},
        {"name": "quantity", "type": "number", "required": true},
        {"name": "location", "type": "string", "required": true}
      ]
    }
  ]' \
  --generateTests=true \
  --generateDocs=true
```

**Automates:**

- Project analysis
- Entity/Service/Controller generation
- Test suite creation
- API validation
- Frontend type sync
- OpenAPI documentation
- Security audit
- Final type check

## Integration with Cline

### Method 1: Quick Commands

Type in Cline chat:

```
/run ralph wms-entity-generator Product sku:string,quantity:number,price:number
```

### Method 2: Auto-trigger on File Changes

Create `.ralph/triggers.json`:

```json
{
  "triggers": [
    {
      "event": "file_change",
      "pattern": "prisma/schema.prisma",
      "action": "ralph run erp-prisma-workflow --auto"
    },
    {
      "event": "file_create",
      "pattern": "src/entities/*.ts",
      "action": "ralph run erp-entity-generator --fromFile"
    }
  ]
}
```

### Method 3: Scheduled Automation

```json
{
  "schedules": [
    {
      "name": "nightly-quality-check",
      "cron": "0 2 * * *",
      "action": "ralph run erp-code-quality-check --fixIssues=true"
    },
    {
      "name": "weekly-security-audit",
      "cron": "0 3 * * 0",
      "action": "ralph run erp-full-feature-workflow --securityOnly=true"
    }
  ]
}
```

## Combining Forces: Super Automation

### Example 1: New Feature in One Command

```
"Create a complete shipment tracking feature with entities, API, tests, and docs"

→ Ralph analyzes request
→ Calls wms-full-feature-workflow
→ Uses MCP tools via WMS Accelerator
→ GLM 4.7 optimizes the code
→ Cline presents the complete feature
```

### Example 2: Continuous Quality Loop

```
File saved → Trigger → wms-code-quality-check
           ↓
Issues found → Auto-fix → Re-check
           ↓
Generate report → Update dashboard
```

### Example 3: PR Automation

```
PR created → Ralph runs full workflow
           ↓
Quality gate checks pass
           ↓
Auto-update OpenAPI spec
           ↓
Comment PR with summary
           ↓
Ready for review
```

## Configuration

### Cline Settings

Update Cline MCP config to include Ralph:

```json
{
  "mcpServers": {
    "ralph": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/ralph"],
      "env": {
        "RALPH_CONFIG": "./.ralph/ralph.config.json"
      }
    }
  }
}
```

### Environment Variables

```bash
# .env
RALPH_ENABLED=true
RALPH_AUTO_APPROVE=["analyze_typescript_errors", "validate_project_structure"]
RALPH_LOG_LEVEL=info
RALPH_WORKSPACE="./"
```

## Tips for Maximum Automation

1. **Chain Skills Together**: Create meta-skills that combine multiple workflows
2. **Use Triggers**: Set up automatic responses to code changes
3. **Schedule Quality Checks**: Run automated audits at off-peak times
4. **Auto-Approve Safe Operations**: Let Ralph handle routine checks without prompts
5. **Integrate with CI/CD**: Add Ralph workflows to your pipeline

## Benefits

- **10x Faster Feature Development**: Full CRUD stack in one command
- **Zero Manual Code Review**: Automated quality gates
- **Always in Sync**: Frontend/backend types automatically synced
- **Domain Intelligence**: WMS-specific optimizations built-in
- **Peace of Mind**: Security audits on every change

## Troubleshooting

**Ralph not responding:**

```bash
# Check Ralph status
ralph status

# Restart Ralph service
ralph restart
```

**Skill failing:**

```bash
# Run with verbose logging
ralph run erp-entity-generator --verbose

# Check MCP server status
ralph mcp:list
```

**Auto-approve not working:**

```bash
# Check approved skills
ralph config:get autoApprove

# Add skill to auto-approve
ralph config:set autoApprove --add "analyze_typescript_errors"
```
