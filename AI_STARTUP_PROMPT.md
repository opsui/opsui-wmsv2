# AI_STARTUP_PROMPT.md

> **AI Context System - Session Initialization Workflow**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Ensure AI maintains full context awareness before any coding

---

## ⚠️ MANDATORY: Read Before Coding

Every AI coding session MUST begin by reading the context files in this order:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   🔴 STOP: READ THESE FILES BEFORE WRITING ANY CODE                        │
│                                                                             │
│   1. /ai_context.ts           ← Machine-readable constants (CRITICAL)      │
│   2. /CURRENT_CONTEXT.md      ← Session state                              │
│   3. /DATABASE_BOUNDARIES.md  ← Database rules                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Session Startup Checklist

### Step 1: Read Context Files

```bash
# READ THESE FILES IN ORDER:
1. ai_context.ts              # CRITICAL - Single source of truth
2. CURRENT_CONTEXT.md         # Current session state
3. DATABASE_BOUNDARIES.md     # Database separation rules
4. PROJECT_CONTEXT.md         # Infrastructure overview
```

### Step 2: Confirm Context

Before coding, confirm with user:

```
I've read the AI context files. Here's my understanding:

• Current Database: [wms_db | aap_db | UNKNOWN]
• Environment: [test | customer | UNKNOWN]
• Service Area: [warehouse | application | integration | UNKNOWN]

Is this correct for the task you want me to perform?
```

### Step 3: Verify Database Rules

```
If working with wms_db:
  ✅ Safe for development
  ✅ Can create/modify with migrations
  
If working with aap_db:
  ⚠️ REQUIRES EXPLICIT APPROVAL
  ⚠️ Customer database - be careful
  ⚠️ Do NOT modify schemas without approval
```

---

## Pre-Coding Verification

### Database Verification

```typescript
// BEFORE any database-related code, confirm:

import { AI_CONTEXT } from './ai_context';

// Which database?
const targetDb = AI_CONTEXT.DATABASES.WMS;  // or .AAP

// Is this customer data?
if (targetDb.type === 'customer') {
  // STOP: Get user approval first
  throw new Error('Customer database requires explicit approval');
}

// Is this the right service?
const service = 'warehouse'; // or 'application' or 'integration'
const expectedDb = AI_CONTEXT.SERVICE_BOUNDARIES[service].database;
if (targetDb.name !== expectedDb) {
  // STOP: Wrong database for service
  throw new Error(`Service ${service} should use ${expectedDb}, not ${targetDb.name}`);
}
```

### Environment Verification

```typescript
// Verify environment before proceeding

import { AI_CONTEXT } from './ai_context';

const environment = AI_CONTEXT.ENVIRONMENTS.TEST; // or .CUSTOMER

if (environment === AI_CONTEXT.ENVIRONMENTS.CUSTOMER) {
  // Additional checks for production environment
  console.warn('⚠️ WORKING WITH CUSTOMER/PRODUCTION DATA');
  console.warn('⚠️ BE EXTRA CAREFUL');
}
```

---

## Common Pitfalls to Avoid

### Pitfall 1: Forgetting the Remote Backend

```
❌ WRONG: "Let me start the backend locally..."
✅ CORRECT: "Backend runs on remote SSH server (103.208.85.233)"
```

### Pitfall 2: Confusing Databases

```
❌ WRONG: "I'll store the NetSuite config in wms_db"
✅ CORRECT: "Integration configs go in aap_db"
```

### Pitfall 3: Direct Cross-Database Queries

```
❌ WRONG: "Let me join orders from wms_db with users from aap_db"
✅ CORRECT: "Integration services access WMS data via API"
```

### Pitfall 4: Frontend on Backend Server

```
❌ WRONG: "I'll deploy the frontend to 103.208.85.233"
✅ CORRECT: "Frontend deploys to Cloudflare Pages"
```

### Pitfall 5: Modifying Customer Database

