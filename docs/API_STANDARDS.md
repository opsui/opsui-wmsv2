# API Standards

> **AI Context System - API Design & Documentation Standards**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Define REST API conventions and documentation standards

---

## API Design Principles

### RESTful Conventions

| Method | Action | Example |
|--------|--------|---------|
| `GET` | Read resource(s) | `GET /api/orders` |
| `POST` | Create resource | `POST /api/orders` |
| `PUT` | Replace resource | `PUT /api/orders/:id` |
| `PATCH` | Update resource | `PATCH /api/orders/:id/status` |
| `DELETE` | Remove resource | `DELETE /api/orders/:id` |

### URL Naming Conventions

```
✅ CORRECT                          ❌ WRONG
─────────────────────────────────────────────────────
GET /api/orders                     GET /api/getOrders
GET /api/orders/:id                 GET /api/order/:id
POST /api/orders                    POST /api/createOrder
PATCH /api/orders/:id/status        POST /api/updateOrderStatus
GET /api/pick-tasks                 GET /api/pick_tasks
```

---

## Standard Response Format

### Success Response

```typescript
// Single resource
{
  "success": true,
  "data": { ... }
}

// Multiple resources with pagination
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "quantity", "message": "Must be greater than 0" }
    ]
  },
  "requestId": "req_abc123"
}
```

---

## HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid input, validation error |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Authenticated but not authorized |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | State conflict, duplicate resource |
| `422` | Unprocessable Entity | Validation failed |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Database/connection issues |

---

## Error Code Reference

### Standard Error Codes

```typescript
enum ErrorCode {
  // Authentication
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  
  // Authorization
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Business Logic
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  ORDER_ALREADY_CLAIMED = 'ORDER_ALREADY_CLAIMED',
  
  // System
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

---

## Authentication

### JWT Token Format

```typescript
// Header
Authorization: Bearer <token>

// Token payload
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "PICKER",
  "organizationId": 1,
  "iat": 1234567890,
  "exp": 1234597890
}
```

### Protected Endpoints

All endpoints except the following require authentication:

```
POST /api/auth/login
POST /api/auth/refresh
GET  /api/health
```

---

## Pagination

### Query Parameters

```
GET /api/orders?page=1&limit=20&sort=createdAt&order=desc
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number (1-indexed) |
| `limit` | 20 | Items per page (max: 100) |
| `sort` | createdAt | Sort field |
| `order` | desc | Sort order (asc/desc) |

### Response Format

```typescript
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering

### Query Parameter Format

```
GET /api/orders?status=PENDING&pickerId=123
GET /api/orders?createdAt[gte]=2024-01-01
GET /api/orders?search=order-123
```

### Filter Operators

| Operator | Example | SQL Equivalent |
|----------|---------|----------------|
| `eq` | `status=eq:PENDING` | `= 'PENDING'` |
| `neq` | `status=neq:CANCELLED` | `!= 'CANCELLED'` |
| `gt` | `quantity=gt:10` | `> 10` |
| `gte` | `quantity=gte:10` | `>= 10` |
| `lt` | `quantity=lt:100` | `< 100` |
| `lte` | `quantity=lte:100` | `<= 100` |
| `in` | `status=in:PENDING,PICKING` | `IN ('PENDING', 'PICKING')` |
| `like` | `name=like:widget` | `ILIKE '%widget%'` |

---

## Rate Limiting

### Default Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| API (authenticated) | 100 requests | 1 minute |
| API (unauthenticated) | 20 requests | 1 minute |

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## API Versioning

### URL Versioning (Current)

```
/api/v1/orders
/api/v2/orders
```

### Version Header (Alternative)

```
Accept: application/vnd.wms.v1+json
```

### Deprecation Policy

1. Announce deprecation 6 months in advance
2. Add `Deprecation: true` header to responses
3. Add `Link` header pointing to new endpoint
4. Maintain backward compatibility during deprecation period

---

## Request ID Tracking

All requests must include a unique request ID:

```typescript
// Request header
X-Request-ID: req_abc123

// Response header
X-Request-ID: req_abc123

// In error response
{
  "success": false,
  "error": {...},
  "requestId": "req_abc123"
}
```

---

## OpenAPI Documentation

### Endpoint Documentation Template

```yaml
/api/orders/{orderId}/status:
  patch:
    summary: Update order status
    description: |
      Updates the status of an order.
      Valid transitions depend on current status.
    tags:
      - Orders
    security:
      - bearerAuth: []
    parameters:
      - name: orderId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - status
            properties:
              status:
                $ref: '#/components/schemas/OrderStatus'
    responses:
      '200':
        description: Order status updated
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      '400':
        $ref: '#/components/responses/ValidationError'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        $ref: '#/components/responses/NotFound'
      '409':
        description: Invalid state transition
```

---

## Health Check Endpoints

### Basic Health

```
GET /api/health

Response 200:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Detailed Health

```
GET /api/health/detailed

Response 200:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.2.3",
  "uptime": 86400,
  "checks": {
    "database": {
      "wms_db": "healthy",
      "aap_db": "healthy"
    },
    "redis": "healthy",
    "external": {
      "netsuite": "healthy",
      "shopify": "degraded"
    }
  }
}
```

---

## WebSocket Events

### Connection

```
ws://localhost:3002/ws
```

### Authentication

```javascript
// Client sends
{ "type": "auth", "token": "Bearer <jwt>" }

// Server responds
{ "type": "auth_success", "userId": "123" }
```

### Event Format

```javascript
// Server → Client
{
  "type": "order:created",
  "data": { "orderId": "123", ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `order:created` | New order received |
| `order:updated` | Order modified |
| `order:status_changed` | Order status changed |
| `pick:assigned` | Pick task assigned |
| `pick:completed` | Pick task completed |
| `inventory:changed` | Inventory updated |

---

## Summary Checklist

Before deploying new endpoints:

- [ ] Follows RESTful conventions
- [ ] Returns correct HTTP status codes
- [ ] Includes request ID in responses
- [ ] Has proper authentication
- [ ] Implements rate limiting
- [ ] Returns paginated results for lists
- [ ] Has OpenAPI documentation
- [ ] Handles errors with proper error codes
- [ ] Logs requests appropriately
- [ ] Has integration tests