# Claude Code Setup Guide

This guide explains how to configure Claude Code to work with the same powerful rules, MCP servers, and GLM API that Cline uses.

## Overview

Claude Code now has the same enhanced capabilities as Cline:

- ✅ All Cline Supreme rules and cognitive frameworks
- ✅ MCP server integration (ERP Dev Accelerator)
- ✅ GLM 4.7 API integration
- ✅ Enhanced permissions for development workflows

## Configuration Files

### 1. Project-Level Configuration

The main configuration is in `.claude/settings.json` at the project root. This file includes:

- **Cline Supreme Rules**: All cognitive frameworks and behavioral protocols
- **MCP Servers**: ERP Dev Accelerator integration
- **GLM API**: Configuration for GLM 4.7 model
- **Permissions**: Enhanced bash and git permissions

### 2. VSCode Configuration

The `.vscode/cline-rules.json` file contains the detailed rule configuration that both Cline and Claude Code follow.

## Setting Up GLM API Key

### Step 1: Get Your GLM API Key

1. Visit [BigModel.cn](https://open.bigmodel.cn/)
2. Sign up or log in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key

### Step 2: Configure in Claude Code

**Option A: Project-Level (Recommended for Team)**

Edit `.claude/settings.json` and replace `YOUR_GLM_API_KEY_HERE`:

```json
{
  "glm.apiKey": "your-actual-api-key-here",
  "glm.model": "glm-4.7",
  "glm.endpoint": "https://open.bigmodel.cn/api/paas/v4/chat/completions"
}
```

**Option B: User-Level (For Your Machine Only)**

Edit the global Claude settings:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add:

```json
{
  "glm.apiKey": "your-actual-api-key-here",
  "glm.model": "glm-4.7"
}
```

### Step 3: Restart Claude Code

After updating the configuration, restart Claude Code to pick up the changes.

## Verifying the Setup

### Check MCP Server Connection

1. Open Claude Code
2. Start a new conversation
3. Ask: "What MCP servers are available?"
4. You should see `erp-dev-accelerator` listed

### Check GLM API Connection

1. Ask Claude Code: "What model are you using?"
2. If GLM 4.7 is configured, it should be able to access it

### Test Enhanced Capabilities

Try asking Claude Code to:

- Analyze code using the six thinking hats
- Use the ERP Dev Accelerator tools
- Apply Cline Supreme rules to a problem

## Available Features

### Cline Supreme Rules Enabled

All cognitive frameworks are active:

- **Six Thinking Hats**: White, Red, Black, Yellow, Blue, Purple
- **First Principles Thinking**: Break down to fundamental truths
- **Systems Thinking**: Understand the whole system
- **Analogical Reasoning**: Map patterns across domains
- **Counterfactual Analysis**: Consider alternatives

### Execution Protocol

Claude Code will:

1. ✅ Analyze before acting
2. ✅ Read related files
3. ✅ Search for patterns
4. ✅ Plan complete changes
5. ✅ Consider backward compatibility
6. ✅ Identify test updates needed
7. ✅ Parallelize independent tasks
8. ✅ Maintain context throughout

### Security Protocol

Claude Code enforces:

- ✅ Input validation
- ✅ Authentication checks
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Error sanitization
- ✅ Dependency security
- ✅ Secrets protection
- ✅ Audit trails

### MCP Tools Available

The ERP Dev Accelerator provides:

- `code-analysis`: Analyze code structure
- `code-generation`: Generate code following patterns
- `context-compression`: Compress large context
- `ml-predictions`: ML-powered predictions
- `multi-agent`: Coordinate multiple agents
- `pattern-extraction`: Extract approved patterns
- `project`: Query project structure
- `telemetry`: Track development metrics
- `test-generation`: Generate tests
- `wms-domain`: ERP-specific tools

## Differences from Cline

While both share the same rules and capabilities:

| Feature        | Cline            | Claude Code      |
| -------------- | ---------------- | ---------------- |
| Rules          | ✅ Cline Supreme | ✅ Cline Supreme |
| MCP Servers    | ✅ Yes           | ✅ Yes           |
| GLM API        | ✅ Yes           | ✅ Yes           |
| Integration    | VSCode Extension | VSCode Extension |
| Chat Interface | Custom           | Native Claude    |
| File Context   | Auto-loading     | Request-based    |

## Permissions

The enhanced permissions allow Claude Code to:

### Development Commands

- `npm install`, `npm run build`, `npm run dev:*`
- `npx tsx`, `npx tsc`
- Docker commands: `docker-compose up/down/restart/logs`

### Git Commands

- `git add`, `git commit`, `git push`
- `git pull`, `git status`
- Auto-push via post-commit hook

### Database Commands

- `psql` for PostgreSQL operations
- `pg_isready` for connection checks

### System Commands

- Process management: `tasklist`, `Get-Process`
- Service management: `Get-Service`
- Network: `netstat`, `curl`

## Troubleshooting

### MCP Server Not Appearing

1. **Check the build**:

   ```bash
   cd tools/mcp-server
   npm run build
   ```

2. **Check the path**: Verify the path in `.claude/settings.json`

3. **Restart Claude Code**: Completely quit and restart

### GLM API Not Working

1. **Verify API key**: Check the key is correct in settings

2. **Check endpoint**: Ensure `https://open.bigmodel.cn` is accessible

3. **Test manually**: Use curl to test the API:
   ```bash
   curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"glm-4.7","messages":[{"role":"user","content":"test"}]}'
   ```

### Rules Not Being Followed

1. **Check configuration**: Verify `.claude/settings.json` has all the rule settings

2. **Check VSCode settings**: Verify `.vscode/cline-rules.json` exists

3. **Restart**: Restart Claude Code after any configuration changes

## For Team Members

When setting up for the first time:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/opsui/opsui-wmsv2.git
   cd opsui-wmsv2
   npm install
   ```

2. **Build MCP server**:

   ```bash
   cd tools/mcp-server
   npm install
   npm run build
   ```

3. **Configure GLM API**: Follow the steps above

4. **Restart Claude Code**

5. **Verify**: Check that MCP servers are listed

## Environment Variables

For additional configuration, you can set environment variables in your system:

```bash
# GLM API Key (alternative to settings.json)
GLM_API_KEY=your-api-key-here

# Workspace Root (auto-detected, but can override)
ERP_WORKSPACE_ROOT=/path/to/project

# Log Level (for debugging)
LOG_LEVEL=debug
```

## Updating Configuration

When you pull changes from the repository that include configuration updates:

1. **Review changes**: Check what changed in `.claude/settings.json`
2. **Merge carefully**: Don't overwrite your GLM API key
3. **Restart Claude Code**: To pick up the changes
4. **Test**: Verify MCP servers and features work

## Support

If you encounter issues:

1. Check [MCP_SETUP.md](MCP_SETUP.md) for MCP-specific issues
2. Check [TEAM_COLLABORATION.md](TEAM_COLLABORATION.md) for team workflow
3. Check [CLINE_RULES.md](CLINE_RULES.md) for rule details
4. Open an issue on GitHub

## Summary

Claude Code now has:

- ✅ Same powerful rules as Cline
- ✅ MCP server integration
- ✅ GLM 4.7 API support
- ✅ Enhanced permissions
- ✅ Team-safe workflow

Configure your GLM API key and you're ready to go!
