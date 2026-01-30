# Cycle Count Guide

## Overview

This guide explains how to perform cycle counts in the Warehouse Management System (WMS). Cycle counts are essential for maintaining inventory accuracy and identifying discrepancies.

---

## Table of Contents

1. [What is Cycle Counting?](#what-is-cycle-counting)
2. [Cycle Count Types](#cycle-count-types)
3. [Preparation](#preparation)
4. [Performing a Count](#performing-a-count)
5. [Reconciling Variances](#reconciling-variances)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## What is Cycle Counting?

### Definition

A cycle count is an inventory auditing procedure where a small subset of inventory is counted on a specific day, rather than counting all inventory at once (physical inventory).

### Benefits

| Benefit                    | Description                               |
| -------------------------- | ----------------------------------------- |
| **Accuracy**               | Catches discrepancies early               |
| **Efficiency**             | Less disruptive than full physical counts |
| **Continuous Improvement** | Identifies process issues                 |
| **Cost Savings**           | Reduces stockouts and overstocks          |
| **Customer Service**       | Ensures stock availability                |

### When to Perform Cycle Counts

| Trigger               | Action                                      |
| --------------------- | ------------------------------------------- |
| **Scheduled**         | Regular cycle counts per ABC classification |
| **Discrepancy Found** | After shipping/receiving errors             |
| **High-Value Items**  | Frequent counts for expensive items         |
| **Fast-Movers**       | Regular counts for high-volume items        |
| **System Issues**     | After system outages or data issues         |

---

## Cycle Count Types

### Blanket Count

**Description:** Count all items in a specified zone or area.

**When to Use:**

- Quarterly or semi-annual zone counts
- After significant inventory movements
- When accuracy is critical in an area

**Process:**

1. Select zone (e.g., Zone A)
2. System generates count list for all bins in zone
3. Count each bin systematically
4. Enter quantities for each SKU

**Time Required:** 2-4 hours per zone

### ABC Analysis Count

**Description:** Count items based on ABC classification.

| Class | Description                                            | Count Frequency |
| ----- | ------------------------------------------------------ | --------------- |
| **A** | High-value/fast-moving (top 20% items, 80% value)      | Monthly         |
| **B** | Medium-value/medium-moving (next 30% items, 15% value) | Quarterly       |
| **C** | Low-value/slow-moving (remaining 50% items, 5% value)  | Annually        |

**When to Use:**

- Regularly scheduled counts
- Focus on high-impact items
- Optimize counting resources

**Time Required:** 1-2 hours per class

### Spot Check

**Description:** Random sample of bins or SKUs.

**When to Use:**

- Quick accuracy verification
- Suspected theft or loss
- Training new counters

**Process:**

1. System randomly selects bins/SKUs
2. Count selected items only
3. Results indicate overall accuracy trends

**Time Required:** 30 minutes - 1 hour

### Bin-Specific Count

**Description:** Count all items in a specific bin location.

**When to Use:**

- After receiving putaway
- After picking activity
- After reported discrepancy

**Process:**

1. Enter specific bin location (e.g., A-01-15)
2. Count all items in that bin
3. Verify each SKU quantity

**Time Required:** 5-15 minutes per bin

### Receiving Count

**Description:** Count items during inbound receiving process.

**When to Use:**

- Verifying supplier shipments
- Recording receiving discrepancies
- Initial stock placement

**Process:**

1. Count items from each shipment
2. Compare to ASN/packing list
3. Record variances immediately

**Time Required:** Integrated with receiving process

### Shipping Count

**Description:** Count items before shipping.

**When to Use:**

- High-value orders
- Customer accuracy requirements
- Quality control verification

**Process:**

1. Count items in packed order
2. Verify against pick list
3. Confirm before shipping

**Time Required:** Integrated with packing process

### Ad-Hoc Count

**Description:** Unscheduled count for specific reasons.

**When to Use:**

- Investigating discrepancies
- Requested by management
- After system issues

**Process:**

1. Select specific bins/SKUs to count
2. Perform count immediately
3. Report findings

**Time Required:** Varies by scope

---

## Preparation

### Before Starting a Count

#### 1. Gather Equipment

- [ ] Handheld scanner (fully charged)
- [ ] Count sheets (printed, if needed)
- [ ] Pen/pencil for notes
- [ ] Calculator (if needed)
- [ ] Safety equipment (if in active areas)

#### 2. Review Count Information

- [ ] Understand count type
- [ ] Review zone/bin locations
- [ ] Check for special instructions
- [ ] Note any hazardous materials

#### 3. Prepare the Area

- [ ] Notify affected staff
- [ ] Clear access to bins
- [ ] Pause picking in count area (if required)
- [ ] Ensure adequate lighting

#### 4. Verify System Status

- [ ] Confirm device connection
- [ ] Check battery levels
- [ ] Open WMS to Cycle Counting page
- [ ] Verify count assignment

---

## Performing a Count

### Step 1: Start the Count

1. Navigate to **Cycle Counting** page
2. Find your assigned count
3. Click **Start Count**
4. Review the count list

### Step 2: Count Systematically

For each bin location:

1. **Locate the Bin**
   - Navigate to the bin location
   - Verify bin label matches system

2. **Scan the Bin Barcode** (if available)
   - Ensures you're at the correct location
   - System displays expected items

3. **Count Each SKU**
   - Remove items from bin (if safe to do so)
   - Count all quantities of each SKU
   - Check behind/under other items
   - Look for items on shelves above/below

4. **Record the Count**
   - Scan SKU barcode (preferred)
   - OR manually enter SKU
   - Enter actual counted quantity
   - Click **Confirm**

5. **Note Any Issues**
   - Damaged items
   - Unlabeled items
   - Items in wrong bin
   - Obstructed access

### Step 3: Handle Variances

If counted quantity differs from expected:

1. **Recount**
   - Count the items again
   - Verify you haven't missed or double-counted
   - Check for hidden items

2. **Check Nearby Bins**
   - Look for items that may have been misplaced
   - Check adjacent bins for same SKU

3. **Record Discrepancy**
   - Enter the actual counted quantity
   - Add notes about what you found
   - Take photos if items are damaged/misplaced

### Step 4: Complete the Count

1. **Verify All Items Counted**
   - Ensure all bins/SKUs are completed
   - Check for skipped items

2. **Submit Count**
   - Click **Submit Count**
   - System calculates variances
   - Count moves to "Pending Review" status

3. **Clean Up**
   - Return items to proper bins
   - Dispose of any trash
   - Report any safety hazards

---

## Reconciling Variances

### Understanding Variance Reports

After submitting a count, the system generates a variance report:

| Column           | Description                       |
| ---------------- | --------------------------------- |
| **SKU**          | Item identifier                   |
| **Description**  | Product name                      |
| **Bin Location** | Where item is located             |
| **Expected Qty** | System quantity                   |
| **Counted Qty**  | Your counted quantity             |
| **Variance**     | Difference (positive or negative) |
| **Variance %**   | Percentage difference             |
| **Value Impact** | Financial impact of variance      |

### Variance Thresholds

| Variance % | Action Required                                       |
| ---------- | ----------------------------------------------------- |
| **0%**     | Perfect count - auto-approve                          |
| **1-2%**   | Minor variance - supervisor approval                  |
| **3-5%**   | Moderate variance - investigation needed              |
| **>5%**    | Major variance - full investigation, possible recount |

### Investigating Variances

#### Common Causes

| Cause                 | Positive Variance        | Negative Variance               |
| --------------------- | ------------------------ | ------------------------------- |
| **Receiving Error**   | Extra items received     | Items not received              |
| **Packing Error**     | Items not shipped        | Extra items shipped             |
| **Transaction Error** | Adjustment not recorded  | Adjustment overstated           |
| **Theft**             | -                        | Items stolen                    |
| **Damage**            | -                        | Items damaged/discarded         |
| **Misplaced**         | Items found in wrong bin | Items not found in expected bin |
| **Counting Error**    | Double-counted           | Missed items                    |

#### Investigation Steps

1. **Review Transaction History**
   - Check recent receipts and shipments
   - Review adjustments
   - Look for unrecorded transactions

2. **Check Adjacent Bins**
   - Items may be in nearby bins
   - Look for same SKU in neighboring locations

3. **Verify System Records**
   - Check for data entry errors
   - Review recent cycle counts for same location

4. **Interview Staff**
   - Talk to pickers/packers who worked the area
   - Ask about any issues they noticed

5. **Document Findings**
   - Record investigation results
   - Note any corrective actions needed

### Correcting Variances

After investigation:

#### Accept the Count

If variance is explained and reasonable:

1. Click **Approve Count**
2. System updates inventory to counted quantity
3. Variance is recorded in audit log

#### Recount Required

If variance cannot be explained:

1. Click **Request Recount**
2. Assign to different counter (if possible)
3. Perform count again
4. Compare results

#### Adjust Inventory

If variance is confirmed:

1. Click **Create Adjustment**
2. Enter adjustment reason
3. System updates inventory
4. Adjustment is recorded for reporting

---

## Best Practices

### Counting Techniques

#### 1. Two-Person Count Method

For high-value or critical items:

- First person counts and records
- Second person recounts independently
- Compare results
- Investigate differences

#### 2. Bin-to-Bin Method

- Count one bin completely before moving to next
- Reduces chance of missing items
- More organized approach

#### 3. Zone-by-Zone Method

- Count all items in one zone before moving to next
- Efficient for blanket counts
- Minimizes travel time

### Accuracy Tips

1. **Always Recount Variances**
   - First count may have errors
   - Second count confirms discrepancy

2. **Minimize Distractions**
   - Avoid counting during busy periods
   - Focus on the task at hand

3. **Use Technology**
   - Scan when possible (more accurate)
   - Use handheld devices (real-time validation)

4. **Document Everything**
   - Note unusual findings
   - Report bin location issues
   - Record damaged items

5. **Follow the Count List**
   - Don't skip items
   - Count in systematic order
   - Verify all items are counted

### Efficiency Tips

1. **Plan Your Route**
   - Organize counts to minimize walking
   - Group nearby bins together

2. **Count During Slow Periods**
   - Avoid peak picking times
   - Less interference with operations

3. **Use Pre-Printed Count Sheets**
   - Faster than using devices for some
   - Can prepare ahead of time

4. **Work in Pairs**
   - One counts, one records
   - Reduces errors and saves time

### Safety Tips

1. **Use Proper Equipment**
   - Ladders for high shelves
   - Carts for heavy items
   - Safety gear as required

2. **Stay Alert**
   - Watch for forklifts and other vehicles
   - Keep aisles clear
   - Report hazards immediately

3. **Don't Rush**
   - Accuracy is more important than speed
   - Take breaks to stay fresh

---

## Troubleshooting

### Issue: Can't Find Expected Item

**Possible Causes:**

- Item was never put away
- Item is in a different bin
- Item was picked/shipped but not recorded
- Item is misplaced in warehouse

**Solutions:**

1. Check adjacent bins
2. Review recent transactions
3. Check if item is on order
4. Report as missing item

### Issue: Found Items Not on Count List

**Possible Causes:**

- Items were never added to system
- Items are from a different bin
- Items are new stock not yet recorded
- Items are returns not processed

**Solutions:**

1. Note the SKU and quantity
2. Do not include in current count
3. Report findings to supervisor
4. Create new item records if needed

### Issue: Scanner Not Working

**Possible Causes:**

- Battery depleted
- Not paired to device
- Barcode damaged/unreadable

**Solutions:**

1. Replace/recharge battery
2. Re-pair scanner
3. Enter SKU manually as backup

### Issue: High Variance Across Many Items

**Possible Causes:**

- System data corruption
- Recent unrecorded transactions
- Process issues in receiving/shipping
- Training issue with counter

**Solutions:**

1. Stop counting
2. Report to supervisor immediately
3. Investigate system and process issues
4. May need to postpone count

---

## Cycle Count Schedule

### Recommended Schedule

| Frequency         | Count Type  | Items to Count               |
| ----------------- | ----------- | ---------------------------- |
| **Daily**         | Spot Check  | 5-10 random SKUs             |
| **Weekly**        | Fast Movers | Top 50 items by velocity     |
| **Monthly**       | Class A     | High-value/fast-moving items |
| **Quarterly**     | Class B     | Medium-value items           |
| **Semi-Annually** | Class C     | Low-value/slow-moving items  |
| **Annually**      | Blanket     | Full warehouse count         |

### Tracking Your Progress

Use the **Cycle Counting** page to:

- View assigned counts
- See count history
- Track variance trends
- Monitor completion rates

---

## Reports and Analytics

### Available Reports

Navigate to **Reports** > **Cycle Count Reports**:

| Report                | Description                   | Use For                    |
| --------------------- | ----------------------------- | -------------------------- |
| **Count Summary**     | Results of completed counts   | Overview of count activity |
| **Variance Analysis** | Detailed variance information | Identifying problem areas  |
| **Accuracy Trends**   | Accuracy over time            | Measuring improvement      |
| **ABC Compliance**    | Count frequency by class      | Ensuring proper coverage   |

### Using Reports for Improvement

1. **Identify Problem Areas**
   - Bins with frequent variances
   - SKUs that are consistently off
   - Zones with accuracy issues

2. **Address Root Causes**
   - Process improvements
   - Additional training
   - System corrections

3. **Track Progress**
   - Monitor accuracy trends
   - Measure improvement over time
   - Adjust count frequency as needed

---

## Support Resources

### Additional Documentation

- [Admin Guide](ADMIN_GUIDE.md) - Supervisor functions and approvals
- [Picker Guide](PICKER_GUIDE.md) - Picking process context
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues

### Contacts

| Issue                       | Contact                     |
| --------------------------- | --------------------------- |
| **Count Assignment Issues** | Stock Controller Supervisor |
| **System Problems**         | IT Helpdesk                 |
| **Process Questions**       | Warehouse Manager           |

---

## Appendix: Cycle Count Checklist

### Before Count

- [ ] Count assigned and visible in system
- [ ] Equipment gathered and ready
- [ ] Area prepared for counting
- [ ] Staff notified of count activity

### During Count

- [ ] Each bin located accurately
- [ ] Each item counted carefully
- [ ] All variances recounted
- [ ] Issues documented thoroughly

### After Count

- [ ] Count submitted in system
- [ ] Variance report reviewed
- [ ] Findings documented
- [ ] Area returned to normal

---

_Document Version: 1.0_
_Last Updated: January 2026_
_For questions, contact your Stock Controller Supervisor_
