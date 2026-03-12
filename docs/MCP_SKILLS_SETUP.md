# MCP Servers & Skills Configuration

> **AI Context System - Tools & Integrations**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Document MCP servers, skills, and recommended tools for development

---

## Current MCP Servers

The following MCP (Model Context Protocol) servers are configured in `.mcp.json`:

### 1. erp-dev-accelerator (Custom)

**Purpose:** Custom ERP development tools specific to this project

```json
{
  "erp-dev-accelerator": {
    "command": "node",
    "args": ["./tools/mcp-server/dist/index.js"],
    "disabled": false
  }
}
```

**Status:** ✅ Configured

---

### 2. glm-server (Custom)

**Purpose:** GLM AI integration for enhanced AI capabilities

```json
{
  "glm-server": {
    "command": "node",
    "args": ["./tools/mcp-server-glm/dist/index.js"],
    "disabled": false,
    "env": {
      "GLM_API_KEY": "<configured>"
    }
  }
}
```

**Status:** ✅ Configured

⚠️ **Security Note:** API key should be moved to environment variables, not stored in `.mcp.json`

---

### 3. browsermcp

**Purpose:** Browser automation and web scraping capabilities

```json
{
  "browsermcp": {
    "command": "npx",
    "args": ["@browsermcp/mcp@latest"],
    "disabled": false
  }
}
```

**Status:** ✅ Configured

---

### 4. Roblox_Studio

**Purpose:** Roblox Studio integration (for game development projects)

```json
{
  "Roblox_Studio": {
    "command": "cmd.exe",
    "args": ["/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
    "disabled": false
  }
}
```

**Status:** ✅ Configured (not relevant to WMS project)

---

### 5. playwright (Global)

**Purpose:** Browser automation, E2E testing, web scraping

**Status:** ✅ Available (connected globally)

**Tools Available:**
- `browser_navigate` - Navigate to URLs
- `browser_snapshot` - Capture page state
- `browser_click` - Click elements
- `browser_type` - Type text
- `browser_take_screenshot` - Take screenshots
- `browser_evaluate` - Execute JavaScript
- And more...

---

## Current Skills

### remotion-best-practices

**Purpose:** Best practices for Remotion - Video creation in React

**Source:** `remotion-dev/skills` (GitHub)

**Status:** ✅ Installed

**When to Use:** Creating video content, video module development

---

## Recommended Additional MCP Servers

### 1. filesystem (Official)

**Purpose:** Enhanced file system operations

**Installation:**
```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
    "disabled": false
  }
}
```

**Status:** ⏳ Recommended

---

### 2. postgres (Official)

**Purpose:** Direct PostgreSQL database operations

**Installation:**
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "disabled": false,
    "env": {
      "POSTGRES_CONNECTION_STRING": "postgresql://user:pass@host:port/db"
    }
  }
}
```

**⚠️ IMPORTANT:** 
- Use with caution - direct database access
- Never use against production (aap_db) without approval
- Use environment variables for connection strings

**Status:** ⏳ Recommended (for development only)

---

### 3. github (Official)

**Purpose:** GitHub API integration for PRs, issues, and code search

**Installation:**
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "disabled": false,
    "env": {
      "GITHUB_TOKEN": "<your-token>"
    }
  }
}
```

**Status:** ⏳ Recommended

---

### 4. memory (Official)

**Purpose:** Persistent memory across sessions

**Installation:**
```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "disabled": false
  }
}
```

**Status:** ⏳ Recommended (useful for context preservation)

---

### 5. fetch (Official)

**Purpose:** HTTP requests and API testing

**Installation:**
```json
{
  "fetch": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch"],
    "disabled": false
  }
}
```

**Status:** ⏳ Optional

---

## Recommended Additional Skills

### 1. typescript-best-practices

**Purpose:** TypeScript coding standards and patterns

**Installation:**
```bash
# Via Cline settings or skills marketplace
```

**Status:** ⏳ Recommended

---

### 2. react-performance

**Purpose:** React performance optimization patterns

**Status:** ⏳ Recommended (for frontend optimization)

---

### 3. nodejs-security

**Purpose:** Node.js security best practices

**Status:** ⏳ Recommended (for backend security)

---

### 4. postgresql-optimization

**Purpose:** PostgreSQL query optimization and indexing

**Status:** ⏳ Recommended (for database performance)

---

## Custom MCP Server Development

### Location

Custom MCP servers are stored in `/tools/`:

```
tools/
├── mcp-server/           # erp-dev-accelerator
│   ├── src/
│   │   └── index.ts
│   ├── dist/
│   │   └── index.js
│   └── package.json
├── mcp-server-glm/       # GLM AI integration
│   ├── src/
│   │   └── index.ts
│   ├── dist/
│   │   └── index.js
│   └── package.json
└── playwright-mcp/       # Playwright integration
```

### Creating a New MCP Server

1. Create directory in `/tools/`
2. Initialize npm project
3. Install MCP SDK: `npm install @modelcontextprotocol/sdk`
4. Create server implementation
5. Build: `npm run build`
6. Add to `.mcp.json`

---

## Security Considerations

### API Keys

⚠️ **Never commit API keys to the repository**

**Best Practice:**
```json
{
  "example-server": {
    "command": "npx",
    "args": ["example-mcp"],
    "env": {
      "API_KEY": "${EXAMPLE_API_KEY}"
    }
  }
}
```

Then set environment variable:
```bash
# Windows (PowerShell)
$env:EXAMPLE_API_KEY = "your-key-here"

# Linux/Mac
export EXAMPLE_API_KEY="your-key-here"
```

### Database Access

- MCP servers with database access should be **disabled by default**
- Enable only when explicitly needed
- Never enable for production databases without approval
- Use read-only connections when possible

### File System Access

- Limit filesystem MCP to project directory only
- Never grant access to system directories
- Be cautious with write operations

---

## Troubleshooting

### MCP Server Not Starting

```bash
# Check if the server builds successfully
cd tools/mcp-server
npm run build

# Check for errors
node dist/index.js
```

### MCP Server Disabled

Edit `.mcp.json` and set `"disabled": false`

### API Key Issues

1. Verify environment variable is set
2. Check `.env` file (not committed)
3. Verify key has correct permissions

---

## Configuration Checklist

### Required MCPs

- [x] playwright - Browser automation (global)
- [x] erp-dev-accelerator - Custom ERP tools
- [x] glm-server - AI enhancement (GLM-4.7)
- [x] browsermcp - Web browsing
- [x] github - GitHub integration
- [x] memory - Session persistence
- [x] postgres-wms - Database operations (dev only)

### Disabled MCPs

- [ ] Roblox_Studio - Not relevant for WMS project

### Required Skills

- [x] remotion-best-practices - Video creation

### Recommended Skills

- [ ] typescript-best-practices
- [ ] react-performance
- [ ] nodejs-security
- [ ] postgresql-optimization

---

## Quick Reference

| MCP Server | Purpose | Status |
|------------|---------|--------|
| playwright | Browser automation | ✅ Active (global) |
| erp-dev-accelerator | Custom ERP tools | ✅ Active |
| glm-server | AI enhancement (glm-4.7) | ✅ Active |
| browsermcp | Web browsing | ✅ Active |
| github | GitHub integration | ✅ Active |
| memory | Session persistence | ✅ Active |
| postgres-wms | WMS database access | ✅ Active |
| discord-mcp | Discord integration | ✅ Active (global) |
| robloxstudio-mcp | Roblox development | ✅ Active (global) |
| Roblox_Studio | Game development | ⏸️ Disabled |
