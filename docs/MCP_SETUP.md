# MCP Server Setup Guide

This guide explains how to configure and use the custom MCP (Model Context Protocol) servers with this Warehouse Management System project.

## Overview

This project includes a custom MCP server called **WMS Dev Accelerator** that provides specialized tools for accelerating development tasks specific to this WMS codebase.

## Available MCP Servers

### 1. WMS Dev Accelerator (Local)

The custom MCP server included in this repository provides the following tools:

- **code-analysis**: Analyze code structure and dependencies
- **code-generation**: Generate code based on patterns
- **context-compression**: Compress and optimize context for AI agents
- **ml-predictions**: Get ML-powered predictions for orders and tasks
- **multi-agent**: Coordinate multiple AI agents
- **pattern-extraction**: Extract approved patterns from codebase
- **project**: Query project structure and metadata
- **telemetry**: Track development metrics
- **test-generation**: Generate tests based on code
- **wms-domain**: WMS-specific domain tools

### 2. Recommended Online MCP Servers

These are community MCP servers that work well with this project:

- **@modelcontextprotocol/server-filesystem**: File system operations
- **@modelcontextprotocol/server-github**: GitHub integration
- **@modelcontextprotocol/server-postgres**: PostgreSQL database operations
- **@modelcontextprotocol/server-brave-search**: Web search capabilities

## Setup Instructions

### Step 1: Install the Custom MCP Server Dependencies

```bash
cd "tools/mcp-server"
npm install
npm run build
```

### Step 2: Configure Claude Desktop

You need to add the MCP server configuration to your Claude Desktop settings.

#### Finding the Configuration File

The configuration file location depends on your operating system:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Configuration Template

Create or edit the `claude_desktop_config.json` file with the following content:

```json
{
  "mcpServers": {
    "wms-dev-accelerator": {
      "command": "node",
      "args": [
        "C:\\Users\\YOUR_USERNAME\\Documents\\Warehouse Management System\\tools\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "WMS_WORKSPACE_ROOT": "C:\\Users\\YOUR_USERNAME\\Documents\\Warehouse Management System"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\YOUR_USERNAME\\Documents\\Warehouse Management System"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "YOUR_GITHUB_TOKEN_HERE"
      }
    }
  }
}
```

### Step 3: Update Paths for Your System

**Important**: Replace the following paths in the configuration:

1. **Windows** (update `YOUR_USERNAME`):

   ```
   C:\Users\YOUR_USERNAME\Documents\Warehouse Management System
   ```

2. **macOS/Linux**:

   ```
   /Users/YOUR_USERNAME/Documents/Warehouse Management System
   ```

3. **GitHub Token**: Get a personal access token from GitHub Settings → Developer Settings → Personal Access Tokens

### Step 4: Restart Claude Desktop

After saving the configuration file, completely restart Claude Desktop:

1. Quit Claude Desktop (make sure it's not running in the background)
2. Reopen Claude Desktop
3. The MCP servers should now be available

## Verifying the Setup

To verify that the MCP servers are working:

1. Open Claude Desktop
2. Start a new conversation
3. Ask: "What MCP servers are available?"
4. You should see the wms-dev-accelerator and any other configured servers listed

## Using the MCP Server

Once configured, you can use the MCP server tools in your conversations with Claude:

### Example Usage

```
User: Can you analyze the order processing code using the WMS domain tools?

Claude: [Uses the wms-domain tool from the MCP server to analyze the code]
```

### Available Tools

The WMS Dev Accelerator provides these specialized tools:

| Tool                  | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `code-analysis`       | Analyze code structure, find dependencies, identify patterns |
| `code-generation`     | Generate code following WMS patterns                         |
| `context-compression` | Compress large context for better AI understanding           |
| `ml-predictions`      | Get predictions for order duration, picker performance       |
| `multi-agent`         | Coordinate multiple AI agents for complex tasks              |
| `pattern-extraction`  | Extract approved patterns from the codebase                  |
| `project`             | Query project structure, file ownership, module info         |
| `telemetry`           | Track and analyze development metrics                        |
| `test-generation`     | Generate tests based on existing code                        |
| `wms-domain`          | Access WMS-specific business logic and rules                 |

## Troubleshooting

### MCP Server Not Starting

1. **Check the build**: Make sure you ran `npm run build` in `tools/mcp-server`
2. **Check the path**: Verify the path in `claude_desktop_config.json` is correct
3. **Check logs**: Look for MCP server logs in Claude Desktop's console
4. **Dependencies**: Ensure Node.js is installed and accessible

### Permission Errors

If you get permission errors:

1. Make sure the workspace path is correct
2. On Windows, use double backslashes in paths: `C:\\Users\\...`
3. Ensure the user running Claude Desktop has read access to the project

### Server Not Listed

If the server doesn't appear in Claude:

1. Completely quit and restart Claude Desktop
2. Check the JSON syntax in `claude_desktop_config.json` (use a JSON validator)
3. Verify the file is in the correct location for your OS

## Advanced Configuration

### Adding Environment Variables

You can add environment variables to the MCP server configuration:

```json
{
  "mcpServers": {
    "wms-dev-accelerator": {
      "command": "node",
      "args": ["path/to/index.js"],
      "env": {
        "WMS_WORKSPACE_ROOT": "path/to/project",
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Multiple Workspace Support

If you work with multiple workspaces, you can configure multiple instances:

```json
{
  "mcpServers": {
    "wms-dev-accelerator-main": {
      "command": "node",
      "args": ["path/to/main/project/tools/mcp-server/dist/index.js"],
      "env": {
        "WMS_WORKSPACE_ROOT": "path/to/main/project"
      }
    },
    "wms-dev-accelerator-dev": {
      "command": "node",
      "args": ["path/to/dev/project/tools/mcp-server/dist/index.js"],
      "env": {
        "WMS_WORKSPACE_ROOT": "path/to/dev/project"
      }
    }
  }
}
```

## For Coworkers

When setting up for the first time:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/HeinrichtSmith/opsui-wmsv2.git
   cd opsui-wmsv2
   ```

2. **Install dependencies**:

   ```bash
   npm install
   cd tools/mcp-server && npm install && npm run build
   ```

3. **Configure MCP** following the steps above

4. **Verify** by checking if the MCP server appears in Claude Desktop

## Support

If you encounter issues:

- Check the [MCP Documentation](https://modelcontextprotocol.io/docs)
- Review the MCP server logs in Claude Desktop
- Open an issue on the GitHub repository

## Updates

The MCP server is automatically updated when you pull changes from the repository. After pulling:

```bash
cd tools/mcp-server
npm install
npm run build
```

Then restart Claude Desktop to pick up the changes.
