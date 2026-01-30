# Warehouse Picker Guide

## Overview

This guide explains how to use the Warehouse Management System (WMS) as a Picker. Pickers are responsible for retrieving items from bin locations and preparing them for packing.

---

## Table of Contents

1. [Logging In](#logging-in)
2. [Dashboard Overview](#dashboard-overview)
3. [Claiming Orders](#claiming-orders)
4. [Picking Items](#picking-items)
5. [Completing Picks](#completing-picks)
6. [Handling Exceptions](#handling-exceptions)
7. [Best Practices](#best-practices)

---

## Logging In

1. Open your web browser and navigate to the WMS URL
2. Enter your credentials:
   - **Email:** Your assigned email address
   - **Password:** Your secure password
3. Click **Sign In**

### First-Time Login

If this is your first time logging in:

1. You will be prompted to change your password
2. Create a strong password with:
   - At least 8 characters
   - Uppercase and lowercase letters
   - At least one number
   - At least one special character

---

## Dashboard Overview

After logging in, you will see the **Dashboard** which displays:

### Key Metrics

| Metric           | Description                                   |
| ---------------- | --------------------------------------------- |
| **Active Staff** | Number of pickers currently working           |
| **Orders/Hour**  | Current picking rate across all pickers       |
| **Queue Depth**  | Number of orders waiting to be picked         |
| **Exceptions**   | Number of active exceptions needing attention |

### Role Activity Card

Shows all active pickers with their:

- Current status (Picking, Idle, On Break)
- Orders assigned
- Items picked so far
- Progress percentage

---

## Claiming Orders

### Step 1: Navigate to Order Queue

1. Click **Order Queue** in the navigation menu
2. Review the list of available orders

### Step 2: Review Order Details

Each order displays:

- **Order ID** - Unique identifier
- **Customer Name** - Who the order is for
- **Priority Badge** - HIGH, NORMAL, or LOW priority
- **Status** - Current order status
- **Item Count** - Number of items to pick
- **Progress** - Completion percentage

### Step 3: Claim an Order

1. Find an available order (status: PENDING)
2. Click **Claim** on the order card
3. The order is now assigned to you

> **Note:** You can only work on one order at a time. Claim a new order after completing your current one.

---

## Picking Items

### Navigate to Picking Page

After claiming an order, you are automatically redirected to the Picking Page.

### Understanding the Pick List

The picking page displays:

| Section              | Description                                 |
| -------------------- | ------------------------------------------- |
| **Order Header**     | Order ID, customer name, total items        |
| **Pick List**        | Items to pick with locations and quantities |
| **Progress Bar**     | Visual progress indicator                   |
| **Zone Information** | Your assigned zone(s) for this order        |

### Picking Process

For each item in your pick list:

1. **Locate the Item**
   - Find the **Bin Location** (e.g., A-01-15)
   - Navigate to the physical location in the warehouse

2. **Scan the Item**
   - Scan the **SKU Barcode** using your handheld scanner
   - OR manually enter the SKU and click **Verify**

3. **Verify Quantity**
   - Confirm the **Quantity to Pick**
   - Count items carefully

4. **Confirm Pick**
   - Click **Confirm Pick** after verification
   - The item is marked as picked

5. **Move to Next Item**
   - The system automatically moves to the next item
   - Repeat steps 1-4 for all items

### Optimized Pick Path

The system displays items in **optimal picking order** to minimize walking distance:

- Items are grouped by zone
- Within each zone, items are ordered by proximity

Follow the pick order as displayed for maximum efficiency.

---

## Completing Picks

### Final Steps

After all items are picked:

1. **Review Summary**
   - Confirm all items are picked (100% progress)
   - Review the pick summary

2. **Complete Order**
   - Click **Complete Picking**
   - The order moves to the Packing Queue

3. **Claim Next Order**
   - Return to Order Queue
   - Claim your next order

---

## Handling Exceptions

### Common Exception Types

| Exception                 | Action                                   |
| ------------------------- | ---------------------------------------- |
| **Item Not Found**        | Item is not at the expected bin location |
| **Damaged Item**          | Item is damaged and cannot be picked     |
| **Insufficient Quantity** | Not enough items available at location   |
| **Wrong Item**            | Scanned item doesn't match expected SKU  |
| **Bin Location Empty**    | Bin location is empty                    |

### Reporting an Exception

1. While picking, click **Report Exception**
2. Select the **Exception Type**
3. Enter details:
   - **Description** - What happened
   - **Bin Location** - Where the issue occurred
   - **SKU** (if applicable) - The affected item
4. Click **Submit Exception**

The exception is routed to a supervisor for resolution.

### Continuing After Exception

After submitting an exception:

- The item is marked as **On Hold**
- You can continue picking remaining items
- A supervisor will resolve the exception and update the order

---

## Best Practices

### Efficiency Tips

1. **Follow the Pick Order**
   - Items are ordered to minimize travel time
   - Don't skip ahead unless directed

2. **Use Your Scanner**
   - Scanning is faster and more accurate than manual entry
   - Reduces typing errors

3. **Keep Your Area Organized**
   - Return empty carts to designated areas
   - Clear staging areas after completing picks

4. **Take Scheduled Breaks**
   - Click **Start Break** when going on break
   - Click **End Break** when returning
   - This helps track productivity accurately

### Accuracy Tips

1. **Always Verify SKUs**
   - SKUs can look similar (e.g., SKU-001 vs SKU-007)
   - Scan or double-check before confirming

2. **Count Carefully**
   - Verify quantities match the pick list
   - Report discrepancies immediately

3. **Check Item Condition**
   - Don't pick damaged items
   - Report quality issues promptly

### Safety Tips

1. **Use Proper Lifting Techniques**
   - Lift with your legs, not your back
   - Ask for help with heavy items

2. **Use Equipment Properly**
   - Follow equipment safety guidelines
   - Report damaged equipment immediately

3. **Stay Aware of Surroundings**
   - Watch for forklifts and other warehouse vehicles
   - Keep aisles clear

---

## Troubleshooting

### Issue: Cannot Claim Order

**Possible Causes:**

- Order already claimed by another picker
- You already have an active order

**Solution:**

- Complete your current order first
- Refresh the order queue

### Issue: Scanner Not Working

**Possible Causes:**

- Scanner not paired
- Battery depleted
- Bluetooth disconnected

**Solution:**

- Check scanner battery
- Re-pair scanner with your device
- Use manual SKU entry as backup

### Issue: Item Not Scanning

**Possible Causes:**

- Barcode damaged or unreadable
- Wrong item being scanned

**Solution:**

- Manually enter the SKU
- Verify you have the correct item
- Report barcode damage if needed

### Issue: Cannot Complete Order

**Possible Causes:**

- Not all items picked
- Active exceptions on order

**Solution:**

- Pick all remaining items
- Wait for supervisor to resolve exceptions

---

## Keyboard Shortcuts

| Shortcut | Action                        |
| -------- | ----------------------------- |
| `Enter`  | Confirm pick (after scanning) |
| `Esc`    | Cancel current action         |
| `F1`     | View pick list                |
| `F2`     | Report exception              |
| `F3`     | Toggle break status           |

---

## Support

### Contact Information

| Role                     | Contact                       |
| ------------------------ | ----------------------------- |
| **Floor Supervisor**     | On-site (radio extension 101) |
| **System Administrator** | admin@warehouse.com           |
| **IT Helpdesk**          | helpdesk@warehouse.com        |

### Additional Resources

- [Packer Guide](PACKER_GUIDE.md) - Understand the next step in the workflow
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Admin Guide](ADMIN_GUIDE.md) - For supervisors and managers

---

## Appendix: Warehouse Zones

### Zone Layout

| Zone  | Description            | Typical Items           |
| ----- | ---------------------- | ----------------------- |
| **A** | Fast-moving items      | High-volume SKUs        |
| **B** | Medium-moving items    | Regular stock           |
| **C** | Slow-moving items      | Low-volume SKUs         |
| **D** | Bulk items             | Large quantity items    |
| **E** | Hazardous materials    | Special handling items  |
| **F** | Temperature-controlled | Perishables, cold items |

### Zone Assignment

- Pickers are typically assigned to **1-2 zones**
- Stay within your assigned zones when possible
- Zone assignments are displayed on your dashboard

---

_Document Version: 1.0_
_Last Updated: January 2026_
_For questions or feedback, contact your Floor Supervisor_
