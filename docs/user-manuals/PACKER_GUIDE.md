# Warehouse Packer Guide

## Overview

This guide explains how to use the Warehouse Management System (WMS) as a Packer. Packers are responsible for packaging picked items for shipment, ensuring accuracy and quality.

---

## Table of Contents

1. [Logging In](#logging-in)
2. [Dashboard Overview](#dashboard-overview)
3. [Packing Queue](#packing-queue)
4. [Packing Process](#packing-process)
5. [Shipping Labels](#shipping-labels)
6. [Quality Checks](#quality-checks)
7. [Handling Issues](#handling-issues)
8. [Best Practices](#best-practices)

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
| **Active Staff** | Number of packers currently working           |
| **Orders/Hour**  | Current packing rate across all packers       |
| **Queue Depth**  | Number of orders waiting to be packed         |
| **Exceptions**   | Number of active exceptions needing attention |

### Role Activity Card

Shows all active packers with their:

- Current status (Packing, Idle, On Break)
- Orders packed today
- Items processed
- Progress tracking

---

## Packing Queue

### Navigate to Packing Queue

1. Click **Packing Queue** in the navigation menu
2. Review the list of orders ready for packing

### Understanding Queue Status

Orders in the packing queue display:

| Field               | Description                      |
| ------------------- | -------------------------------- |
| **Order ID**        | Unique order identifier          |
| **Customer Name**   | Who the order is for             |
| **Items**           | Number of items in the order     |
| **Picker**          | Who picked the order             |
| **Time Since Pick** | How long since picking completed |
| **Priority**        | Order priority level             |

### Order Priority

Orders are sorted by priority:

1. **HIGH** - Ship same day
2. **NORMAL** - Ship within 24 hours
3. **LOW** - Standard shipping

---

## Packing Process

### Step 1: Start Packing

1. Find an order in the **Packing Queue**
2. Click **Start Packing** on the order card
3. You are redirected to the Packing Page

### Step 2: Review Order

The Packing Page displays:

#### Order Information

- Order ID
- Customer name and shipping address
- Number of items
- Special instructions (if any)

#### Item List

- SKU for each item
- Product name
- Quantity
- Bin location (for reference)

#### Packing Options

- Package type selection
- Carrier selection
- Shipping method

### Step 3: Verify Items

Before packing, verify all items are present:

1. **Check Item Count**
   - Compare physical items to the item list
   - Confirm quantities match

2. **Inspect Item Condition**
   - Check for damage
   - Verify product integrity

3. **Report Any Issues**
   - Click **Report Issue** if problems found
   - Select issue type and provide details

### Step 4: Pack Items

1. **Select Package Type**
   - Choose appropriate box/envelope size
   - Options: Small Box, Medium Box, Large Box, Padded Envelope

2. **Package Items**
   - Place items in selected package
   - Add padding/protection as needed
   - Seal package securely

3. **Weigh Package**
   - Place package on scale
   - Enter weight (if not auto-detected)
   - Weight is used for shipping calculation

### Step 5: Generate Shipping Label

1. **Select Carrier**
   - Choose shipping carrier (FedEx, UPS, USPS, etc.)
   - Carrier options vary by order destination

2. **Select Service Level**
   - **Ground** - Standard shipping (3-5 days)
   - **Express** - Fast shipping (1-2 days)
   - **Overnight** - Next day delivery
   - **Economy** - Budget shipping (5-7 days)

3. **Generate Label**
   - Click **Generate Shipping Label**
   - Label is created and displayed

4. **Print Label**
   - Click **Print Label**
   - Label prints to designated printer
   - Attach label to package

### Step 6: Complete Packing

1. **Final Verification**
   - Confirm label is attached properly
   - Verify package is sealed

2. **Mark as Complete**
   - Click **Complete Packing**
   - Order moves to **Shipped** status
   - Package is ready for carrier pickup

3. **Place in Shipping Area**
   - Place package in designated shipping area
   - Organize by carrier for easy pickup

---

## Shipping Labels

### Label Information

Each shipping label includes:

| Information             | Description                    |
| ----------------------- | ------------------------------ |
| **Tracking Number**     | Unique tracking identifier     |
| **Barcode**             | Scannable barcode for tracking |
| **Destination Address** | Customer shipping address      |
| **Return Address**      | Warehouse return address       |
| **Service Level**       | Shipping speed/method          |
| **Weight**              | Package weight                 |
| **Postage**             | Postage indicator              |

### Label Placement

- Place label on the **largest flat surface** of the package
- Ensure label is **smooth and readable**
- **Do not cover** the barcode with tape
- Remove any old labels if reusing packaging

### Label Issues

| Issue                   | Solution                            |
| ----------------------- | ----------------------------------- |
| Label doesn't print     | Check printer connection, try again |
| Label is smudged        | Reprint the label                   |
| Wrong label printed     | Cancel current, generate new label  |
| Tracking number invalid | Contact supervisor                  |

---

## Quality Checks

### Pre-Packing Checklist

Before sealing the package:

- [ ] All items from the pick list are present
- [ ] Items are in good condition (no damage)
- [ ] Correct package size selected
- [ ] Items are properly protected/padded
- [ ] Special instructions followed (gift wrap, etc.)

### Post-Packing Checklist

Before marking complete:

- [ ] Package is securely sealed
- [ ] Shipping label is properly attached
- [ ] Label is readable and not damaged
- [ ] Package weight is accurate
- [ ] Package is in correct shipping area

---

## Handling Issues

### Common Issue Types

| Issue                       | Description                       | Action                              |
| --------------------------- | --------------------------------- | ----------------------------------- |
| **Missing Item**            | Item from pick list is not in bin | Report to supervisor, pause packing |
| **Damaged Item**            | Item is damaged                   | Report exception, do not ship       |
| **Wrong Item**              | Item doesn't match pick list      | Return to picker, report issue      |
| **Insufficient Packaging**  | Package is too small/flimsy       | Select larger package type          |
| **Label Generation Failed** | Cannot create shipping label      | Try again, contact IT if persists   |

### Reporting an Issue

1. Click **Report Issue** on the packing page
2. Select the **Issue Type**
3. Provide details:
   - **Description** - What happened
   - **Affected Items** - Which items are involved
   - **Photos** (optional) - Upload photos if applicable
4. Click **Submit Issue**

The issue is routed to a supervisor for resolution.

### After Reporting

- The order is marked as **On Hold**
- A supervisor will review and resolve
- You can continue with other orders
- Return to the held order after resolution

---

## Best Practices

### Efficiency Tips

1. **Work in Batches**
   - Pack multiple orders for the same carrier together
   - Reduces time switching between carriers

2. **Keep Your Area Organized**
   - Maintain clean packing stations
   - Return unused materials to storage
   - Clear completed packages promptly

3. **Use Packaging Materials Wisely**
   - Use appropriate size packages (don't over-pack)
   - Reuse packaging when safe to do so
   - Recycle materials properly

4. **Follow Shipping Guidelines**
   - Check carrier restrictions for certain items
   - Follow hazardous materials guidelines
   - Apply proper labeling for special items

### Accuracy Tips

1. **Double-Check Everything**
   - Verify item counts match pick list
   - Confirm shipping address is correct
   - Check that items match the order

2. **Package Securely**
   - Use enough padding to prevent damage
   - Seal packages completely
   - Protect fragile items individually

3. **Label Correctly**
   - Ensure labels are readable
   - Place labels in visible locations
   - Include any required special labels (fragile, etc.)

### Quality Tips

1. **Inspect Items Carefully**
   - Don't pack damaged items
   - Check expiration dates if applicable
   - Verify product integrity

2. **Follow Special Instructions**
   - Gift wrap when requested
   - Include promotional materials
   - Follow assembly instructions if included

---

## Troubleshooting

### Issue: Order Not Showing in Queue

**Possible Causes:**

- Order still being picked
- Order already assigned to another packer
- Order has exceptions

**Solution:**

- Refresh the packing queue
- Check order status in Order Queue
- Wait for picker to complete picking

### Issue: Cannot Generate Shipping Label

**Possible Causes:**

- Invalid shipping address
- Carrier service unavailable
- System connectivity issue

**Solution:**

- Verify shipping address format
- Try a different carrier
- Check internet connection
- Contact supervisor if issue persists

### Issue: Scale Not Reading Weight

**Possible Causes:**

- Scale not connected
- Package too heavy/light for scale
- Scale calibration issue

**Solution:**

- Check scale connection
- Re-calibrate scale if needed
- Enter weight manually as backup

### Issue: Printer Not Working

**Possible Causes:**

- Printer offline
- Out of paper/ink
- Network connectivity issue

**Solution:**

- Check printer status
- Reload paper/ink if needed
- Restart printer if necessary
- Use backup printer if available

---

## Package Types Reference

### Standard Boxes

| Type                | Dimensions      | Max Weight | Best For                  |
| ------------------- | --------------- | ---------- | ------------------------- |
| **Small Box**       | 8x6x4 inches    | 10 lbs     | 1-3 small items           |
| **Medium Box**      | 12x10x8 inches  | 20 lbs     | 3-6 items                 |
| **Large Box**       | 18x14x12 inches | 40 lbs     | 6+ items or bulky items   |
| **Extra Large Box** | 24x18x16 inches | 60 lbs     | Very large or heavy items |

### Envelopes and Mailers

| Type                   | Dimensions      | Max Weight | Best For                  |
| ---------------------- | --------------- | ---------- | ------------------------- |
| **Padded Envelope**    | 10x13 inches    | 3 lbs      | Single small items, books |
| **Poly Mailer**        | 12x15.5 inches  | 5 lbs      | Clothing, soft goods      |
| **Flat Rate Envelope** | 12.5x9.5 inches | 70 lbs     | Documents, flat items     |

---

## Keyboard Shortcuts

| Shortcut | Action                |
| -------- | --------------------- |
| `Enter`  | Confirm action        |
| `Esc`    | Cancel current action |
| `F1`     | View packing list     |
| `F2`     | Report issue          |
| `F3`     | Generate label        |
| `F4`     | Print label           |
| `F5`     | Complete packing      |

---

## Support

### Contact Information

| Role                     | Contact                       |
| ------------------------ | ----------------------------- |
| **Floor Supervisor**     | On-site (radio extension 102) |
| **System Administrator** | admin@warehouse.com           |
| **IT Helpdesk**          | helpdesk@warehouse.com        |

### Additional Resources

- [Picker Guide](PICKER_GUIDE.md) - Understand the picking process
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Admin Guide](ADMIN_GUIDE.md) - For supervisors and managers

---

## Appendix: Shipping Carriers

### Supported Carriers

| Carrier   | Services                      | Typical Use              |
| --------- | ----------------------------- | ------------------------ |
| **FedEx** | Ground, Express, Overnight    | Time-sensitive shipments |
| **UPS**   | Ground, Express, SurePost     | Standard shipping        |
| **USPS**  | Priority, First Class, Parcel | Small packages, economy  |
| **DHL**   | Express, International        | International shipments  |

### Carrier Selection Guidelines

- Use **Ground** for non-urgent domestic shipments
- Use **Express** for time-sensitive shipments (1-2 days)
- Use **Overnight** for urgent shipments
- Use **Economy** for cost-saving when time is not critical

---

_Document Version: 1.0_
_Last Updated: January 2026_
_For questions or feedback, contact your Floor Supervisor_
