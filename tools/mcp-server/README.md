# ERP MCP Dev Accelerator v3.0

**Production-ready MCP server for Enterprise Resource Planning (ERP) development with performance optimizations, comprehensive error handling, and enterprise-grade security.**

Supports all ERP modules: Accounting, HR/Payroll, Sales/CRM, Purchasing, Manufacturing, Projects, Inventory/Warehouse, and E-commerce.

## 🚀 Features

### v3.0 Improvements

- **TypeScript**: Full type safety throughout the codebase
- **Input Validation**: Zod schemas for all tool inputs
- **Performance Monitoring**: Built-in metrics collection and caching
- **Security Hardened**: Command injection prevention, input sanitization
- **Error Handling**: Comprehensive error messages with actionable details
- **Resource Management**: Connection pooling, memory cleanup, timeout protection
- **Testing Ready**: Vitest integration with coverage reporting

### Tool Categories

#### Code Analysis Tools

- `analyze_typescript_errors` - Find type errors using TSC
- `find_unused_exports` - Find dead code with ts-prune
- `check_code_complexity` - Analyze cyclomatic complexity
- `find_duplicate_code` - Detect duplicate code patterns

#### Code Generation Tools

- `generate_entity` - Generate TypeORM entities
- `generate_service` - Generate NestJS services
- `generate_controller` - Generate REST controllers

#### Project Management Tools

- `analyze_project_structure` - Analyze tech stack and architecture
- `validate_project_structure` - Validate conventions
- `find_related_files` - Find imports and dependencies

#### ERP Domain Tools

- `erp_calculate_pick_path` - Optimize pick routes for warehouse operations
- `erp_validate_inventory` - Check inventory levels
- `erp_optimize_bin_locations` - Suggest optimal bin placement
- `erp_calculate_labor_cost` - Calculate manufacturing labor costs
- `erp_calculate_payroll` - Process payroll calculations
- `erp_calculate_tax` - Calculate sales tax, VAT, GST
- `erp_generate_financial_statement` - Generate balance sheets, income statements

## 📦 Installation

```bash
# Build the project
npm run build

# Start the server
npm start
```

## 🔧 Configuration

Update your Claude Desktop config at `~/AppData/Roaming/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "erp-dev-accelerator": {
      "command": "node",
      "args": [
        "C:\\Users\\Heinricht\\Documents\\Warehouse Management System\\tools\\mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

## 🛡️ Security Features

1. **Input Validation**: All inputs validated with Zod schemas
2. **Command Injection Prevention**: Shell commands sanitized
3. **Path Traversal Protection**: File paths validated and sanitized
4. **Timeout Protection**: All tools have configurable timeouts
5. **Error Sanitization**: Error messages don't expose sensitive data

## ⚡ Performance

- **Response Caching**: Frequently-used operations cached with TTL
- **Performance Monitoring**: Built-in metrics collection
- **Parallel Execution**: Independent operations run concurrently
- **Resource Cleanup**: Automatic memory and connection cleanup

## 📊 Monitoring

Performance metrics are logged on shutdown:

```bash
[ERP-MCP] Performance Metrics:
  analyze_typescript_errors: avg=1234.56ms, cache=85.3%, calls=150
  find_unused_exports: avg=567.89ms, cache=92.1%, calls=75

[ERP-MCP] Cache Metrics:
  hits=1250, misses=180, hitRate=87.4%, size=45
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🐛 Bug Fixes from v2.0

### Critical

- ✅ Fixed SQL injection vulnerabilities (command sanitization)
- ✅ Fixed race conditions in inventory operations
- ✅ Fixed memory leaks (unbounded arrays, resource cleanup)
- ✅ Fixed missing input validation

### High Priority

- ✅ Updated to latest MCP SDK (v1.0.4)
- ✅ Converted to TypeScript for type safety
- ✅ Added comprehensive error handling
- ✅ Fixed N+1 query patterns

### Medium Priority

- ✅ Added response caching
- ✅ Added performance monitoring
- ✅ Improved code organization (modular structure)
- ✅ Added comprehensive documentation

## 📚 Usage Examples

```typescript
// Analyze TypeScript errors
{
  "name": "analyze_typescript_errors",
  "arguments": {
    "projectPath": "./packages/backend"
  }
}

// Generate a new entity
{
  "name": "generate_entity",
  "arguments": {
    "entityName": "Invoice",
    "fields": [
      { "name": "invoiceNumber", "type": "string", "required": true },
      { "name": "amount", "type": "number", "required": true },
      { "name": "dueDate", "type": "date", "required": true }
    ]
  }
}

// Calculate payroll
{
  "name": "erp_calculate_payroll",
  "arguments": {
    "grossPay": 5000,
    "payFrequency": "monthly",
    "federalAllowances": 2
  }
}

// Optimize warehouse pick path
{
  "name": "erp_calculate_pick_path",
  "arguments": {
    "locations": ["A-01-01", "B-05-12", "C-03-08"],
    "startPoint": "A-01-01"
  }
}
```

## 🔒 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
