# WMS Troubleshooting Guide

## Overview

This guide helps you resolve common issues with the Warehouse Management System (WMS). Problems are organized by category with step-by-step solutions.

---

## Table of Contents

1. [Login Issues](#login-issues)
2. [Performance Issues](#performance-issues)
3. [Order Issues](#order-issues)
4. [Inventory Issues](#inventory-issues)
5. [Scanning Issues](#scanning-issues)
6. [Printing Issues](#printing-issues)
7. [WebSocket/Real-time Issues](#websocketreal-time-issues)
8. [Mobile Device Issues](#mobile-device-issues)
9. [System Errors](#system-errors)
10. [Contacting Support](#contacting-support)

---

## Login Issues

### Issue: Cannot Log In

**Symptoms:**
- "Invalid credentials" error
- Page reloads after login attempt
- Login button doesn't respond

**Solutions:**

#### 1. Verify Credentials
- Check email spelling
- Verify password is correct
- Check for extra spaces in email/password
- Try copying and pasting credentials

#### 2. Reset Password
1. Click **Forgot Password** on login page
2. Enter your email address
3. Check email for reset link
4. Create new password

#### 3. Clear Browser Cache
1. Open browser settings
2. Clear browsing data/cache
3. Restart browser
4. Try logging in again

#### 4. Try Different Browser
- Chrome, Firefox, Edge, Safari
- Identifies if issue is browser-specific

#### 5. Check Account Status
- Contact supervisor to verify account is active
- Account may be deactivated if not used recently

### Issue: Account Locked

**Symptoms:**
- "Account locked" message
- Too many failed login attempts

**Solutions:**

1. **Wait 15 Minutes**
   - Account automatically unlocks after 15 minutes
   - Then try logging in again

2. **Contact Supervisor**
   - Supervisor can manually unlock account
   - Supervisor can verify it's you

3. **Reset Password**
   - Use "Forgot Password" link
   - Creating new password may unlock account

### Issue: "Session Expired" Error

**Symptoms:**
- Logged out unexpectedly
- "Session expired" message

**Solutions:**

1. **Log In Again**
   - Normal behavior after inactivity
   - Session timeout is 8 hours by default

2. **Check Network Connection**
   - Unstable connection can cause session loss
   - Ensure stable internet connection

---

## Performance Issues

### Issue: Slow Page Loads

**Symptoms:**
- Pages take more than 5 seconds to load
- Images load slowly
- Charts/graphs take long to render

**Solutions:**

#### 1. Check Internet Speed
- Run speed test (speedtest.net)
- Minimum recommended: 10 Mbps download
- Contact IT if below threshold

#### 2. Close Other Browser Tabs
- Too many tabs can slow browser
- Keep only WMS tabs open

#### 3. Clear Browser Cache
1. Open browser settings
2. Clear cached images and files
3. Restart browser

#### 4. Disable Browser Extensions
- Extensions can slow page loads
- Try incognito/private mode (extensions disabled)

#### 5. Update Browser
- Ensure browser is latest version
- Older versions may be slower

### Issue: Page Freezes or Hangs

**Symptoms:**
- Page becomes unresponsive
- Clicking has no effect
- Loading spinner never stops

**Solutions:**

1. **Refresh the Page**
   - Press F5 or Ctrl+R
   - Reloads the current page

2. **Wait 30 Seconds**
   - Large data queries may take time
   - Check if browser is "Not Responding"

3. **Close and Reopen Browser**
   - Full browser restart
   - Clears temporary issues

4. **Check System Resources**
   - Open Task Manager (Windows) / Activity Monitor (Mac)
   - Check CPU and memory usage
   - Close other applications if needed

### Issue: Data Not Updating

**Symptoms:**
- Old data displayed
- Changes not showing
- Real-time updates not working

**Solutions:**

1. **Refresh the Page**
   - Press F5 or Ctrl+R
   - Forces data reload

2. **Check WebSocket Connection**
   - Look for connection status in header
   - If disconnected, page should reconnect automatically
   - If not, try refreshing

3. **Clear Cache and Refresh**
   - Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   - Clears cache for current page

---

## Order Issues

### Issue: Cannot Claim Order

**Symptoms:**
- "Claim" button doesn't work
- "Order already claimed" message
- Order disappears from queue

**Solutions:**

1. **Check Active Order**
   - You may already have an active order
   - Complete or release current order first

2. **Refresh Order Queue**
   - Press F5 to refresh
   - Order may have been claimed by someone else

3. **Check Order Status**
   - Order may have moved to different status
   - Check with supervisor if order is missing

### Issue: Order Details Wrong

**Symptoms:**
- Incorrect items listed
- Wrong customer name
- Wrong shipping address

**Solutions:**

1. **Do Not Pick the Order**
   - Stop and report the issue
   - Contact supervisor immediately

2. **Report Exception**
   - Use "Report Exception" button
   - Select "Order Error" type
   - Describe the issue in detail

3. **Wait for Correction**
   - Supervisor will correct or cancel order
   - Do not proceed with picking

### Issue: Item Not at Expected Location

**Symptoms:**
- Bin location is empty
- Different item at location
- Item quantity is wrong

**Solutions:**

1. **Check Adjacent Bins**
   - Item may be in nearby bin
   - Bins are numbered sequentially (check one number off)

2. **Report Exception**
   - Use "Report Exception" button
   - Select "Item Not Found" type
   - Enter bin location and SKU

3. **Continue with Other Items**
   - You can continue picking other items
   - Come back to this item after exception resolved

### Issue: Cannot Complete Order

**Symptoms:**
- "Complete Picking" button disabled
- Error when clicking complete
- Progress not at 100%

**Solutions:**

1. **Verify All Items Picked**
   - Check that all items show "Picked" status
   - Pick any remaining items first

2. **Check for Exceptions**
   - Unresolved exceptions prevent completion
   - Wait for supervisor to resolve

3. **Refresh the Page**
   - Try refreshing and clicking complete again

---

## Inventory Issues

### Issue: Stock Level Shows Wrong

**Symptoms:**
- Physical count differs from system
- System shows 0 but items exist
- System shows items but bin is empty

**Solutions:**

1. **Verify Bin Location**
   - Confirm you're at the correct bin
   - Bin labels should match system

2. **Check Recent Transactions**
   - Ask supervisor about recent adjustments
   - Items may have been moved

3. **Report Discrepancy**
   - Use stock adjustment function (if authorized)
   - Or report to supervisor

4. **Request Cycle Count**
   - Ask supervisor to schedule a count
   - Corrects systematic errors

### Issue: Cannot Make Stock Adjustment

**Symptoms:**
- Adjustment button disabled
- "Not authorized" error
- Adjustment rejected

**Solutions:**

1. **Check Permissions**
   - Only Stock Controllers and above can adjust
   - Contact supervisor if adjustment needed

2. **Provide Reason**
   - Adjustment requires a reason
   - Select appropriate reason from dropdown

3. **Get Approval**
   - Large adjustments may need approval
   - Contact supervisor for approval

### Issue: SKU Not Found in System

**Symptoms:**
- Scanned SKU not recognized
- "SKU not found" error
- Item has no barcode

**Solutions:**

1. **Verify Barcode**
   - Check if barcode is damaged
   - Try scanning again carefully

2. **Enter SKU Manually**
   - If barcode is unreadable
   - Type SKU number manually

3. **Report Missing SKU**
   - If item exists but not in system
   - Provide item details to supervisor
   - New SKU record will be created

---

## Scanning Issues

### Issue: Scanner Not Working

**Symptoms:**
- Scanner doesn't beep when scanning
- Scanner light doesn't come on
- Scanned data doesn't appear

**Solutions:**

#### 1. Check Scanner Power
- Verify scanner is turned on
- Check battery level
- Replace/recharge batteries if low

#### 2. Check Scanner Connection
- **USB Scanner:** Unplug and replug
- **Bluetooth Scanner:**
  - Verify Bluetooth is enabled
  - Re-pair scanner with device
  - Check scanner is in discovery mode

#### 3. Test Scanner
- Scan into Notepad/text editor
- If works there, scanner is fine
- Issue may be with WMS

#### 4. Restart Browser
- Sometimes scanner loses connection to browser
- Close and reopen browser

#### 5. Use Manual Entry as Backup
- Enter SKU/numbers manually
- Continue working until scanner fixed

### Issue: Scanner Beeps But Data Not Entered

**Symptoms:**
- Scanner beeps successfully
- Barcode is read
- But data doesn't appear in field

**Solutions:**

1. **Click in Field First**
   - Click in the input field before scanning
   - Ensures data goes to right place

2. **Clear Field First**
   - Field may have existing data
   - Clear field before scanning

3. **Check Scanner Mode**
   - Some scanners have different modes
   - Ensure scanner is in correct mode

4. **Check Keyboard Focus**
   - Make sure no popup has focus
   - Close any popups/modals

### Issue: Scanner Reads Wrong Barcode

**Symptoms:**
- Wrong SKU appears after scan
- Different item scanned

**Solutions:**

1. **Verify Correct Item**
   - Check if barcode is on correct item
   - Items may have been re-labeled

2. **Check Barcode Quality**
   - Damaged barcodes may misread
   - Enter SKU manually if needed

3. **Report Wrong Barcode**
   - If barcode is on wrong item
   - Report to supervisor
   - Correct labeling needed

---

## Printing Issues

### Issue: Label Not Printing

**Symptoms:**
- Click "Print Label" but nothing prints
- No error message

**Solutions:**

#### 1. Check Printer
- Verify printer is turned on
- Check for paper/ink
- Look for error lights on printer

#### 2. Check Printer Connection
- **USB:** Ensure cable connected
- **Network:** Check network connection
- **Wireless:** Verify WiFi connected

#### 3. Check Browser Print Settings
1. Press Ctrl+P to open print dialog
2. Verify correct printer selected
3. Check "Destination" printer

#### 4. Restart Print Spooler (Windows)
1. Open Services (services.msc)
2. Find "Print Spooler"
3. Right-click > Restart

#### 5. Try Different Browser
- Print function may work in different browser

### Issue: Label Prints But Looks Wrong

**Symptoms:**
- Text is cut off
- Barcode not visible
- Alignment is wrong

**Solutions:**

1. **Check Label Size**
   - Verify correct label size selected
   - Wrong size causes formatting issues

2. **Clean Printer Head**
   - Dirty print head causes poor quality
   - Clean per printer manual

3. **Replace Supplies**
   - Low ink/toner affects quality
   - Replace if needed

4. **Check Printer Settings**
   - Verify print quality settings
   - Should be set to "Normal" or "High"

### Issue: Printer Shows "Offline"

**Symptoms:**
- Printer status shows offline
- Cannot print to printer

**Solutions:**

1. **Check Printer Power**
   - Verify printer is turned on
   - Check power cable is connected

2. **Check Network Connection**
   - Verify printer connected to network
   - Check network cable (or WiFi)

3. **Restart Printer**
   - Turn printer off
   - Wait 30 seconds
   - Turn printer back on

4. **Reinstall Printer**
   - Remove printer from computer
   - Re-add printer
   - Tests connection

---

## WebSocket/Real-time Issues

### Issue: Real-time Updates Not Working

**Symptoms:**
- Connection status shows "Disconnected"
- Changes from others don't appear
- Have to refresh to see updates

**Solutions:**

1. **Check Internet Connection**
   - WebSocket requires stable connection
   - Verify you're online

2. **Refresh the Page**
   - Often reconnects WebSocket
   - Press F5

3. **Check Browser Console**
   - Press F12 to open developer tools
   - Check for WebSocket errors
   - Note any error messages for IT

4. **Disable VPN/Proxy**
   - May interfere with WebSocket
   - Try disabling temporarily

5. **Try Different Browser**
   - Some browsers have WebSocket issues
   - Try Chrome or Firefox

### Issue: Connection Keeps Dropping

**Symptoms:**
- Connection frequently disconnects
- Unstable connection indicator

**Solutions:**

1. **Check Network Stability**
   - Run continuous ping test
   - Identify network issues

2. **Move Closer to WiFi Access Point**
   - Weak signal causes drops
   - Improve signal strength

3. **Disable Power Saving on Network Adapter**
   - Windows: Device Manager > Network Adapter > Properties
   - Uncheck "Allow computer to turn off device"

4. **Use Wired Connection**
   - More stable than wireless
   - Eliminates WiFi issues

---

## Mobile Device Issues

### Issue: Mobile Site Not Loading

**Symptoms:**
- Blank screen on mobile
- Desktop version loads (badly)
- "Page not found" error

**Solutions:**

1. **Clear Mobile Browser Cache**
   - Android: Chrome > Menu > Clear Browsing Data
   - iOS: Settings > Safari > Clear History

2. **Use Supported Browser**
   - Chrome (Android)
   - Safari (iOS)
   - Other browsers may not work

3. **Update Operating System**
   - Older OS versions may have issues
   - Update to latest version

4. **Check Mobile Data**
   - Ensure mobile data is enabled
   - Try WiFi if available

### Issue: Scanner App Not Working

**Symptoms:**
- Camera won't open
- Scanner doesn't detect barcodes
- App crashes

**Solutions:**

1. **Check Camera Permissions**
   - App needs camera access
   - Enable in phone settings

2. **Update App**
   - Ensure latest version installed
   - Check app store for updates

3. **Restart Phone**
   - Clears temporary issues
   - Properly reloads app

4. **Reinstall App**
   - Uninstall and reinstall app
   - Fixes corrupted installation

---

## System Errors

### Issue: "500 Internal Server Error"

**Symptoms:**
- Generic error page
- "Something went wrong" message

**Solutions:**

1. **Refresh the Page**
   - May be temporary issue
   - Try again after few seconds

2. **Clear Browser Cache**
   - Old cached data may cause issues
   - Clear and reload

3. **Try Different Action**
   - Issue may be with specific function
   - Try different page or action

4. **Contact IT**
   - If issue persists
   - Report error with steps to reproduce

### Issue: "403 Forbidden" Error

**Symptoms:**
- "Access Denied" message
- Cannot access certain pages

**Solutions:**

1. **Verify Permissions**
   - You may not have access to that feature
   - Check with supervisor

2. **Log Out and Log In**
   - Refreshes permissions
   - May resolve issue

3. **Check Role Assignment**
   - Verify your role is correct
   - Contact supervisor if wrong

### Issue: "404 Not Found" Error

**Symptoms:**
- "Page not found" message
- Blank page

**Solutions:**

1. **Check URL**
   - May have typed wrong URL
   - Use navigation menu instead

2. **Refresh the Page**
   - May be temporary issue

3. **Clear Browser Cache**
   - Old bookmarks may cause issues
   - Clear cache and try again

---

## Contacting Support

### When to Contact Support

Contact IT support when:
- Issue persists after trying all solutions
- Error message not covered in this guide
- Multiple users experiencing same issue
- System-wide problem suspected

### Information to Provide

When contacting support, have ready:

| Information | Why Needed |
|-------------|------------|
| **Your Name** | To identify your account |
| **Email/Username** | To look up your account |
| **Page/Function** | To locate the issue |
| **Error Message** | Exact text of error |
| **Steps to Reproduce** | To recreate the issue |
| **Screenshot** | Visual of the issue |
| **Browser/Device** | To identify compatibility issues |
| **Time of Issue** | To check system logs |

### Contact Information

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| **System Down** | IT Helpdesk: ext. 100 | Immediate |
| **Critical Error** | IT Helpdesk: helpdesk@warehouse.com | 30 minutes |
| **Login Issues** | Supervisor: ext. 101-199 | 1 hour |
| **General Issues** | IT Helpdesk: helpdesk@warehouse.com | 4 hours |
| **Feature Request** | System Admin: admin@warehouse.com | 1 week |

### After-Hours Support

For urgent issues outside business hours:

1. **Emergency Hotline:** 555-0123
2. **On-Call Support:** Available for critical issues
3. **Email Support:** Response next business day

---

## Quick Reference

### Common Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Page not loading | Refresh (F5) |
| Data not updating | Hard refresh (Ctrl+Shift+R) |
| Scanner not working | Check battery/connection |
| Can't log in | Clear browser cache |
| Print not working | Check printer power |
| Slow performance | Close other tabs |

### Keyboard Shortcuts for Troubleshooting

| Shortcut | Action |
|----------|--------|
| `F5` | Refresh page |
| `Ctrl+R` | Refresh page |
| `Ctrl+Shift+R` | Hard refresh (clear cache) |
| `F12` | Open developer tools |
| `Ctrl+Shift+J` | Open browser console |
| `Ctrl+Shift+Delete` | Clear browsing data |

### Browser-Specific Tips

#### Chrome
- Clear cache: Settings > Privacy > Clear Browsing Data
- Incognito mode: Ctrl+Shift+N (test without extensions)
- Task Manager: Shift+Esc (identify slow tabs)

#### Firefox
- Clear cache: Options > Privacy > Clear Recent History
- Private mode: Ctrl+Shift+P
- Task Manager: Shift+Esc (identify slow tabs)

#### Edge
- Clear cache: Settings > Privacy > Clear Browsing Data
- InPrivate mode: Ctrl+Shift+N
- Performance: Check task manager (F12 > Performance)

#### Safari
- Clear cache: Develop > Empty Caches
- Private mode: Cmd+Shift+N
- Restart: Cmd+Q (fully quit and reopen)

---

## Appendix: Error Message Glossary

| Error Message | Meaning | Action |
|---------------|---------|--------|
| **401 Unauthorized** | Not logged in or session expired | Log in again |
| **403 Forbidden** | Don't have permission | Contact supervisor |
| **404 Not Found** | Page doesn't exist | Check URL, use navigation |
| **500 Internal Server Error** | Server error | Try again, contact IT if persists |
| **503 Service Unavailable** | System temporarily down | Wait a few minutes, try again |
| **Connection Lost** | WebSocket disconnected | Refresh page |
| **Network Error** | Internet connection issue | Check connection |
| **Session Expired** | Logged out due to inactivity | Log in again |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*For issues not covered, contact IT Helpdesk*
