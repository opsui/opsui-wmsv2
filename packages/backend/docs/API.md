# WMS Backend API Documentation

## Overview

This document describes the REST API endpoints for the Warehouse Management System (WMS) backend. The API is built with Node.js, Express, and TypeScript.

**Base URL:** `http://localhost:3001/api`

**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Orders](#orders)
3. [Inventory](#inventory)
4. [Stock Control](#stock-control)
5. [Shipping](#shipping)
6. [Inbound Receiving](#inbound-receiving)
7. [Users](#users)
8. [Reports](#reports)
9. [Cycle Counting](#cycle-counting)
10. [Quality Control](#quality-control)
11. [Business Rules](#business-rules)
12. [Integrations](#integrations)
13. [WebSocket Events](#websocket-events)

---

## Authentication

All API endpoints (except login) require authentication via JWT bearer token.

### Login

**POST** `/auth/login`

Authenticate with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PICKER",
    "active": true
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid email or password

### Refresh Token

**POST** `/auth/refresh`

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### Logout

**POST** `/auth/logout`

Invalidate refresh token and clear user session.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Orders

### Get Order Queue

**GET** `/orders`

Get list of orders with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (PENDING, PICKING, PICKED, PACKING, PACKED, SHIPPED) |
| priority | string | No | Filter by priority (1-4) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50) |

**Response (200 OK):**

```json
{
  "orders": [
    {
      "orderId": "ORD-20250130-1234",
      "status": "PENDING",
      "priority": 1,
      "orderDate": "2025-01-30T10:00:00Z",
      "customer": "Customer Name",
      "items": [
        {
          "orderItemId": "OI-123",
          "sku": "SKU001",
          "name": "Product Name",
          "quantity": 10,
          "pickedQuantity": 0
        }
      ],
      "pickerId": null,
      "packerId": null
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 2
}
```

### Claim Order (Picker)

**POST** `/orders/:orderId/claim`

Claim an order for picking.

**Path Parameters:**

- `orderId` (string): Order ID

**Response (200 OK):**

```json
{
  "orderId": "ORD-20250130-1234",
  "pickerId": "user-123",
  "status": "PICKING",
  "claimedAt": "2025-01-30T10:05:00Z"
}
```

### Update Pick Progress

**PATCH** `/orders/:orderId/items/:orderItemId`

Update picked quantity for an item.

**Path Parameters:**

- `orderId` (string): Order ID
- `orderItemId` (string): Order Item ID

**Request Body:**

```json
{
  "pickedQuantity": 5
}
```

**Response (200 OK):**

```json
{
  "orderItemId": "OI-123",
  "pickedQuantity": 5,
  "remaining": 5
}
```

### Complete Order (Picker)

**POST** `/orders/:orderId/complete-pick`

Mark order as fully picked.

**Path Parameters:**

- `orderId` (string): Order ID

**Response (200 OK):**

```json
{
  "orderId": "ORD-20250130-1234",
  "status": "PICKED",
  "completedAt": "2025-01-30T10:30:00Z"
}
```

### Claim Order (Packer)

**POST** `/orders/:orderId/claim-pack`

Claim an order for packing.

**Response (200 OK):**

```json
{
  "orderId": "ORD-20250130-1234",
  "packerId": "user-456",
  "status": "PACKING"
}
```

### Complete Order (Packer)

**POST** `/orders/:orderId/complete-pack`

Mark order as fully packed and ready for shipping.

**Response (200 OK):**

```json
{
  "orderId": "ORD-20250130-1234",
  "status": "PACKED",
  "packedAt": "2025-01-30T11:00:00Z"
}
```

---

## Inventory

### Get Inventory List

**GET** `/inventory`

Get inventory with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sku | string | No | Filter by SKU (partial match) |
| name | string | No | Filter by product name (partial match) |
| category | string | No | Filter by category |
| binLocation | string | No | Filter by bin location (partial match) |
| lowStock | boolean | No | Show only low stock items |
| outOfStock | boolean | No | Show only out of stock items |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50) |

**Response (200 OK):**

```json
{
  "items": [
    {
      "sku": "SKU001",
      "name": "Product Name",
      "category": "Electronics",
      "binLocation": "A-01-01",
      "quantity": 100,
      "reserved": 10,
      "available": 90
    }
  ],
  "total": 500,
  "page": 1
}
```

### Get SKU Details

**GET** `/inventory/sku/:sku`

Get detailed inventory information for a specific SKU.

**Path Parameters:**

- `sku` (string): SKU identifier

**Response (200 OK):**

```json
{
  "sku": "SKU001",
  "name": "Product Name",
  "description": "Product description",
  "category": "Electronics",
  "barcode": "1234567890",
  "totalQuantity": 150,
  "totalReserved": 20,
  "totalAvailable": 130,
  "locations": [
    {
      "binLocation": "A-01-01",
      "quantity": 100,
      "reserved": 10,
      "available": 90,
      "lastUpdated": "2025-01-30T10:00:00Z"
    },
    {
      "binLocation": "A-01-02",
      "quantity": 50,
      "reserved": 10,
      "available": 40,
      "lastUpdated": "2025-01-30T10:00:00Z"
    }
  ],
  "recentTransactions": [
    {
      "transactionId": "TXN-001",
      "type": "RECEIPT",
      "quantity": 100,
      "timestamp": "2025-01-30T09:00:00Z",
      "reason": "Stock receipt",
      "binLocation": "A-01-01"
    }
  ]
}
```

---

## Stock Control

### Get Dashboard

**GET** `/stock-control/dashboard`

Get stock control dashboard metrics.

**Response (200 OK):**

```json
{
  "totalSKUs": 150,
  "totalBins": 200,
  "lowStockItems": 15,
  "outOfStockItems": 5,
  "pendingStockCounts": 3,
  "recentTransactions": [...],
  "totalInventoryValue": 50000.00
}
```

### Get Stock Counts

**GET** `/stock-control/counts`

Get stock count records.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (PENDING, IN_PROGRESS, COMPLETED, VERIFIED) |
| limit | number | No | Items per page (default: 20) |
| offset | number | No | Offset for pagination (default: 0) |

**Response (200 OK):**

```json
{
  "counts": [
    {
      "countId": "SC-123",
      "binLocation": "A-01-01",
      "type": "FULL",
      "status": "COMPLETED",
      "createdBy": "user-123",
      "createdAt": "2025-01-30T09:00:00Z",
      "completedAt": "2025-01-30T09:30:00Z",
      "items": [
        {
          "sku": "SKU001",
          "expectedQuantity": 100,
          "countedQuantity": 95,
          "variance": -5
        }
      ]
    }
  ],
  "total": 50
}
```

### Create Stock Count

**POST** `/stock-control/counts`

Create a new stock count.

**Request Body:**

```json
{
  "binLocation": "A-01-01",
  "type": "FULL",
  "userId": "user-123"
}
```

**Response (201 Created):**

```json
{
  "countId": "SC-124",
  "binLocation": "A-01-01",
  "type": "FULL",
  "status": "PENDING",
  "createdBy": "user-123",
  "createdAt": "2025-01-30T10:00:00Z"
}
```

### Submit Stock Count

**POST** `/stock-control/counts/:countId/submit`

Submit stock count results.

**Path Parameters:**

- `countId` (string): Stock count ID

**Request Body:**

```json
{
  "items": [
    {
      "sku": "SKU001",
      "countedQuantity": 95,
      "notes": "Damage found"
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "countId": "SC-124",
  "status": "COMPLETED",
  "discrepancies": [
    {
      "sku": "SKU001",
      "binLocation": "A-01-01",
      "expectedQuantity": 100,
      "countedQuantity": 95,
      "variance": -5
    }
  ]
}
```

### Transfer Stock

**POST** `/stock-control/transfer`

Transfer stock between bin locations.

**Request Body:**

```json
{
  "sku": "SKU001",
  "fromBin": "A-01-01",
  "toBin": "A-01-02",
  "quantity": 10,
  "reason": "Relocation",
  "userId": "user-123"
}
```

**Response (200 OK):**

```json
{
  "transferId": "ST-123",
  "sku": "SKU001",
  "fromBin": "A-01-01",
  "toBin": "A-01-02",
  "quantity": 10,
  "reason": "Relocation",
  "performedAt": "2025-01-30T10:00:00Z"
}
```

### Adjust Inventory

**POST** `/stock-control/adjust`

Adjust inventory quantity.

**Request Body:**

```json
{
  "sku": "SKU001",
  "binLocation": "A-01-01",
  "quantity": -5,
  "reason": "Damage",
  "userId": "user-123"
}
```

**Response (200 OK):**

```json
{
  "adjustmentId": "ADJ-123",
  "sku": "SKU001",
  "binLocation": "A-01-01",
  "previousQuantity": 100,
  "newQuantity": 95,
  "variance": -5,
  "reason": "Damage"
}
```

### Get Transaction History

**GET** `/stock-control/transactions`

Get inventory transaction history.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sku | string | No | Filter by SKU |
| binLocation | string | No | Filter by bin location |
| type | string | No | Filter by type (RECEIPT, DEDUCTION, ADJUSTMENT, TRANSFER) |
| startDate | string | No | Filter start date (ISO format) |
| endDate | string | No | Filter end date (ISO format) |
| limit | number | No | Items per page (default: 50) |
| offset | number | No | Offset for pagination |

**Response (200 OK):**

```json
{
  "transactions": [
    {
      "transactionId": "TXN-001",
      "type": "ADJUSTMENT",
      "sku": "SKU001",
      "quantity": -5,
      "userId": "user-123",
      "timestamp": "2025-01-30T10:00:00Z",
      "reason": "Damage",
      "binLocation": "A-01-01"
    }
  ],
  "total": 100
}
```

---

## Shipping

### Get Shipping Labels

**POST** `/shipping/labels`

Generate shipping labels for orders.

**Request Body:**

```json
{
  "orderIds": ["ORD-001", "ORD-002"],
  "carrier": "fedex"
}
```

**Response (200 OK):**

```json
{
  "labels": [
    {
      "orderId": "ORD-001",
      "labelUrl": "https://carrier.com/labels/123456",
      "trackingNumber": "123456789012"
    }
  ]
}
```

### Shipment Tracking

**GET** `/shipping/tracking/:trackingNumber`

Get shipment tracking information.

**Path Parameters:**

- `trackingNumber` (string): Carrier tracking number

**Response (200 OK):**

```json
{
  "trackingNumber": "123456789012",
  "carrier": "fedex",
  "status": "IN_TRANSIT",
  "estimatedDelivery": "2025-02-01T18:00:00Z",
  "events": [
    {
      "status": "PICKED_UP",
      "location": "Origin Facility",
      "timestamp": "2025-01-30T10:00:00Z"
    },
    {
      "status": "IN_TRANSIT",
      "location": "Distribution Center",
      "timestamp": "2025-01-30T15:00:00Z"
    }
  ]
}
```

---

## Inbound Receiving

### Get ASNs

**GET** `/inbound/asns`

Get Advanced Shipping Notices.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status |
| page | number | No | Page number |
| limit | number | No | Items per page |

**Response (200 OK):**

```json
{
  "asns": [
    {
      "asnId": "ASN-001",
      "supplier": "Supplier Name",
      "status": "RECEIVED",
      "expectedDate": "2025-01-30T00:00:00Z",
      "receivedDate": "2025-01-30T10:00:00Z",
      "items": [
        {
          "sku": "SKU001",
          "name": "Product Name",
          "expectedQuantity": 100,
          "receivedQuantity": 98
        }
      ]
    }
  ],
  "total": 25
}
```

### Receive ASN

**POST** `/inbound/receive`

Process inbound receiving for an ASN.

**Request Body:**

```json
{
  "asnId": "ASN-001",
  "items": [
    {
      "sku": "SKU001",
      "receivedQuantity": 98,
      "binLocation": "A-01-01",
      "notes": "2 items damaged"
    }
  ],
  "receivedBy": "user-123"
}
```

**Response (200 OK):**

```json
{
  "asnId": "ASN-001",
  "status": "RECEIVED",
  "receivedAt": "2025-01-30T10:00:00Z"
}
```

---

## Users

### Get Users

**GET** `/users`

Get list of users (admin only).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role |
| active | boolean | No | Filter by active status |

**Response (200 OK):**

```json
{
  "users": [
    {
      "userId": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PICKER",
      "active": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "lastLoginAt": "2025-01-30T09:00:00Z"
    }
  ]
}
```

### Update User Role

**PATCH** `/users/:userId/role`

Update user role (admin only).

**Request Body:**

```json
{
  "role": "SUPERVISOR"
}
```

**Response (200 OK):**

```json
{
  "userId": "user-123",
  "role": "SUPERVISOR"
}
```

---

## Reports

### Get Report

**GET** `/reports/:reportType`

Get various reports.

**Path Parameters:**

- `reportType` (string): Type of report (sales, inventory, performance, etc.)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Report start date |
| endDate | string | No | Report end date |
| format | string | No | Response format (json, csv) |

**Response (200 OK):**

```json
{
  "reportType": "inventory",
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "data": {
    "totalSKUs": 150,
    "totalInventory": 10000,
    "lowStockItems": 15,
    "outOfStockItems": 5
  },
  "generatedAt": "2025-01-30T10:00:00Z"
}
```

---

## Cycle Counting

### Get Cycle Count Plans

**GET** `/cycle-counting/plans`

Get cycle count plans.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status |
| page | number | No | Page number |
| limit | number | No | Items per page |

**Response (200 OK):**

```json
{
  "plans": [
    {
      "planId": "CCP-001",
      "planName": "Zone A Weekly Count",
      "countType": "CYCLIC",
      "scheduledDate": "2025-01-30",
      "location": "A-01-01",
      "status": "IN_PROGRESS",
      "countedBy": "user-123"
    }
  ]
}
```

### Create Cycle Count Plan

**POST** `/cycle-counting/plans`

Create a new cycle count plan.

**Request Body:**

```json
{
  "planName": "Zone A Weekly Count",
  "countType": "CYCLIC",
  "scheduledDate": "2025-01-30",
  "location": "A-01-01",
  "countBy": "user-123"
}
```

---

## Quality Control

### Get QC Inspections

**GET** `/quality-control/inspections`

Get quality control inspections.

**Response (200 OK):**

```json
{
  "inspections": [
    {
      "inspectionId": "QC-001",
      "orderId": "ORD-001",
      "status": "PENDING",
      "scheduledFor": "2025-01-30T10:00:00Z"
    }
  ]
}
```

### Submit QC Result

**POST** `/quality-control/inspections/:inspectionId/result`

Submit quality control inspection result.

**Request Body:**

```json
{
  "passed": true,
  "notes": "All items within specifications",
  "inspectedBy": "user-123"
}
```

---

## Business Rules

### Get Business Rules

**GET** `/business-rules`

Get configured business rules.

**Response (200 OK):**

```json
{
  "rules": [
    {
      "ruleId": "BR-001",
      "name": "High Priority Rule",
      "condition": "order.total > 1000",
      "action": "set priority to 1",
      "enabled": true
    }
  ]
}
```

### Create Business Rule

**POST** `/business-rules`

Create a new business rule.

**Request Body:**

```json
{
  "name": "Express Shipping Rule",
  "condition": "order.shippingMethod == 'express'",
  "action": "set priority to 1",
  "enabled": true
}
```

---

## Integrations

### Get Integration Status

**GET** `/integrations/status`

Get status of external integrations.

**Response (200 OK):**

```json
{
  "integrations": [
    {
      "name": "fedex",
      "enabled": true,
      "status": "connected",
      "lastSync": "2025-01-30T10:00:00Z"
    },
    {
      "name": "erp",
      "enabled": false,
      "status": "not configured"
    }
  ]
}
```

---

## WebSocket Events

### Connection

Connect to WebSocket server at: `ws://localhost:3001`

**Authentication:** Send token in auth object during connection.

### Server → Client Events

| Event               | Data                                       | Description                |
| ------------------- | ------------------------------------------ | -------------------------- |
| `connected`         | `{ message: string }`                      | Connection established     |
| `order:claimed`     | `{ orderId, pickerId, pickerName }`        | Order claimed by picker    |
| `order:completed`   | `{ orderId, pickerId }`                    | Order picking completed    |
| `order:cancelled`   | `{ orderId, reason }`                      | Order cancelled            |
| `pick:updated`      | `{ orderId, orderItemId, pickedQuantity }` | Pick quantity updated      |
| `pick:completed`    | `{ orderId, orderItemId }`                 | Item fully picked          |
| `zone:updated`      | `{ zoneId, taskCount, pickerCount }`       | Zone status updated        |
| `zone:assignment`   | `{ zoneId, pickerId, assigned }`           | Picker assigned to zone    |
| `inventory:updated` | `{ sku, binLocation, quantity }`           | Inventory quantity changed |
| `inventory:low`     | `{ sku, quantity, minThreshold }`          | Low stock alert            |
| `notification:new`  | `{ notificationId, title, message }`       | New notification           |
| `user:activity`     | `{ userId, status, currentView }`          | User activity changed      |

### Client → Server Events

| Event                 | Data                        | Description                    |
| --------------------- | --------------------------- | ------------------------------ |
| `subscribe:orders`    | -                           | Subscribe to order updates     |
| `subscribe:zone`      | `zoneId`                    | Subscribe to zone updates      |
| `unsubscribe:zone`    | `zoneId`                    | Unsubscribe from zone updates  |
| `subscribe:inventory` | -                           | Subscribe to inventory updates |
| `update:activity`     | `{ currentView?, status? }` | Update user activity           |
| `ping`                | -                           | Keep-alive ping                |

---

## Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request:**

```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [...]
}
```

**401 Unauthorized:**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**403 Forbidden:**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

**404 Not Found:**

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

**409 Conflict:**

```json
{
  "error": "Conflict",
  "message": "Resource state conflicts with request"
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Default limit:** 100 requests per minute per IP
- **Authenticated users:** 1000 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640899200
```

When rate limit is exceeded:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again later.",
  "retryAfter": 60
}
```

---

## Pagination

List endpoints support pagination using `page` and `limit` query parameters.

**Example:**

```
GET /orders?page=2&limit=25
```

**Response includes pagination metadata:**

```json
{
  "items": [...],
  "total": 250,
  "page": 2,
  "pageSize": 25,
  "totalPages": 10
}
```
