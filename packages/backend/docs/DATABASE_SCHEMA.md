# WMS Database Schema Documentation

## Overview

The Warehouse Management System uses PostgreSQL as its database. This document describes all tables, relationships, indexes, and constraints.

**Database:** PostgreSQL 14+
**Schema Version:** 38 migrations

---

## Table of Contents

1. [Users & Authentication](#users--authentication)
2. [Products & Inventory](#products--inventory)
3. [Orders & Fulfillment](#orders--fulfillment)
4. [Inbound Receiving](#inbound-receiving)
5. [Cycle Counting](#cycle-counting)
6. [Shipping](#shipping)
7. [Quality Control](#quality-control)
8. [Business Rules & Automation](#business-rules--automation)
9. [Reports & Analytics](#reports--analytics)
10. [Notifications](#notifications)
11. [Audit & Logging](#audit--logging)

---

## Users & Authentication

### users

Stores user account information and authentication data.

| Column         | Type         | Constraints             | Description                             |
| -------------- | ------------ | ----------------------- | --------------------------------------- |
| user_id        | VARCHAR(20)  | PRIMARY KEY             | Unique user identifier                  |
| email          | VARCHAR(255) | NOT NULL, UNIQUE        | User email address                      |
| name           | VARCHAR(255) | NOT NULL                | Full name                               |
| password_hash  | VARCHAR(255) | NOT NULL                | Bcrypt hashed password                  |
| role           | VARCHAR(20)  | NOT NULL                | User role (PICKER, PACKER, ADMIN, etc.) |
| active_role    | VARCHAR(20)  |                         | Active role for multi-role users        |
| active         | BOOLEAN      | NOT NULL, DEFAULT true  | Account active status                   |
| current_view   | VARCHAR(50)  |                         | Current page/view being accessed        |
| last_viewed_at | TIMESTAMP    |                         | Last activity timestamp                 |
| last_login_at  | TIMESTAMP    |                         | Last login timestamp                    |
| created_at     | TIMESTAMP    | NOT NULL, DEFAULT NOW() | Account creation timestamp              |

**Indexes:**

- `idx_users_email` on (email)
- `idx_users_role` on (role)
- `idx_users_active` on (active)

**Relationships:**

- A user can have many custom roles via `user_role_assignments`

### custom_roles

Defines custom roles with specific permissions.

| Column      | Type         | Constraints             | Description            |
| ----------- | ------------ | ----------------------- | ---------------------- |
| role_id     | VARCHAR(50)  | PRIMARY KEY             | Custom role identifier |
| role_name   | VARCHAR(100) | NOT NULL, UNIQUE        | Display name           |
| description | TEXT         |                         | Role description       |
| permissions | JSONB        | NOT NULL                | Permission definitions |
| is_active   | BOOLEAN      | NOT NULL, DEFAULT true  | Role active status     |
| created_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW() | Creation timestamp     |
| updated_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW() | Last update timestamp  |

### user_role_assignments

Maps users to custom roles (many-to-many relationship).

| Column        | Type        | Constraints                          | Description             |
| ------------- | ----------- | ------------------------------------ | ----------------------- |
| assignment_id | VARCHAR(50) | PRIMARY KEY                          | Assignment identifier   |
| user_id       | VARCHAR(20) | NOT NULL, FK → users(user_id)        | User reference          |
| role_id       | VARCHAR(50) | NOT NULL, FK → custom_roles(role_id) | Custom role reference   |
| assigned_at   | TIMESTAMP   | NOT NULL, DEFAULT NOW()              | Assignment timestamp    |
| assigned_by   | VARCHAR(20) | FK → users(user_id)                  | Who made the assignment |

---

## Products & Inventory

### skus

Product/SKU master data.

| Column          | Type           | Constraints             | Description                         |
| --------------- | -------------- | ----------------------- | ----------------------------------- |
| sku             | VARCHAR(50)    | PRIMARY KEY             | SKU identifier                      |
| name            | VARCHAR(255)   | NOT NULL                | Product name                        |
| description     | TEXT           |                         | Product description                 |
| category        | VARCHAR(100)   |                         | Product category                    |
| barcode         | VARCHAR(100)   | UNIQUE                  | Product barcode (EAN/UPC)           |
| bin_locations   | TEXT[]         |                         | Default bin locations               |
| unit_of_measure | VARCHAR(20)    | DEFAULT 'EA'            | Unit of measure (EA, CS, PAL, etc.) |
| weight          | DECIMAL(10, 2) |                         | Item weight                         |
| active          | BOOLEAN        | NOT NULL, DEFAULT true  | SKU active status                   |
| created_at      | TIMESTAMP      | NOT NULL, DEFAULT NOW() | Creation timestamp                  |

**Indexes:**

- `idx_skus_category` on (category)
- `idx_skus_barcode` on (barcode)
- `idx_skus_active` on (active)

### inventory_units

Current inventory levels by bin location.

| Column       | Type        | Constraints                                        | Description               |
| ------------ | ----------- | -------------------------------------------------- | ------------------------- |
| unit_id      | VARCHAR(50) | PRIMARY KEY                                        | Inventory unit identifier |
| sku          | VARCHAR(50) | NOT NULL, FK → skus(sku)                           | SKU reference             |
| bin_location | VARCHAR(50) | NOT NULL, FK → bin_locations(bin_id)               | Bin location reference    |
| quantity     | INTEGER     | NOT NULL DEFAULT 0, CHECK (quantity >= 0)          | Total quantity            |
| reserved     | INTEGER     | NOT NULL DEFAULT 0, CHECK (reserved >= 0)          | Reserved quantity         |
| available    | INTEGER     | NOT NULL GENERATED ALWAYS AS (quantity - reserved) | Available quantity        |
| last_updated | TIMESTAMP   | NOT NULL DEFAULT NOW()                             | Last update timestamp     |

**Indexes:**

- `idx_inventory_sku` on (sku)
- `idx_inventory_bin` on (bin_location)
- `idx_inventory_available` on (available) - For low stock queries
- `idx_inventory_sku_bin` UNIQUE on (sku, bin_location)

### bin_locations

Warehouse bin/storage location definitions.

| Column   | Type        | Constraints           | Description                             |
| -------- | ----------- | --------------------- | --------------------------------------- |
| bin_id   | VARCHAR(50) | PRIMARY KEY           | Bin location identifier                 |
| zone     | VARCHAR(20) | NOT NULL              | Warehouse zone                          |
| aisle    | VARCHAR(10) | NOT NULL              | Aisle identifier                        |
| shelf    | VARCHAR(10) | NOT NULL              | Shelf identifier                        |
| type     | VARCHAR(20) | NOT NULL              | Location type (SHELF, FLOOR, RACK, BIN) |
| capacity | INTEGER     |                       | Maximum capacity                        |
| active   | BOOLEAN     | NOT NULL DEFAULT true | Location active status                  |

**Indexes:**

- `idx_bin_zone` on (zone)
- `idx_bin_location` UNIQUE on (zone, aisle, shelf)

### inventory_transactions

Transaction history for all inventory movements.

| Column         | Type        | Constraints                   | Description                                                 |
| -------------- | ----------- | ----------------------------- | ----------------------------------------------------------- |
| transaction_id | VARCHAR(50) | PRIMARY KEY                   | Transaction identifier                                      |
| type           | VARCHAR(20) | NOT NULL                      | Transaction type (RECEIPT, DEDUCTION, ADJUSTMENT, TRANSFER) |
| sku            | VARCHAR(50) | NOT NULL, FK → skus(sku)      | SKU reference                                               |
| quantity       | INTEGER     | NOT NULL                      | Quantity change (+/-)                                       |
| order_id       | VARCHAR(50) | FK → orders(order_id)         | Related order                                               |
| user_id        | VARCHAR(20) | NOT NULL, FK → users(user_id) | User who made the change                                    |
| timestamp      | TIMESTAMP   | NOT NULL DEFAULT NOW()        | Transaction timestamp                                       |
| reason         | TEXT        |                               | Reason for the transaction                                  |
| bin_location   | VARCHAR(50) |                               | Related bin location                                        |

**Indexes:**

- `idx_transactions_sku` on (sku)
- `idx_transactions_type` on (type)
- `idx_transactions_user` on (user_id)
- `idx_transactions_timestamp` on (timestamp DESC)

### stock_counts

Stock count records for inventory verification.

| Column       | Type        | Constraints                          | Description                                        |
| ------------ | ----------- | ------------------------------------ | -------------------------------------------------- |
| count_id     | VARCHAR(50) | PRIMARY KEY                          | Stock count identifier                             |
| bin_location | VARCHAR(50) | NOT NULL, FK → bin_locations(bin_id) | Bin location                                       |
| type         | VARCHAR(20) | NOT NULL                             | Count type (FULL, CYCLIC, SPOT)                    |
| status       | VARCHAR(20) | NOT NULL                             | Status (PENDING, IN_PROGRESS, COMPLETED, VERIFIED) |
| created_by   | VARCHAR(20) | NOT NULL, FK → users(user_id)        | Creator                                            |
| created_at   | TIMESTAMP   | NOT NULL DEFAULT NOW()               | Creation timestamp                                 |
| completed_at | TIMESTAMP   |                                      | Completion timestamp                               |
| verified_by  | VARCHAR(20) | FK → users(user_id)                  | Verifier                                           |

**Indexes:**

- `idx_stock_counts_status` on (status)
- `idx_stock_counts_type` on (type)

### stock_count_items

Line items for stock counts.

| Column            | Type        | Constraints                                                         | Description              |
| ----------------- | ----------- | ------------------------------------------------------------------- | ------------------------ |
| count_item_id     | VARCHAR(50) | PRIMARY KEY                                                         | Count item identifier    |
| count_id          | VARCHAR(50) | NOT NULL, FK → stock_counts(count_id)                               | Stock count reference    |
| sku               | VARCHAR(50) | NOT NULL, FK → skus(sku)                                            | SKU reference            |
| expected_quantity | INTEGER     | NOT NULL                                                            | Expected system quantity |
| counted_quantity  | INTEGER     | NOT NULL                                                            | Actual counted quantity  |
| variance          | INTEGER     | NOT NULL GENERATED ALWAYS AS (counted_quantity - expected_quantity) | Difference               |
| notes             | TEXT        |                                                                     | Count notes              |

### capacity_rules

Bin location capacity management rules.

| Column             | Type           | Constraints            | Description                                         |
| ------------------ | -------------- | ---------------------- | --------------------------------------------------- |
| rule_id            | VARCHAR(50)    | PRIMARY KEY            | Rule identifier                                     |
| rule_name          | VARCHAR(100)   | NOT NULL               | Rule name                                           |
| description        | TEXT           |                        | Rule description                                    |
| capacity_type      | VARCHAR(20)    | NOT NULL               | Capacity type (QUANTITY, WEIGHT, VOLUME)            |
| capacity_unit      | VARCHAR(20)    | NOT NULL               | Unit of measure                                     |
| applies_to         | VARCHAR(20)    | NOT NULL               | Scope (ALL, ZONE, LOCATION_TYPE, SPECIFIC_LOCATION) |
| zone               | VARCHAR(20)    |                        | Zone filter                                         |
| location_type      | VARCHAR(20)    |                        | Location type filter                                |
| specific_location  | VARCHAR(50)    |                        | Specific bin filter                                 |
| maximum_capacity   | DECIMAL(10, 2) | NOT NULL               | Maximum capacity                                    |
| warning_threshold  | INTEGER        | NOT NULL               | Warning threshold (percentage)                      |
| allow_overfill     | BOOLEAN        | NOT NULL DEFAULT false | Allow overfill                                      |
| overfill_threshold | DECIMAL(10, 2) |                        | Overfill threshold                                  |
| priority           | INTEGER        | NOT NULL DEFAULT 0     | Rule priority                                       |
| active             | BOOLEAN        | NOT NULL DEFAULT true  | Rule active status                                  |
| created_at         | TIMESTAMP      | NOT NULL DEFAULT NOW() | Creation timestamp                                  |

---

## Orders & Fulfillment

### orders

Order header information.

| Column               | Type         | Constraints                   | Description                                                                  |
| -------------------- | ------------ | ----------------------------- | ---------------------------------------------------------------------------- |
| order_id             | VARCHAR(50)  | PRIMARY KEY                   | Order identifier                                                             |
| customer_id          | VARCHAR(50)  |                               | Customer reference                                                           |
| order_date           | DATE         | NOT NULL DEFAULT CURRENT_DATE | Order date                                                                   |
| status               | VARCHAR(20)  | NOT NULL                      | Order status (PENDING, PICKING, PICKED, PACKING, PACKED, SHIPPED, CANCELLED) |
| priority             | INTEGER      | NOT NULL DEFAULT 4            | Priority level (1=highest, 4=lowest)                                         |
| total_items          | INTEGER      | NOT NULL DEFAULT 0            | Total line items                                                             |
| total_quantity       | INTEGER      | NOT NULL DEFAULT 0            | Total quantity                                                               |
| picker_id            | VARCHAR(20)  | FK → users(user_id)           | Assigned picker                                                              |
| picker_assigned_at   | TIMESTAMP    |                               | Picker assignment time                                                       |
| picking_started_at   | TIMESTAMP    |                               | Picking start time                                                           |
| picking_completed_at | TIMESTAMP    |                               | Picking completion time                                                      |
| packer_id            | VARCHAR(20)  | FK → users(user_id)           | Assigned packer                                                              |
| packer_assigned_at   | TIMESTAMP    |                               | Packer assignment time                                                       |
| packing_started_at   | TIMESTAMP    |                               | Packing start time                                                           |
| packing_completed_at | TIMESTAMP    |                               | Packing completion time                                                      |
| shipped_at           | TIMESTAMP    |                               | Shipment timestamp                                                           |
| tracking_number      | VARCHAR(100) |                               | Shipment tracking                                                            |
| notes                | TEXT         |                               | Order notes                                                                  |
| created_at           | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp                                                           |
| updated_at           | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Last update timestamp                                                        |

**Indexes:**

- `idx_orders_status` on (status)
- `idx_orders_priority` on (priority)
- `idx_orders_picker` on (picker_id)
- `idx_orders_date` on (order_date)
- `idx_orders_customer` on (customer_id)

### order_items

Order line items.

| Column          | Type           | Constraints                     | Description          |
| --------------- | -------------- | ------------------------------- | -------------------- |
| order_item_id   | VARCHAR(50)    | PRIMARY KEY                     | Line item identifier |
| order_id        | VARCHAR(50)    | NOT NULL, FK → orders(order_id) | Order reference      |
| sku             | VARCHAR(50)    | NOT NULL, FK → skus(sku)        | SKU reference        |
| quantity        | INTEGER        | NOT NULL CHECK (quantity > 0)   | Ordered quantity     |
| picked_quantity | INTEGER        | NOT NULL DEFAULT 0              | Picked quantity      |
| packed_quantity | INTEGER        | NOT NULL DEFAULT 0              | Packed quantity      |
| unit_price      | DECIMAL(10, 2) | NOT NULL                        | Unit price           |
| status          | VARCHAR(20)    | NOT NULL                        | Line item status     |
| notes           | TEXT           |                                 | Line item notes      |
| created_at      | TIMESTAMP      | NOT NULL DEFAULT NOW()          | Creation timestamp   |

**Indexes:**

- `idx_order_items_order` on (order_id)
- `idx_order_items_sku` on (sku)

### order_exceptions

Order exceptions/issues.

| Column        | Type        | Constraints                     | Description                                  |
| ------------- | ----------- | ------------------------------- | -------------------------------------------- |
| exception_id  | VARCHAR(50) | PRIMARY KEY                     | Exception identifier                         |
| order_id      | VARCHAR(50) | FK → orders(order_id)           | Order reference                              |
| order_item_id | VARCHAR(50) | FK → order_items(order_item_id) | Line item reference                          |
| type          | VARCHAR(50) | NOT NULL                        | Exception type                               |
| severity      | VARCHAR(20) | NOT NULL                        | Severity (LOW, MEDIUM, HIGH, CRITICAL)       |
| status        | VARCHAR(20) | NOT NULL DEFAULT 'OPEN'         | Status (OPEN, IN_PROGRESS, RESOLVED, CLOSED) |
| reported_by   | VARCHAR(20) | FK → users(user_id)             | Reporter                                     |
| assigned_to   | VARCHAR(20) | FK → users(user_id)             | Assignee                                     |
| description   | TEXT        | NOT NULL                        | Exception description                        |
| resolution    | TEXT        |                                 | Resolution details                           |
| root_cause    | TEXT        |                                 | Root cause analysis                          |
| created_at    | TIMESTAMP   | NOT NULL DEFAULT NOW()          | Creation timestamp                           |
| resolved_at   | TIMESTAMP   |                                 | Resolution timestamp                         |

**Indexes:**

- `idx_exceptions_order` on (order_id)
- `idx_exceptions_status` on (status)
- `idx_exceptions_severity` on (severity)
- `idx_exceptions_type` on (type)

---

## Inbound Receiving

### advance_shipping_notices (ASNs)

Advance Shipping Notices from suppliers.

| Column                | Type         | Constraints                   | Description                                                           |
| --------------------- | ------------ | ----------------------------- | --------------------------------------------------------------------- |
| asn_id                | VARCHAR(50)  | PRIMARY KEY                   | ASN identifier                                                        |
| supplier_id           | VARCHAR(50)  | NOT NULL                      | Supplier reference                                                    |
| purchase_order_number | VARCHAR(100) | NOT NULL                      | PO number                                                             |
| status                | VARCHAR(20)  | NOT NULL DEFAULT 'PENDING'    | Status (PENDING, IN_TRANSIT, RECEIVED, PARTIALLY_RECEIVED, CANCELLED) |
| expected_arrival_date | DATE         | NOT NULL                      | Expected delivery date                                                |
| actual_arrival_date   | DATE         |                               | Actual arrival date                                                   |
| carrier               | VARCHAR(100) |                               | Shipping carrier                                                      |
| tracking_number       | VARCHAR(100) |                               | Carrier tracking                                                      |
| shipment_notes        | TEXT         |                               | Shipment notes                                                        |
| created_at            | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp                                                    |
| updated_at            | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Last update                                                           |
| received_at           | TIMESTAMP    |                               | Receipt timestamp                                                     |
| created_by            | VARCHAR(20)  | NOT NULL, FK → users(user_id) | Creator                                                               |

**Indexes:**

- `idx_asn_supplier` on (supplier_id)
- `idx_asn_status` on (status)
- `idx_asn_expected_arrival` on (expected_arrival_date)
- `idx_asn_po_number` on (purchase_order_number)
- `idx_asn_unique_po` UNIQUE on (supplier_id, purchase_order_number)

### asn_line_items

ASN line items.

| Column            | Type           | Constraints                                       | Description                                                     |
| ----------------- | -------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| line_item_id      | VARCHAR(50)    | PRIMARY KEY                                       | Line item identifier                                            |
| asn_id            | VARCHAR(50)    | NOT NULL, FK → advance_shipping_notices(asn_id)   | ASN reference                                                   |
| sku               | VARCHAR(50)    | NOT NULL, FK → skus(sku)                          | SKU reference                                                   |
| expected_quantity | INTEGER        | NOT NULL CHECK (expected_quantity > 0)            | Expected quantity                                               |
| received_quantity | INTEGER        | NOT NULL DEFAULT 0 CHECK (received_quantity >= 0) | Received quantity                                               |
| unit_cost         | DECIMAL(10, 2) | NOT NULL CHECK (unit_cost >= 0)                   | Unit cost                                                       |
| lot_number        | VARCHAR(100)   |                                                   | Lot/batch number                                                |
| expiration_date   | DATE           |                                                   | Expiration date                                                 |
| receiving_status  | VARCHAR(20)    | NOT NULL DEFAULT 'PENDING'                        | Status (PENDING, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED) |
| line_notes        | TEXT           |                                                   | Line notes                                                      |

**Indexes:**

- `idx_asn_line_asn` on (asn_id)
- `idx_asn_line_sku` on (sku)
- `idx_asn_line_status` on (receiving_status)
- `idx_asn_line_unique` UNIQUE on (asn_id, sku)

### receipts

Goods receipt records.

| Column       | Type        | Constraints                           | Description                              |
| ------------ | ----------- | ------------------------------------- | ---------------------------------------- |
| receipt_id   | VARCHAR(50) | PRIMARY KEY                           | Receipt identifier                       |
| asn_id       | VARCHAR(50) | FK → advance_shipping_notices(asn_id) | Related ASN                              |
| receipt_date | DATE        | NOT NULL DEFAULT CURRENT_DATE         | Receipt date                             |
| receipt_type | VARCHAR(20) | NOT NULL DEFAULT 'PO'                 | Type (PO, RETURN, TRANSFER, ADJUSTMENT)  |
| status       | VARCHAR(20) | NOT NULL DEFAULT 'RECEIVING'          | Status (RECEIVING, COMPLETED, CANCELLED) |
| created_at   | TIMESTAMP   | NOT NULL DEFAULT NOW()                | Creation timestamp                       |
| completed_at | TIMESTAMP   |                                       | Completion timestamp                     |
| received_by  | VARCHAR(20) | NOT NULL, FK → users(user_id)         | Receiver                                 |

**Indexes:**

- `idx_receipt_asn` on (asn_id)
- `idx_receipt_date` on (receipt_date)
- `idx_receipt_status` on (status)
- `idx_receipt_type` on (receipt_type)

### receipt_line_items

Receipt line items.

| Column            | Type           | Constraints                                                 | Description                                      |
| ----------------- | -------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| receipt_line_id   | VARCHAR(50)    | PRIMARY KEY                                                 | Line item identifier                             |
| receipt_id        | VARCHAR(50)    | NOT NULL, FK → receipts(receipt_id)                         | Receipt reference                                |
| asn_line_item_id  | VARCHAR(50)    | FK → asn_line_items(line_item_id)                           | ASN line reference                               |
| sku               | VARCHAR(50)    | NOT NULL, FK → skus(sku)                                    | SKU reference                                    |
| quantity_ordered  | INTEGER        | NOT NULL                                                    | Ordered quantity                                 |
| quantity_received | INTEGER        | NOT NULL CHECK (quantity_received > 0)                      | Received quantity                                |
| quantity_damaged  | INTEGER        | NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0)            | Damaged quantity                                 |
| quality_status    | VARCHAR(20)    | NOT NULL DEFAULT 'PENDING'                                  | QC status (PENDING, PASSED, FAILED, PARTIAL)     |
| putaway_status    | VARCHAR(20)    | NOT NULL DEFAULT 'PENDING'                                  | Putaway status (PENDING, IN_PROGRESS, COMPLETED) |
| unit_cost         | DECIMAL(10, 2) |                                                             | Unit cost                                        |
| total_cost        | DECIMAL(12, 2) | GENERATED ALWAYS AS (quantity_received \* unit_cost) STORED | Total cost                                       |
| lot_number        | VARCHAR(100)   |                                                             | Lot number                                       |
| expiration_date   | DATE           |                                                             | Expiration date                                  |
| notes             | TEXT           |                                                             | Notes                                            |

**Indexes:**

- `idx_receipt_line_receipt` on (receipt_id)
- `idx_receipt_line_sku` on (sku)
- `idx_receipt_line_quality` on (quality_status)
- `idx_receipt_line_putaway` on (putaway_status)
- `idx_receipt_line_unique` UNIQUE on (receipt_id, sku)

### putaway_tasks

Putaway work items.

| Column              | Type        | Constraints                                        | Description                                         |
| ------------------- | ----------- | -------------------------------------------------- | --------------------------------------------------- |
| putaway_task_id     | VARCHAR(50) | PRIMARY KEY                                        | Task identifier                                     |
| receipt_line_id     | VARCHAR(50) | NOT NULL, FK → receipt_line_items(receipt_line_id) | Receipt line reference                              |
| sku                 | VARCHAR(50) | NOT NULL, FK → skus(sku)                           | SKU reference                                       |
| quantity_to_putaway | INTEGER     | NOT NULL CHECK (quantity_to_putaway > 0)           | Quantity to put away                                |
| quantity_putaway    | INTEGER     | NOT NULL DEFAULT 0 CHECK (quantity_putaway >= 0)   | Quantity put away                                   |
| target_bin_location | VARCHAR(50) | NOT NULL, FK → bin_locations(bin_id)               | Target bin location                                 |
| status              | VARCHAR(20) | NOT NULL DEFAULT 'PENDING'                         | Status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED) |
| assigned_to         | VARCHAR(20) | FK → users(user_id)                                | Assigned worker                                     |
| assigned_at         | TIMESTAMP   |                                                    | Assignment time                                     |
| completed_at        | TIMESTAMP   |                                                    | Completion time                                     |
| completed_by        | VARCHAR(20) | FK → users(user_id)                                | Completer                                           |
| priority            | VARCHAR(20) | NOT NULL DEFAULT 'NORMAL'                          | Priority (LOW, NORMAL, HIGH, URGENT)                |
| created_at          | TIMESTAMP   | NOT NULL DEFAULT NOW()                             | Creation timestamp                                  |
| updated_at          | TIMESTAMP   | NOT NULL DEFAULT NOW()                             | Last update                                         |
| notes               | TEXT        |                                                    | Notes                                               |

**Indexes:**

- `idx_putaway_receipt_line` on (receipt_line_id)
- `idx_putaway_sku` on (sku)
- `idx_putaway_status` on (status)
- `idx_putaway_assigned` on (assigned_to)
- `idx_putaway_target_bin` on (target_bin_location)
- `idx_putaway_priority` on (priority)

---

## Cycle Counting

### cycle_count_plans

Cycle count schedule plans.

| Column         | Type         | Constraints                   | Description                                                        |
| -------------- | ------------ | ----------------------------- | ------------------------------------------------------------------ |
| plan_id        | VARCHAR(50)  | PRIMARY KEY                   | Plan identifier                                                    |
| plan_name      | VARCHAR(100) | NOT NULL                      | Plan name                                                          |
| count_type     | VARCHAR(20)  | NOT NULL                      | Count type (AD_HOC, ABC, BLANKET, SPOT_CHECK, RECEIVING, SHIPPING) |
| scheduled_date | DATE         | NOT NULL                      | Scheduled date                                                     |
| location       | VARCHAR(50)  |                               | Location filter                                                    |
| sku            | VARCHAR(50)  |                               | SKU filter                                                         |
| status         | VARCHAR(20)  | NOT NULL DEFAULT 'SCHEDULED'  | Status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)              |
| count_by       | VARCHAR(20)  | NOT NULL, FK → users(user_id) | Assigned counter                                                   |
| created_at     | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp                                                 |

**Indexes:**

- `idx_cycle_count_plans_status` on (status)
- `idx_cycle_count_plans_date` on (scheduled_date)
- `idx_cycle_count_plans_count_by` on (count_by)

### cycle_count_entries

Cycle count entry records.

| Column           | Type        | Constraints                               | Description                                     |
| ---------------- | ----------- | ----------------------------------------- | ----------------------------------------------- |
| entry_id         | VARCHAR(50) | PRIMARY KEY                               | Entry identifier                                |
| plan_id          | VARCHAR(50) | NOT NULL, FK → cycle_count_plans(plan_id) | Plan reference                                  |
| sku              | VARCHAR(50) | NOT NULL, FK → skus(sku)                  | SKU reference                                   |
| bin_location     | VARCHAR(50) | NOT NULL, FK → bin_locations(bin_id)      | Bin location                                    |
| system_quantity  | INTEGER     | NOT NULL                                  | Expected quantity                               |
| counted_quantity | INTEGER     | NOT NULL                                  | Actual counted quantity                         |
| variance         | INTEGER     | NOT NULL                                  | Difference                                      |
| variance_status  | VARCHAR(20) | NOT NULL DEFAULT 'PENDING'                | Variance status (PENDING, ACCEPTED, RECONCILED) |
| counted_by       | VARCHAR(20) | FK → users(user_id)                       | Counter                                         |
| counted_at       | TIMESTAMP   | NOT NULL DEFAULT NOW()                    | Count timestamp                                 |
| notes            | TEXT        |                                           | Count notes                                     |

**Indexes:**

- `idx_cycle_count_entries_plan` on (plan_id)
- `idx_cycle_count_entries_sku` on (sku)
- `idx_cycle_count_entries_variance_status` on (variance_status)

### variance_root_causes

Root cause analysis for inventory variances.

| Column            | Type        | Constraints                             | Description            |
| ----------------- | ----------- | --------------------------------------- | ---------------------- |
| cause_id          | VARCHAR(50) | PRIMARY KEY                             | Root cause identifier  |
| category_id       | VARCHAR(50) | FK → root_cause_categories(category_id) | Category reference     |
| description       | TEXT        | NOT NULL                                | Root cause description |
| corrective_action | TEXT        | NOT NULL                                | Recommended action     |
| prevention_method | TEXT        | NOT NULL                                | Prevention strategy    |
| created_at        | TIMESTAMP   | NOT NULL DEFAULT NOW()                  | Creation timestamp     |

---

## Shipping

### shipments

Shipment records.

| Column             | Type         | Constraints                | Description                                                 |
| ------------------ | ------------ | -------------------------- | ----------------------------------------------------------- |
| shipment_id        | VARCHAR(50)  | PRIMARY KEY                | Shipment identifier                                         |
| order_id           | VARCHAR(50)  | FK → orders(order_id)      | Order reference                                             |
| carrier            | VARCHAR(100) | NOT NULL                   | Shipping carrier                                            |
| service_level      | VARCHAR(50)  | NOT NULL                   | Service level (GROUND, 2DAY, OVERNIGHT, etc.)               |
| tracking_number    | VARCHAR(100) | UNIQUE                     | Carrier tracking number                                     |
| label_url          | TEXT         |                            | Shipping label URL                                          |
| status             | VARCHAR(20)  | NOT NULL DEFAULT 'PENDING' | Status (PENDING, SHIPPED, IN_TRANSIT, DELIVERED, EXCEPTION) |
| shipped_at         | TIMESTAMP    |                            | Shipment timestamp                                          |
| estimated_delivery | TIMESTAMP    |                            | Estimated delivery                                          |
| actual_delivery    | TIMESTAMP    |                            | Actual delivery timestamp                                   |
| created_at         | TIMESTAMP    | NOT NULL DEFAULT NOW()     | Creation timestamp                                          |

**Indexes:**

- `idx_shipments_order` on (order_id)
- `idx_shipments_tracking` on (tracking_number)
- `idx_shipments_status` on (status)
- `idx_shipments_carrier` on (carrier)

---

## Quality Control

### qc_inspections

Quality control inspection records.

| Column            | Type        | Constraints                              | Description                                   |
| ----------------- | ----------- | ---------------------------------------- | --------------------------------------------- |
| inspection_id     | VARCHAR(50) | PRIMARY KEY                              | Inspection identifier                         |
| order_id          | VARCHAR(50) | FK → orders(order_id)                    | Related order                                 |
| receipt_line_id   | VARCHAR(50) | FK → receipt_line_items(receipt_line_id) | Receipt line reference                        |
| sku               | VARCHAR(50) | FK → skus(sku)                           | SKU reference                                 |
| inspection_type   | VARCHAR(20) | NOT NULL                                 | Type (INCOMING, OUTGOING, RETURNS)            |
| status            | VARCHAR(20) | NOT NULL DEFAULT 'PENDING'               | Status (PENDING, IN_PROGRESS, PASSED, FAILED) |
| inspector_id      | VARCHAR(20) | FK → users(user_id)                      | Inspector                                     |
| checklist_results | JSONB       |                                          | Checklist results                             |
| defects_found     | INTEGER     | DEFAULT 0                                | Number of defects                             |
| notes             | TEXT        |                                          | Inspection notes                              |
| inspected_at      | TIMESTAMP   |                                          | Inspection timestamp                          |
| created_at        | TIMESTAMP   | NOT NULL DEFAULT NOW()                   | Creation timestamp                            |

**Indexes:**

- `idx_qc_order` on (order_id)
- `idx_qc_status` on (status)
- `idx_qc_inspector` on (inspector_id)

---

## Business Rules & Automation

### business_rules

Configurable business rules.

| Column      | Type         | Constraints            | Description                 |
| ----------- | ------------ | ---------------------- | --------------------------- |
| rule_id     | VARCHAR(50)  | PRIMARY KEY            | Rule identifier             |
| rule_name   | VARCHAR(100) | NOT NULL               | Rule name                   |
| description | TEXT         |                        | Rule description            |
| condition   | JSONB        | NOT NULL               | Rule condition (expression) |
| action      | JSONB        | NOT NULL               | Rule action (configuration) |
| priority    | INTEGER      | NOT NULL DEFAULT 0     | Rule priority               |
| enabled     | BOOLEAN      | NOT NULL DEFAULT true  | Rule enabled status         |
| created_at  | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp          |
| updated_at  | TIMESTAMP    | NOT NULL DEFAULT NOW() | Update timestamp            |

### feature_flags

Feature flag configuration.

| Column             | Type         | Constraints            | Description                |
| ------------------ | ------------ | ---------------------- | -------------------------- |
| flag_key           | VARCHAR(100) | PRIMARY KEY            | Feature flag key           |
| description        | TEXT         |                        | Feature description        |
| enabled            | BOOLEAN      | NOT NULL DEFAULT false | Feature enabled status     |
| rollout_percentage | INTEGER      | NOT NULL DEFAULT 0     | Rollout percentage (0-100) |
| user_whitelist     | TEXT[]       |                        | Allowed users              |
| created_at         | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp         |
| updated_at         | TIMESTAMP    | NOT NULL DEFAULT NOW() | Update timestamp           |

---

## Reports & Analytics

### reports

Report definitions and results.

| Column       | Type         | Constraints                   | Description                                       |
| ------------ | ------------ | ----------------------------- | ------------------------------------------------- |
| report_id    | VARCHAR(50)  | PRIMARY KEY                   | Report identifier                                 |
| report_type  | VARCHAR(50)  | NOT NULL                      | Report type (SALES, INVENTORY, PERFORMANCE, etc.) |
| name         | VARCHAR(200) | NOT NULL                      | Report name                                       |
| parameters   | JSONB        |                               | Report parameters                                 |
| status       | VARCHAR(20)  | NOT NULL DEFAULT 'PENDING'    | Status (PENDING, GENERATING, COMPLETED, FAILED)   |
| file_url     | TEXT         |                               | Generated file URL                                |
| generated_at | TIMESTAMP    |                               | Generation timestamp                              |
| created_by   | VARCHAR(20)  | NOT NULL, FK → users(user_id) | Creator                                           |
| created_at   | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp                                |

---

## Notifications

### notifications

User notifications.

| Column          | Type         | Constraints                   | Description             |
| --------------- | ------------ | ----------------------------- | ----------------------- |
| notification_id | VARCHAR(50)  | PRIMARY KEY                   | Notification identifier |
| user_id         | VARCHAR(20)  | NOT NULL, FK → users(user_id) | User reference          |
| type            | VARCHAR(50)  | NOT NULL                      | Notification type       |
| title           | VARCHAR(200) | NOT NULL                      | Notification title      |
| message         | TEXT         | NOT NULL                      | Notification message    |
| data            | JSONB        |                               | Additional data         |
| read            | BOOLEAN      | NOT NULL DEFAULT false        | Read status             |
| read_at         | TIMESTAMP    |                               | Read timestamp          |
| created_at      | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp      |
| expires_at      | TIMESTAMP    |                               | Expiration timestamp    |

**Indexes:**

- `idx_notifications_user` on (user_id)
- `idx_notifications_read` on (read)
- `idx_notifications_type` on (type)
- `idx_notifications_created` on (created_at DESC)

### notification_preferences

User notification preferences.

| Column        | Type        | Constraints                           | Description                   |
| ------------- | ----------- | ------------------------------------- | ----------------------------- |
| preference_id | VARCHAR(50) | PRIMARY KEY                           | Preference identifier         |
| user_id       | VARCHAR(20) | NOT NULL, UNIQUE, FK → users(user_id) | User reference                |
| email_enabled | BOOLEAN     | NOT NULL DEFAULT true                 | Email notifications enabled   |
| sms_enabled   | BOOLEAN     | NOT NULL DEFAULT false                | SMS notifications enabled     |
| push_enabled  | BOOLEAN     | NOT NULL DEFAULT true                 | Push notifications enabled    |
| types         | TEXT[]      | NOT NULL                              | Notification types to receive |
| created_at    | TIMESTAMP   | NOT NULL DEFAULT NOW()                | Creation timestamp            |
| updated_at    | TIMESTAMP   | NOT NULL DEFAULT NOW()                | Update timestamp              |

---

## Audit & Logging

### audit_logs

Audit trail for compliance.

| Column      | Type        | Constraints            | Description                                |
| ----------- | ----------- | ---------------------- | ------------------------------------------ |
| log_id      | VARCHAR(50) | PRIMARY KEY            | Log identifier                             |
| user_id     | VARCHAR(20) | FK → users(user_id)    | User reference                             |
| action      | VARCHAR(50) | NOT NULL               | Action performed                           |
| entity_type | VARCHAR(50) | NOT NULL               | Entity type (order, inventory, user, etc.) |
| entity_id   | VARCHAR(50) | NOT NULL               | Entity identifier                          |
| old_values  | JSONB       |                        | Previous values                            |
| new_values  | JSONB       |                        | New values                                 |
| ip_address  | VARCHAR(45) |                        | IP address                                 |
| user_agent  | TEXT        |                        | User agent                                 |
| created_at  | TIMESTAMP   | NOT NULL DEFAULT NOW() | Timestamp                                  |

**Indexes:**

- `idx_audit_user` on (user_id)
- `idx_audit_action` on (action)
- `idx_audit_entity` on (entity_type, entity_id)
- `idx_audit_created` on (created_at DESC)

### state_changes

State change tracking for orders.

| Column      | Type        | Constraints            | Description              |
| ----------- | ----------- | ---------------------- | ------------------------ |
| change_id   | VARCHAR(50) | PRIMARY KEY            | Change identifier        |
| entity_type | VARCHAR(50) | NOT NULL               | Entity type              |
| entity_id   | VARCHAR(50) | NOT NULL               | Entity identifier        |
| from_state  | VARCHAR(50) | NOT NULL               | Previous state           |
| to_state    | VARCHAR(50) | NOT NULL               | New state                |
| changed_by  | VARCHAR(20) | FK → users(user_id)    | User who made the change |
| reason      | TEXT        |                        | Reason for change        |
| created_at  | TIMESTAMP   | NOT NULL DEFAULT NOW() | Timestamp                |

---

## Wave Picking

### wave_plans

Wave picking plan for batch order processing.

| Column       | Type         | Constraints                   | Description                                        |
| ------------ | ------------ | ----------------------------- | -------------------------------------------------- |
| wave_id      | VARCHAR(50)  | PRIMARY KEY                   | Wave plan identifier                               |
| wave_name    | VARCHAR(100) | NOT NULL                      | Wave name                                          |
| status       | VARCHAR(20)  | NOT NULL DEFAULT 'PENDING'    | Status (PENDING, RELEASED, IN_PROGRESS, COMPLETED) |
| priority     | INTEGER      | NOT NULL DEFAULT 0            | Priority level                                     |
| order_count  | INTEGER      | NOT NULL DEFAULT 0            | Number of orders                                   |
| total_items  | INTEGER      | NOT NULL DEFAULT 0            | Total items to pick                                |
| picked_items | INTEGER      | NOT NULL DEFAULT 0            | Items picked                                       |
| created_by   | VARCHAR(20)  | NOT NULL, FK → users(user_id) | Creator                                            |
| created_at   | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp                                 |
| released_at  | TIMESTAMP    |                               | Release timestamp                                  |
| started_at   | TIMESTAMP    |                               | Start timestamp                                    |
| completed_at | TIMESTAMP    |                               | Completion timestamp                               |

### wave_orders

Orders assigned to waves.

| Column        | Type        | Constraints                        | Description                          |
| ------------- | ----------- | ---------------------------------- | ------------------------------------ |
| wave_order_id | VARCHAR(50) | PRIMARY KEY                        | Assignment identifier                |
| wave_id       | VARCHAR(50) | NOT NULL, FK → wave_plans(wave_id) | Wave reference                       |
| order_id      | VARCHAR(50) | NOT NULL, FK → orders(order_id)    | Order reference                      |
| sequence      | INTEGER     | NOT NULL                           | Pick sequence within wave            |
| priority      | INTEGER     | NOT NULL                           | Order priority                       |
| assigned_to   | VARCHAR(20) | FK → users(user_id)                | Assigned picker                      |
| status        | VARCHAR(20) | NOT NULL DEFAULT 'PENDING'         | Status (PENDING, PICKING, COMPLETED) |
| created_at    | TIMESTAMP   | NOT NULL DEFAULT NOW()             | Creation timestamp                   |

**Indexes:**

- `idx_wave_orders_wave` on (wave_id)
- `idx_wave_orders_order` on (order_id)
- `idx_wave_orders_picker` on (assigned_to)
- `idx_wave_orders_status` on (status)

---

## Zone Picking

### zones

Warehouse zones for picking optimization.

| Column      | Type         | Constraints           | Description                         |
| ----------- | ------------ | --------------------- | ----------------------------------- |
| zone_id     | VARCHAR(20)  | PRIMARY KEY           | Zone identifier                     |
| zone_name   | VARCHAR(100) | NOT NULL              | Zone name                           |
| description | TEXT         |                       | Zone description                    |
| pick_method | VARCHAR(20)  | NOT NULL              | Pick method (DISCRETE, WAVE, BATCH) |
| priority    | INTEGER      | NOT NULL DEFAULT 0    | Zone priority                       |
| active      | BOOLEAN      | NOT NULL DEFAULT true | Zone active status                  |

### zone_assignments

Picker assignments to zones.

| Column        | Type        | Constraints                   | Description            |
| ------------- | ----------- | ----------------------------- | ---------------------- |
| assignment_id | VARCHAR(50) | PRIMARY KEY                   | Assignment identifier  |
| zone_id       | VARCHAR(20) | NOT NULL, FK → zones(zone_id) | Zone reference         |
| user_id       | VARCHAR(20) | NOT NULL, FK → users(user_id) | Picker reference       |
| assigned_at   | TIMESTAMP   | NOT NULL DEFAULT NOW()        | Assignment timestamp   |
| unassigned_at | TIMESTAMP   |                               | Unassignment timestamp |
| active        | BOOLEAN     | NOT NULL DEFAULT true         | Assignment active      |

---

## Recurring Schedules

### recurring_schedules

Automated scheduling for recurring tasks.

| Column          | Type         | Constraints                   | Description                             |
| --------------- | ------------ | ----------------------------- | --------------------------------------- |
| schedule_id     | VARCHAR(50)  | PRIMARY KEY                   | Schedule identifier                     |
| schedule_name   | VARCHAR(100) | NOT NULL                      | Schedule name                           |
| schedule_type   | VARCHAR(20)  | NOT NULL                      | Type (CYCLE_COUNT, REPORT, MAINTENANCE) |
| cron_expression | VARCHAR(100) | NOT NULL                      | Cron schedule expression                |
| parameters      | JSONB        | NOT NULL                      | Schedule parameters                     |
| enabled         | BOOLEAN      | NOT NULL DEFAULT true         | Schedule enabled status                 |
| last_run_at     | TIMESTAMP    |                               | Last execution timestamp                |
| next_run_at     | TIMESTAMP    |                               | Next execution timestamp                |
| created_by      | VARCHAR(20)  | NOT NULL, FK → users(user_id) | Creator                                 |
| created_at      | TIMESTAMP    | NOT NULL DEFAULT NOW()        | Creation timestamp                      |

---

## Integrations

### integrations

External system integrations.

| Column         | Type         | Constraints               | Description                      |
| -------------- | ------------ | ------------------------- | -------------------------------- |
| integration_id | VARCHAR(50)  | PRIMARY KEY               | Integration identifier           |
| name           | VARCHAR(100) | NOT NULL                  | Integration name                 |
| type           | VARCHAR(50)  | NOT NULL                  | Integration type                 |
| configuration  | JSONB        | NOT NULL                  | Integration configuration        |
| status         | VARCHAR(20)  | NOT NULL DEFAULT 'ACTIVE' | Status (ACTIVE, INACTIVE, ERROR) |
| last_sync_at   | TIMESTAMP    |                           | Last synchronization timestamp   |
| created_at     | TIMESTAMP    | NOT NULL DEFAULT NOW()    | Creation timestamp               |
| updated_at     | TIMESTAMP    | NOT NULL DEFAULT NOW()    | Update timestamp                 |

---

## Summary

**Total Tables:** 40+
**Total Indexes:** 100+
**Total Foreign Keys:** 50+

### Key Relationships

- `users` → `orders` (picker_id, packer_id)
- `users` → `cycle_count_plans` (count_by)
- `orders` → `order_items` (one-to-many)
- `orders` → `order_exceptions` (one-to-many)
- `skus` → `inventory_units` (one-to-many)
- `skus` → `bin_locations` (many-to-many via bin_locations field)
- `bin_locations` → `inventory_units` (one-to-many)
- `advance_shipping_notices` → `asn_line_items` (one-to-many)
- `receipts` → `receipt_line_items` (one-to-many)
- `receipt_line_items` → `putaway_tasks` (one-to-many)
- `orders` → `shipments` (one-to-one)

---

## Migration History

| Migration                                      | Description                  |
| ---------------------------------------------- | ---------------------------- |
| 001_create_custom_roles.sql                    | Custom roles and permissions |
| 006_add_sku_barcode.sql                        | SKU barcode support          |
| 008_create_audit_logs.sql                      | Audit logging                |
| 009_create_wave_picking.sql                    | Wave picking                 |
| 010_feature_flags.sql                          | Feature flags                |
| 011_add_notifications.sql                      | Notifications                |
| 012_create_business_rules.sql                  | Business rules engine        |
| 013_create_integrations.sql                    | Integrations                 |
| 014_create_reports.sql                         | Reports                      |
| 015_fix_cycle_count_column_length.sql          | Fix column length            |
| 016_variance_severity_config.sql               | Variance severity            |
| 017_recurring_count_schedules.sql              | Recurring schedules          |
| 018_root_cause_categories.sql                  | Root cause categories        |
| 019_variance_root_causes.sql                   | Variance root causes         |
| 020_add_active_role.sql                        | Active role support          |
| 021_add_barcode_to_skus.sql                    | Barcode column               |
| 022_add_cycle_count_variance_to_exceptions.sql | Cycle count variance         |
| 023_add_inbound_receiving.sql                  | Inbound receiving            |
| 024_add_order_exceptions.sql                   | Order exceptions             |
| 025_add_phase2_operational_excellence.sql      | Phase 2 features             |
| 026_add_rma_role.sql                           | RMA role                     |
| 027_add_shipping.sql                           | Shipping                     |
| 028_add_stock_control_tables.sql               | Stock control                |
| 029_add_stock_controller_role.sql              | Stock controller role        |
| 030_add_user_role_assignments.sql              | User role assignments        |
| 031_add_user_soft_delete.sql                   | User soft delete             |
| 032_add_current_view.sql                       | Current view tracking        |
| 033_add_last_viewed_at.sql                     | Last viewed tracking         |
| 034_add_picker_status.sql                      | Picker status                |
| 035_fix_order_exceptions_foreign_key.sql       | Fix foreign key              |
| 036_fix_state_change_id_generation.sql         | Fix state change ID          |
| 037_grant_all_roles_to_admin.sql               | Admin permissions            |
| 038_update_cycle_count_types.sql               | Update cycle count types     |

---

## Database Size Estimation

| Table                    | Estimated Rows | Size (with indexes) |
| ------------------------ | -------------- | ------------------- |
| users                    | 1,000          | ~500 KB             |
| orders                   | 100,000        | ~50 MB              |
| order_items              | 500,000        | ~100 MB             |
| skus                     | 50,000         | ~20 MB              |
| inventory_units          | 200,000        | ~60 MB              |
| inventory_transactions   | 2,000,000      | ~200 MB             |
| advance_shipping_notices | 10,000         | ~5 MB               |
| receipts                 | 20,000         | ~10 MB              |
| putaway_tasks            | 50,000         | ~15 MB              |
| cycle_count_plans        | 5,000          | ~2 MB               |
| cycle_count_entries      | 25,000         | ~10 MB              |
| shipments                | 100,000        | ~30 MB              |
| order_exceptions         | 5,000          | ~2 MB               |
| notifications            | 500,000        | ~100 MB             |
| audit_logs               | 10,000,000     | ~2 GB               |

**Total estimated size:** ~2.7 GB (excluding backups and logs)
