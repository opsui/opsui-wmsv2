# Claude Code EMERGENCY Fix

**Date**: 2025-02-06  
**Status**: CRITICAL - Aggressive measures applied  
**Issue**: Claude Code continues to crash despite initial fixes

---

## 🔴 EMERGENCY ACTIONS TAKEN

### 1. Completely Disabled All MCP Servers

**Change**: `.mcp.json` now contains an empty object

```json
{
  "mcpServers": {}
}
```

**Why**: The custom MCP server may be causing crashes during initialization
**Impact**: No MCP functionality available until we identify the issue

### 2. Completely Disabled .clinerules.md

**Change**: `"cline.useClinerules": false`
**Why**: Even the optimized ruleset may still be overwhelming Claude Code
**Impact**: No automatic guidelines will be loaded

---

## 🚨 IMMEDIATE ACTION REQUIRED

### Step 1: Completely Close VS Code

1. **Save all your work**
2. **Close VS Code completely** (File → Exit)
3. **Verify VS Code is not running**: Check Task Manager and ensure no `Code.exe` processes

### Step 2: Clear Claude Code Cache

Run these commands in Windows Command Prompt or PowerShell:

```batch
REM Clear Claude Code extension cache
rd /s /q "%APPDATA%\Code\User\globalStorage\anthropic.claude-code"

REM Clear VS Code workspace storage
rd /s /q "%APPDATA%\Code\User\workspaceStorage"

REM Clear VS Code global storage (WARNING: resets ALL extension settings)
rd /s /q "%APPDATA%\Code\User\globalStorage"

REM Clear VS Code logs
rd /s /q "%APPDATA%\Code\logs"
```

### Step 3: Restart VS Code

1. Open VS Code
2. Wait for full initialization (watch the status bar)
3. Open Claude Code
4. Test with a simple request (e.g., "hello")

---

## 🔍 If Crashes Still Occur

### Option A: Minimal Configuration

Create a new VS Code workspace with ONLY Claude Code enabled:

1. **Disable ALL extensions except Claude Code**
   - Open Command Palette (Ctrl+Shift+P)
   - Type "Extensions: Disable All Extensions"
   - Re-enable only "Claude Code"

2. **Test in clean environment**
   - Open a simple project (not this one)
   - Test Claude Code with basic requests
   - If it works, the issue is project-specific

### Option B: Report to Claude Code Team

Collect this information:

**System Info:**

- OS: Windows 11
- VS Code Version: Help → About
- Claude Code Extension Version: Extensions → Claude Code
- Node.js version: `node --version`
- RAM: (check Task Manager)

**Error Details:**

- Exact error messages
- Steps to reproduce
- Console output (Developer Tools: Help → Toggle Developer Tools)

**Configuration:**

- Attach `.clinerules.md` (even though it's disabled)
- Attach `.mcp.json` (now empty)
- Attach `.vscode/settings.json`

**Logs:**

```
VS Code logs: %APPDATA%\Code\logs\
Extension logs: %APPDATA%\Code\User\globalStorage\anthropic.claude-code\
```

### Option C: Alternative AI Assistants

If Claude Code continues to be unstable, consider:

1. **Continue with Current Session** (me)
   - I'm working fine in this conversation
   - You can continue asking questions here
   - I can help with coding tasks without the VS Code integration

2. **Use Other Tools**
   - OpenAI's ChatGPT with code analysis
   - GitHub Copilot (built into VS Code)
   - Amazon Q Developer
   - Codeium (free alternative)

---

## 📊 Diagnostic Steps

### Run These Checks

**1. Check Disk Space**

```batch
wmic logicaldisk get name,freespace,size
```

You need at least 5GB free for proper operation.

**2. Check Memory Usage**

- Open Task Manager (Ctrl+Shift+Esc)
- Look for "Code.exe" processes
- If using >2GB, that's problematic
- If using >3GB, that's critical

**3. Check Node.js Version**

```batch
node --version
```

Should be Node.js 18+ for Claude Code compatibility.

**4. Check for Conflicting Processes**

```batch
tasklist | findstr "node"
```

Kill any orphaned node processes:

```batch
taskkill /F /IM node.exe
```

---

## 🔧 Temporary Workaround (If You Must Work NOW)

### Use the Current Session

You can continue using this conversation session with me:

- I'm stable and working
- I can read and write files
- I can execute commands
- I can help with development tasks

### Manual MCP Tool Usage

If you need MCP functionality, I can simulate it:

- **File operations**: I have native tools (read_file, write_to_file, etc.)
- **Database**: I can use node scripts to interact with PostgreSQL
- **Git**: I can execute git commands via execute_command
- **GitHub**: I can use gh CLI if authenticated

---

## 📝 Root Cause Theories

### Theory 1: Memory Leak in Claude Code Extension

- Extension has a bug causing gradual memory exhaustion
- Eventually crashes when memory exceeds threshold
- **Evidence**: Crashes occur after some use, not immediately
- **Likelihood**: High (common issue with complex extensions)

### Theory 2: Project-Specific Corruption

- Some file in the project is malformed
- Claude Code tries to read it and crashes
- **Evidence**: Crashes only in this project
- **Likelihood**: Medium (possible, but would expect consistent crash location)

### Theory 3: MCP Server Bug

- The custom wms-dev-accelerator server has a bug
- It crashes during initialization or tool calls
- **Evidence**: We disabled it - this should help
- **Likelihood**: High (we're testing this now)

### Theory 4: VS Code Extension Conflict

- Another extension is interfering with Claude Code
- **Evidence**: Extension conflicts are common
- **Likelihood**: Medium (we'll test by disabling other extensions)

---

## ✅ Recovery Plan

### Phase 1: Clean Restart (DO THIS NOW)

1. ✅ Disabled MCP servers
2. ✅ Disabled .clinerules.md
3. ⏳ Clear caches (you need to do this)
4. ⏳ Restart VS Code (you need to do this)
5. ⏳ Test with simple request

### Phase 2: If Stable

1. Re-enable .clinerules.md (`"cline.useClinerules": true`)
2. Test again
3. If stable, consider the issue was MCP servers
4. Re-add MCP servers one at a time to identify the culprit

### Phase 3: If Still Crashing

1. Test in clean environment (new workspace)
2. Collect logs and system info
3. Report to Claude Code team
4. Use alternative solutions in the meantime

---

## 🎯 What to Do Right Now

**In order:**

1. **Save your work** in VS Code
2. **Copy this file** (`CLAUDE_CODE_EMERGENCY_FIX.md`) - you'll need it for reference
3. **Close VS Code completely**
4. **Run the cache clearing commands** (see Step 2 above)
5. **Restart VS Code**
6. **Test Claude Code** with: "Can you hear me?"
7. **If it works**: Great! Let me know and we can gradually re-enable features
8. **If it crashes**: Skip to "If Crashes Still Occur" section

---

## 📞 Next Steps Based on Outcome

### If Works After Clean Restart

- Reply: "WORKS - Clean restart fixed it"
- We'll gradually re-enable features to identify what caused the crash

### If Still Crashes

- Reply: "STILL CRASHING - Even after clean restart"
- I'll guide you through more extensive troubleshooting

### If Unusable

- Reply: "UNUSABLE - Can't even start Claude Code"
- We'll need to report this as a bug and use alternatives

---

**Status**: 🟡 **WAITING FOR YOU TO PERFORM CLEAN RESTART**

Please complete Steps 1-3 above and let me know the result.
