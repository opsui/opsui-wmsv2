# Project Memory

## Server Architecture (LOCKED)

**Canonical Production Server:**

```
ssh root@103.208.85.233
```

**Runtime Environment:**

- Bare-metal/VM Linux server
- NO Docker, NO containers, NO Kubernetes
- Node.js backend with PM2 process manager
- Git-based deployment

**Database:**

- PostgreSQL running directly as system service
- Port: 5432 (locked)
- Persistent data directory

## Database Connection

For local development connecting to remote DB:

```bash
ssh -f -N -L 5433:localhost:5432 root@103.208.85.233
```

Then connect to localhost:5433 (tunneled to remote 5432)

**CRITICAL:** All schema changes, migrations, and seeding must target the remote PostgreSQL on 103.208.85.233. Local database modifications are forbidden unless explicitly authorized.

## Port Configuration

- Backend API: 3001 (locked)
- WebSocket: 3002 (locked)
- PostgreSQL: 5432 (server) / 5433 (local tunnel)

## Forbidden Actions

- Introduce Docker/containers
- Change locked ports
- Modify production silently
- Reset DB without approval
- Auto-create local DB
- Switch DB targets silently
