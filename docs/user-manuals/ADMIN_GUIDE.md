# WMS Administrator Guide

## Overview

This guide explains how to administer the Warehouse Management System (WMS). Administrators and Supervisors have access to additional features for managing users, orders, inventory, and system configuration.

---

## Table of Contents

1. [Administrator Roles](#administrator-roles)
2. [Dashboard and Monitoring](#dashboard-and-monitoring)
3. [User Management](#user-management)
4. [Order Management](#order-management)
5. [Inventory Management](#inventory-management)
6. [Reports and Analytics](#reports-and-analytics)
7. [System Configuration](#system-configuration)
8. [Audit Logs](#audit-logs)
9. [Emergency Procedures](#emergency-procedures)

---

## Administrator Roles

### Role Hierarchy

| Role                 | Permissions                    | Responsibilities                                             |
| -------------------- | ------------------------------ | ------------------------------------------------------------ |
| **Admin**            | Full system access             | System configuration, user management, all operations        |
| **Supervisor**       | Warehouse operations oversight | Order assignment, exception handling, performance monitoring |
| **Stock Controller** | Inventory management           | Stock adjustments, cycle counts, replenishment               |
| **Inwards**          | Receiving operations           | ASN management, receipt processing, putaway                  |

### Admin vs Supervisor

| Feature          | Admin                           | Supervisor                |
| ---------------- | ------------------------------- | ------------------------- |
| User management  | Full (create, edit, deactivate) | View only                 |
| System settings  | Full access                     | Limited access            |
| Audit logs       | Full access                     | Full access               |
| Order operations | All                             | Claim, assign, override   |
| Inventory        | All adjustments                 | Adjustments with approval |

---

## Dashboard and Monitoring

### Dashboard Overview

The admin dashboard provides real-time visibility into warehouse operations:

#### Key Metrics

| Metric           | Description             | Action Threshold            |
| ---------------- | ----------------------- | --------------------------- |
| **Active Staff** | Current logged-in users | Monitor for staffing levels |
| **Orders/Hour**  | Processing rate         | Alert if below target       |
| **Queue Depth**  | Pending orders          | Investigate if > 50         |
| **Exceptions**   | Active exceptions       | Investigate if > 5          |

#### Real-Time Features

- **Live Updates**: Dashboard refreshes automatically via WebSocket
- **Role Activity**: See all active users and their current tasks
- **Throughput Charts**: Monitor picking/packing rates over time
- **Order Status Breakdown**: Visual distribution of order statuses

### Performance Monitoring

#### Staff Performance

Navigate to **Dashboard** and select **Performance Chart**:

- **Role Selection**: Picker, Packer, or Stock Controller
- **Time Range**: Daily, Weekly, Monthly, Yearly
- **Metrics Displayed**:
  - Tasks completed per user
  - Orders completed per user
  - Total items processed
  - Average time per task

#### Throughput Monitoring

Use the **Throughput Chart** to track:

- Orders picked/packed over time
- Identify peak hours and slow periods
- Plan staffing accordingly

### Alerts and Notifications

The system generates alerts for:

| Alert Type              | Trigger                | Action                     |
| ----------------------- | ---------------------- | -------------------------- |
| **Low Stock**           | Item below threshold   | Review replenishment needs |
| **High Exception Rate** | Exception spike        | Investigate process issues |
| **Staff Shortage**      | Too few active users   | Adjust staffing            |
| **Stalled Orders**      | Orders not progressing | Reassign or investigate    |

---

## User Management

### Accessing User Management

1. Click **User Roles** in the navigation menu
2. View all system users

### User List Information

| Field          | Description            |
| -------------- | ---------------------- |
| **Name**       | User's full name       |
| **Email**      | Login email address    |
| **Role**       | Assigned role          |
| **Status**     | Active/Inactive        |
| **Last Login** | Most recent login time |

### Creating a New User

1. Click **Add User**
2. Fill in user information:
   - **Name**: Full name
   - **Email**: Unique email address
   - **Role**: Select from dropdown
   - **Password**: Temporary password (user changes on first login)
3. Click **Create User**

### Editing a User

1. Find the user in the list
2. Click **Edit** next to the user
3. Modify allowed fields:
   - Name
   - Role
   - Status (Active/Inactive)
4. Click **Save Changes**

### Deactivating a User

1. Find the user in the list
2. Click **Deactivate**
3. Confirm deactivation

> **Note:** Deactivated users cannot log in but their historical data is preserved.

### Resetting User Passwords

1. Find the user in the list
2. Click **Reset Password**
3. Enter new temporary password
4. User will be required to change on next login

---

## Order Management

### Order Queue Overview

Navigate to **Order Queue** to see all orders:

| Status        | Description                        | Admin Actions           |
| ------------- | ---------------------------------- | ----------------------- |
| **PENDING**   | Waiting to be picked               | Claim, assign, cancel   |
| **PICKING**   | Currently being picked             | View progress, reassign |
| **PICKED**    | Picking complete, awaiting packing | Expedite packing        |
| **PACKING**   | Being packed                       | View progress           |
| **SHIPPED**   | Shipped                            | View tracking info      |
| **CANCELLED** | Cancelled                          | View reason             |

### Admin View of All Orders

Access the **Admin Orders Modal** from the Dashboard:

1. Click the **Queue Depth** metric card
2. View all orders in the system
3. Search and filter orders
4. Click **Live View** on picking orders to see real-time progress

### Assigning Orders

1. Navigate to **Order Queue**
2. Find a pending order
3. Click **Assign**
4. Select a picker from the list
5. Click **Confirm Assignment**

### Reassigning Orders

If a picker is unavailable:

1. Find the assigned order
2. Click **Reassign**
3. Select a different picker
4. The original picker is notified of reassignment

### Order Priority Management

Change order priority:

1. Click on an order
2. Select **Change Priority**
3. Choose new priority: HIGH, NORMAL, LOW
4. Click **Confirm**

### Cancelling Orders

1. Find the order
2. Click **Cancel Order**
3. Provide cancellation reason
4. Click **Confirm Cancellation**

### Handling Stalled Orders

Orders that haven't progressed may be stalled:

**Detection:**

- Order in PICKING status for > 2 hours
- Order in PACKING status for > 1 hour

**Actions:**

1. Contact the assigned user
2. Reassign if necessary
3. Report any system issues

---

## Inventory Management

### Stock Dashboard

Navigate to **Stock Control** for inventory overview:

#### Dashboard Metrics

| Metric              | Description                    |
| ------------------- | ------------------------------ |
| **Total SKUs**      | Number of unique products      |
| **Total Items**     | Total quantity across all SKUs |
| **Low Stock Items** | Items below reorder threshold  |
| **Cycle Counts**    | Active and completed counts    |

### Stock Adjustments

#### Making an Adjustment

1. Click **Stock Adjustments**
2. Click **New Adjustment**
3. Enter:
   - **SKU** or scan barcode
   - **Bin Location**
   - **Adjustment Type** (Add, Remove, Transfer)
   - **Quantity**
   - **Reason** (Damage, Loss, Found, Correction)
4. Click **Submit**

#### Adjustment Types

| Type         | Use Case            | Approval Required    |
| ------------ | ------------------- | -------------------- |
| **Add**      | Found missing items | No                   |
| **Remove**   | Damaged/lost items  | Yes (for > 10 items) |
| **Transfer** | Move between bins   | No                   |

### Cycle Counts

#### Starting a Cycle Count

1. Navigate to **Cycle Counting**
2. Click **New Count**
3. Select count type:
   - **Blanket** - Count entire zone
   - **ABC Analysis** - High-value items
   - **Spot Check** - Random sample
   - **Bin-Specific** - Single bin
4. Select zone/bin
5. Assign to stock controller
6. Click **Start Count**

#### Reviewing Count Results

1. Find the completed count
2. Click **Review**
3. View variances:
   - **Expected Quantity** vs **Actual Count**
   - **Variance Amount** and **Percentage**
   - **Value Impact**
4. Approve or request recount

#### Variance Thresholds

| Variance % | Action                 |
| ---------- | ---------------------- |
| 0-2%       | Auto-approve           |
| 2-5%       | Supervisor review      |
| >5%        | Investigation required |

### Low Stock Management

#### Viewing Low Stock Items

1. Navigate to **Stock Control**
2. Click **Low Stock Alerts**
3. Filter by severity:
   - **Critical** - Out of stock
   - **Warning** - Below reorder point
   - **Notice** - Approaching reorder point

#### Reorder Management

For each low stock item:

1. Click **Create Reorder**
2. Enter reorder quantity
3. Select supplier
4. Click **Submit**

---

## Reports and Analytics

### Available Reports

Navigate to **Reports** to access:

#### Inventory Reports

| Report                  | Description                 | Export Options  |
| ----------------------- | --------------------------- | --------------- |
| **Stock Status**        | Current inventory levels    | PDF, CSV, Excel |
| **Low Stock Report**    | Items below threshold       | PDF, CSV, Excel |
| **Cycle Count Summary** | Count results and variances | PDF, CSV, Excel |
| **Transaction History** | All inventory movements     | CSV, Excel      |

#### Performance Reports

| Report                  | Description                   | Export Options |
| ----------------------- | ----------------------------- | -------------- |
| **Staff Performance**   | Individual and team metrics   | PDF, Excel     |
| **Throughput Analysis** | Orders/hour over time         | PDF, Excel     |
| **Exception Report**    | Exception types and frequency | PDF, CSV       |
| **Order Fulfillment**   | Order cycle time analysis     | PDF, Excel     |

#### Shipping Reports

| Report                  | Description                      | Export Options |
| ----------------------- | -------------------------------- | -------------- |
| **Shipment Summary**    | Daily/weekly shipments           | PDF, CSV       |
| **Carrier Performance** | Transit times by carrier         | PDF, Excel     |
| **Shipping Costs**      | Cost analysis by carrier/service | Excel          |

### Generating Reports

1. Select report type
2. Set date range
3. Apply filters (optional)
4. Click **Generate Report**
5. View online or export

### Scheduled Reports

Automate recurring reports:

1. Click **Scheduled Reports**
2. Click **Add Schedule**
3. Configure:
   - Report type
   - Frequency (Daily, Weekly, Monthly)
   - Recipients (email addresses)
   - Export format
4. Click **Save Schedule**

---

## System Configuration

### Business Rules

Navigate to **Business Rules** to configure:

#### Order Assignment Rules

| Rule                  | Description                     | Options                             |
| --------------------- | ------------------------------- | ----------------------------------- |
| **Auto-Assign**       | Automatically assign orders     | On/Off                              |
| **Assignment Method** | How orders are assigned         | Round-robin, Least busy, Zone-based |
| **Priority Handling** | How priority orders are handled | Queue first, Assign immediately     |

#### Inventory Rules

| Rule                      | Description              | Options                         |
| ------------------------- | ------------------------ | ------------------------------- |
| **Low Stock Threshold**   | When to alert            | Percentage or absolute quantity |
| **Auto-Reorder**          | Automatically create POs | On/Off                          |
| **Cycle Count Frequency** | How often to count       | Days, Weeks, Months             |

#### Picking Rules

| Rule                       | Description                  | Options                         |
| -------------------------- | ---------------------------- | ------------------------------- |
| **Pick Path Optimization** | Route calculation method     | Zone-based, Aisle-based, Custom |
| **Batch Picking**          | Allow multiple orders        | On/Off                          |
| **Max Orders Per Picker**  | Limit concurrent assignments | 1-5                             |

### Feature Flags

Enable/disable system features:

| Feature                 | Description              | Default |
| ----------------------- | ------------------------ | ------- |
| **Real-time Updates**   | WebSocket live updates   | On      |
| **Barcode Scanning**    | Scanner integration      | On      |
| **Email Notifications** | Email alerts             | On      |
| **Audit Logging**       | Track all changes        | On      |
| **API Access**          | External API connections | Off     |

### Integrations

Configure third-party integrations:

1. Navigate to **Integrations**
2. Select integration type:
   - **Carriers** - FedEx, UPS, USPS
   - **Suppliers** - Purchase order automation
   - **Analytics** - Business intelligence tools
3. Enter API credentials
4. Test connection
5. Click **Enable**

---

## Audit Logs

### Accessing Audit Logs

1. Navigate to **Dashboard**
2. Click **Audit Logs** tab
3. View system activity

### Audit Log Filters

| Filter            | Description                                       |
| ----------------- | ------------------------------------------------- |
| **Date Range**    | Activity within time period                       |
| **Category**      | Type of activity (Orders, Inventory, Users, etc.) |
| **Action**        | Specific action (Create, Update, Delete, etc.)    |
| **User**          | Activity by specific user                         |
| **Resource Type** | Type of resource affected                         |

### Audit Log Entry

Each entry displays:

| Field          | Description                 |
| -------------- | --------------------------- |
| **Timestamp**  | When the action occurred    |
| **User**       | Who performed the action    |
| **Action**     | What was done               |
| **Resource**   | What was affected           |
| **Details**    | Additional information      |
| **IP Address** | Where the action originated |

### Exporting Audit Logs

1. Apply desired filters
2. Click **Export**
3. Select format (CSV, Excel)
4. Download file

---

## Emergency Procedures

### System Outage

#### Detection

- Users cannot log in
- Orders not processing
- Real-time updates stop

#### Actions

1. **Verify Outage**
   - Check multiple users
   - Test different functions

2. **Notify IT**
   - Contact system administrator
   - Document affected functions

3. **Switch to Manual**
   - Use paper pick lists
   - Record transactions manually
   - Enter data when system restored

### Data Corruption

#### Detection

- Inconsistent inventory counts
- Missing orders
- Incorrect calculations

#### Actions

1. **Stop Operations**
   - Pause all non-essential activities
   - Preserve current state

2. **Contact IT**
   - Report symptoms immediately
   - Provide recent activity logs

3. **Restore from Backup**
   - IT will restore from last known good state
   - Re-enter transactions since backup

### Security Breach

#### Detection

- Suspicious user activity
- Unauthorized access attempts
- Data exfiltration indicators

#### Actions

1. **Contain**
   - Change affected passwords
   - Revoke suspicious sessions
   - Disable compromised accounts

2. **Investigate**
   - Review audit logs
   - Identify affected data
   - Document timeline

3. **Notify**
   - Contact security team
   - Alert management
   - Report if customer data affected

### Performance Degradation

#### Detection

- Slow page loads
- Timeout errors
- Unresponsive interface

#### Actions

1. **Assess Impact**
   - Determine affected users
   - Identify slow functions

2. **Temporary Measures**
   - Reduce user load
   - Disable non-essential features
   - Switch to simplified views

3. **Long-term Fix**
   - Contact IT for investigation
   - Consider scaling resources

---

## Keyboard Shortcuts

| Shortcut | Action                |
| -------- | --------------------- |
| `Ctrl+D` | Navigate to Dashboard |
| `Ctrl+O` | Open Order Queue      |
| `Ctrl+I` | Open Inventory        |
| `Ctrl+R` | Open Reports          |
| `Ctrl+U` | Open User Management  |
| `Ctrl+A` | Open Audit Logs       |
| `Esc`    | Close modal/dialog    |
| `F5`     | Refresh current view  |

---

## Support and Resources

### Contact Information

| Issue             | Contact                |
| ----------------- | ---------------------- |
| **System Issues** | admin@warehouse.com    |
| **IT Support**    | helpdesk@warehouse.com |
| **Training**      | training@warehouse.com |

### Additional Documentation

- [Picker Guide](PICKER_GUIDE.md) - Share with new pickers
- [Packer Guide](PACKER_GUIDE.md) - Share with new packers
- [Cycle Count Guide](CYCLE_COUNT_GUIDE.md) - Inventory counting procedures
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Configuration Guide](../CONFIGURATION.md) - Technical configuration
- [Deployment Guide](../DEPLOYMENT.md) - System setup and maintenance

---

## Appendix: Common Admin Tasks

### Daily Tasks

- [ ] Review overnight exceptions
- [ ] Check low stock alerts
- [ ] Monitor staff performance
- [ ] Review yesterday's reports

### Weekly Tasks

- [ ] Run performance reports
- [ ] Review cycle count results
- [ ] Update business rules as needed
- [ ] Train new users

### Monthly Tasks

- [ ] Full inventory review
- [ ] Generate management reports
- [ ] Review and update thresholds
- [ ] System backup verification

---

_Document Version: 1.0_
_Last Updated: January 2026_
_For technical support, contact admin@warehouse.com_