```
❌ WRONG: "I'll add a column to aap_db"
✅ CORRECT: "aap_db changes require explicit user approval"
```

---

## Quick Reference Commands

### Deployment Workflow (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   🚀 DEPLOYMENT RULES - MEMORIZE THIS                                      │
│                                                                             │
│   FRONTEND: Push to GitHub → Cloudflare auto-deploys                       │
│   BACKEND:  Push to GitHub → Pull on server → PM2 restart                  │
│                                                                             │
│   ❌ NEVER: scp frontend dist to production server                         │
│   ❌ NEVER: Deploy frontend to 103.208.85.233                              │
│   ✅ ALWAYS: git push for frontend (Cloudflare watches GitHub)             │
│   ✅ ALWAYS: git push + server pull for backend changes                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Deploy Frontend Changes

```bash
# 1. Format and commit
npm run format:fix
git add packages/frontend/src/path/to/file.tsx
git commit -m "feat: description"
git push

# 2. Cloudflare automatically deploys from GitHub
#    - No manual deployment needed
#    - Changes live within 1-2 minutes
```

### Deploy Backend Changes

```bash
# 1. Commit and push
git add packages/backend/src/path/to/file.ts
git commit -m "feat: description"
git push

# 2. Deploy to production server
ssh root@103.208.85.233 "cd /root/opsui-wmsv2 && git pull && pm2 restart backend"

# OR use scp for single file hotfix:
scp packages/backend/dist/routes/file.js root@103.208.85.233:/root/opsui-wmsv2/packages/backend/dist/routes/
ssh root@103.208.85.233 "pm2 restart backend"
```

### Start Development Session

```bash
# 1. Establish SSH tunnel (if working with database)
ssh -f -N -L 5433:localhost:5432 root@103.208.85.233

# 2. Verify tunnel is active
ss -tlnp | grep 5433

# 3. Start backend (local dev)
cd packages/backend && npm run dev

# 4. Start frontend (new terminal)
cd packages/frontend && npm run dev
```

### Production Server Access

```bash
# SSH to production
ssh root@103.208.85.233

# Check PM2 status
pm2 status

# View logs
pm2 logs backend

# Restart backend
pm2 restart backend
```

---

## Context File Summary

| File | Purpose | When to Read |
|------|---------|--------------|
| `ai_context.ts` | Machine-readable constants | EVERY SESSION START |
| `CURRENT_CONTEXT.md` | Session state tracking | EVERY SESSION START |
| `DATABASE_BOUNDARIES.md` | Database separation rules | Before DB work |
| `PROJECT_CONTEXT.md` | Infrastructure overview | When needed |
| `SYSTEM_ARCHITECTURE.md` | Architecture patterns | When needed |
| `INTEGRATIONS.md` | Integration boundaries | Before integration work |
| `AI_RULES.md` | Development rules | When needed |

---

## Emergency Context Recovery

If you're unsure about context during a session:

```
1. STOP coding
2. Re-read /ai_context.ts
3. Check /CURRENT_CONTEXT.md
4. Ask user to confirm:
   - Which database?
   - Which environment?
   - Which service?
5. Only proceed after confirmation
```

---

## Session End Protocol

Before ending a session:

1. Update `/CURRENT_CONTEXT.md` with:
   - What was done
   - Any pending work
   - Important notes

2. Note any changes to architecture

3. Document any new patterns discovered

---

## Summary

| Step | Action |
|------|--------|
| **1** | Read `/ai_context.ts` FIRST |
| **2** | Read `/CURRENT_CONTEXT.md` |
| **3** | Confirm database, environment, service with user |
| **4** | Get approval if working with aap_db |
| **5** | Proceed with coding task |
| **6** | Update context at session end |

---

**Remember:** The goal is to prevent AI from:
- Forgetting the remote backend server
- Assuming frontend runs on the backend
- Mixing PostgreSQL databases
- Confusing test and production environments
- Modifying real customer databases
- Placing integration logic in the wrong services

**Read the context files. Confirm with user. Then code.**