# OpsUI Marketing Claims Audit Report

**Audit Date:** 2026-01-18
**Auditor:** Claude Code (Automated Code Analysis)
**Purpose:** Verify marketing website claims against actual system implementation

---

## Executive Summary

**Overall Risk Level: HIGH**

This audit reveals significant discrepancies between marketing claims and actual system implementation. The codebase has a well-architected foundation with comprehensive type definitions, but **critical integrations and features claimed on the marketing website are not implemented**.

### Key Findings

- **ERP Integrations:** Type definitions exist, but actual integration code returns "not implemented" messages
- **Courier Integrations:** No evidence of NZ-specific courier implementations (NZ Post, NZ Couriers, Mainfreight, Post Haste)
- **Batch/Wave Picking:** Business rules framework exists, but no concrete implementation
- **Advanced Reporting:** Framework exists, but minimal actual report logic
- **Add-on Modules:** No evidence of Production, CRM, or Maintenance modules

---

## Critical Mismatches

### 1. ERP Integrations (CRITICAL - HIGH RISK)

#### Marketing Claims

- **NetSuite:** "Full order & inventory sync (bidirectional, real-time)" using "SuiteScript 2.1 + RESTlets"
- **SAP Business One:** "Direct integration via DI API and Service Layer (REST)"
- **Xero:** "Financial & inventory integration" with "OAuth 2.0 API"

#### Actual Implementation

**Status: FRAMEWORK ONLY - NOT IMPLEMENTED**

**Evidence:**

File: [IntegrationsService.ts:234-240](packages/backend/src/services/IntegrationsService.ts#L234-L240)

```typescript
private async syncErpSystem(integration: Integration): Promise<any> {
  // ERP sync implementation
  // This would connect to SAP/Oracle APIs and sync inventory, orders, etc.
  return {
    totalProcessed: 0,
    succeeded: 0,
    failed: 0,
    details: { message: 'ERP sync not yet implemented' }
  };
}
```

**Type definitions exist** ([integrations.ts:106-138](packages/shared/src/types/integrations.ts#L106-L138)) for:

- `NETSUITE`
- `XERO`
- `SAP`

**But no actual integration code exists.**

**Required Fields Validation:**

- SAP: host, port, username, client ([IntegrationsService.ts:450](packages/backend/src/services/IntegrationsService.ts#L450))
- NetSuite: NOT defined in validation logic
- Xero: NOT defined in validation logic

**Risk Assessment:**

- **Legal Risk:** False advertising claims
- **Customer Risk:** Customers will expect working integrations
- **Reputation Risk:** Failed integrations will damage credibility

**Recommendation:**

1. **Immediate:** Remove or downplay integration claims until implemented
2. **Short-term:** Implement at least one ERP connector fully
3. **Long-term:** Complete all three promised integrations

---

### 2. Courier Integrations (CRITICAL - HIGH RISK)

#### Marketing Claims

- **NZ Post:** Label generation, tracking
- **NZ Couriers:** Label generation, tracking
- **Mainfreight:** Label generation, tracking
- **Post Haste:** Label generation, tracking
- **"One screen, one action"**
- **"Printer-ready out of the box"**
- **"No configuration needed for NZ couriers"**

#### Actual Implementation

**Status: GENERIC SHIPPING FRAMEWORK - NO NZ CARRIERS**

**Evidence:**

File: [shipping.ts](packages/backend/src/routes/shipping.ts)

- Generic shipping service exists
- Carrier management exists
- Label generation exists
- **BUT:** No NZ-specific carrier implementations

**Search Results:**

- No files found for "NZ Post", "NZ Couriers", "Mainfreight", "Post Haste"
- Only US carriers referenced in integration types: FEDEX, UPS, DHL, USPS ([integrations.ts:124-129](packages/shared/src/types/integrations.ts#L124-L129))

**Risk Assessment:**

- **High Risk:** Marketing specifically claims NZ courier support
- **Zero Evidence:** No NZ courier code exists
- **Customer Impact:** NZ customers will be unable to use core features

**Recommendation:**

1. **Immediate:** Remove NZ courier claims or mark as "Coming Soon"
2. **Short-term:** Implement at least 2 NZ carriers (NZ Post + one other)
3. **Long-term:** Implement all 4 promised carriers

---

### 3. Batch Picking & Wave Management (HIGH RISK)

#### Marketing Claims

- **Batch Picking:** "Group multiple orders for efficient picking" (Ops Pro, Ops Elite)
- **Wave Management:** "Organize picks into waves" (Ops Pro, Ops Elite)
- **"Smart batch grouping"**
- **"Optimized pick paths"**

#### Actual Implementation

**Status: TYPE DEFINITIONS ONLY - NOT IMPLEMENTED**

**Evidence:**

**Business Rules Framework Exists:**

- [business-rules.ts](packages/shared/src/types/business-rules.ts) defines allocation strategies
- `WAVE_PICKING` strategy defined ([business-rules.ts:183](packages/shared/src/types/business-rules.ts#L183))
- `BULK_PICKING` strategy defined ([business-rules.ts:184](packages/shared/src/types/business-rules.ts#L184))

**But No Implementation:**

- No batch picking service found
- No wave management routes found
- Order service handles individual orders only
- No grouping logic found

**Search Results:**

- "batch" and "wave" only appear in:
  - Type definitions
  - Node_modules (external dependencies)
  - ML package (unrelated)

**Risk Assessment:**

- **Plan Violation:** Feature promised for Pro/Elite tiers
- **Feature Gap:** Major efficiency feature missing

**Recommendation:**

1. **Remove from pricing** until implemented OR
2. **Implement** batch picking logic for Pro tier

---

### 4. Advanced Reporting & Analytics (MEDIUM RISK)

#### Marketing Claims

- **"Advanced Reporting & Analytics"** (Ops Elite only)
- **Detailed operational metrics**

#### Actual Implementation

**Status: FRAMEWORK EXISTS - MINIMAL IMPLEMENTATION**

**Evidence:**

**Framework Exists:**

- [reporting.ts](packages/shared/src/types/reporting.ts) comprehensive type definitions
- [reports.ts:13-321](packages/backend/src/routes/reports.ts) route handlers
- Report types: INVENTORY, ORDERS, SHIPPING, PICKING_PERFORMANCE, etc.

**But Implementation Gaps:**

- Export job status: "not yet implemented" ([reports.ts:313-317](packages/backend/src/routes/reports.ts#L313-L317))
- No actual report generation logic found
- No dashboard widgets implemented

**What Exists:**

- CRUD for report definitions
- Execution tracking
- Export job framework

**What's Missing:**

- Actual data aggregation
- Chart generation
- Dashboard rendering

**Risk Assessment:**

- **Medium Risk:** Framework is solid, implementation incomplete
- **Elite Feature:** Paying customers will expect this

**Recommendation:**

1. **Downgrade claim** to "Custom Report Builder"
2. **Implement** basic reports before Elite launch

---

### 5. Add-On Modules (HIGH RISK)

#### Marketing Claims

- **Production Management:** Track manufacturing, BOM, production scheduling ($80/month)
- **Sales & CRM:** Customer relationships, sales pipeline ($60/month)
- **Maintenance & Assets:** Equipment maintenance, asset tracking ($50/month)

#### Actual Implementation

**Status: NO EVIDENCE OF EXISTENCE**

**Evidence:**

- No production module found
- No CRM module found
- No maintenance module found
- No pricing tier implementation found

**Risk Assessment:**

- **High Risk:** Selling non-existent modules
- **Legal Risk:** False advertising

**Recommendation:**

1. **Immediate removal** from pricing page
2. **Mark as "Coming Soon"** if planned
3. **Do not sell** until implemented

---

### 6. Real-Time Sync Claims (MEDIUM RISK)

#### Marketing Claims

- **"Orders pulled every 2 minutes"**
- **"Inventory updates pushed immediately"**
- **"Shipment tracking within 30 seconds"**
- **"Real-time sync"**

#### Actual Implementation

**Status: SYNC FRAMEWORK - NO REAL-TIME IMPLEMENTATION**

**Evidence:**

**Sync Frequency Options Defined:**

- [integrations.ts:35-45](packages/shared/src/types/integrations.ts#L35-L45) - Includes `REAL_TIME`, `EVERY_5_MINUTES`, etc.

**But No Scheduler Found:**

- No cron job implementation
- No polling service
- No webhook handlers implemented ([IntegrationsService.ts:340-393](packages/backend/src/services/IntegrationsService.ts#L340-L393) - only console.log stubs)

**Example Stub:**

```typescript
private async handleOrderCreated(payload: any, integration: Integration): Promise<void> {
  // Handle order creation from e-commerce platform
  console.log('Handling order created webhook:', payload.orderId);
}
```

**Risk Assessment:**

- **Medium Risk:** Framework supports it, but no actual sync
- **Performance Gap:** Cannot meet 2-minute promise without scheduler

**Recommendation:**

1. **Implement** job scheduler (cron/bull)
2. **Remove specific timing claims** until verified
3. **Clarify** "near real-time" vs actual real-time

---

### 7. White-Label Options (HIGH RISK)

#### Marketing Claims

- **"White-Label Options"** (Ops Elite only)
- Implies: Custom branding, logos, colors

#### Actual Implementation

**Status: NOT IMPLEMENTED**

**Evidence:**

- No theming system found
- No logo upload functionality
- No color customization
- No multi-tenant branding

**Risk Assessment:**

- **High Risk:** Elite feature completely missing

**Recommendation:**

1. **Remove claim** OR
2. **Implement** basic theming system

---

### 8. Custom Workflow Automation (HIGH RISK)

#### Marketing Claims

- **"Custom Workflow Automation"** (Ops Elite only)
- **"Create custom rules and workflows"**

#### Actual Implementation

**Status: BUSINESS RULES ENGINE - NO UI**

**Evidence:**

**Business Rules Framework:**

- [business-rules.ts](packages/shared/src/types/business-rules.ts) - comprehensive
- Rule types: ALLOCATION, PICKING, SHIPPING, etc.
- Conditions, actions, templates defined

**But No User Interface:**

- No rule builder UI found
- No configuration endpoints
- Database tables may not exist

**Risk Assessment:**

- **High Risk:** Requires significant development
- **Elite Feature:** Key differentiator missing

**Recommendation:**

1. **Clarify** as "Developer-configured rules"
2. **OR** Build no-code rule builder

---

## Features That ARE Implemented

### Core WMS Functionality (GOOD)

✅ **Order Management**

- Order lifecycle: PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED
- Order creation and validation
- Picker assignment
- Progress tracking

✅ **Picking Workflow**

- Pick task generation
- Barcode scanning support
- Bin location validation
- Quantity tracking

✅ **Packing Workflow**

- Packing queue
- Item verification
- Shipping label generation (generic)

✅ **Inventory Management**

- Real-time stock tracking
- Bin-level inventory
- Reservation system
- Transaction history

✅ **Authentication & Authorization**

- JWT-based auth
- Role-based access control (5 roles)
- Proper middleware

✅ **Database Schema**

- Comprehensive schema
- Audit trails
- Transaction support

---

## What Exists vs. What's Claimed

### Fully Implemented (Can Market)

1. ✅ Picking workflow
2. ✅ Packing workflow
3. ✅ Barcode scanning validation
4. ✅ Inventory tracking
5. ✅ Exception handling
6. ✅ Cycle counting
7. ✅ Quality control
8. ✅ Location capacity management
9. ✅ Mobile-responsive UI
10. ✅ Authentication system
11. ✅ Basic reporting framework

### Partially Implemented (Soft Claims)

1. ⚠️ Shipping labels (generic only, no NZ carriers)
2. ⚠️ Integrations (framework only, no connectors)
3. ⚠️ Reporting (CRUD exists, no actual reports)
4. ⚠️ Business rules (types only, no engine)
5. ⚠️ Webhooks (receiver exists, no handlers)

### Not Implemented (Remove Claims)

1. ❌ NetSuite integration
2. ❌ SAP Business One integration
3. ❌ Xero integration
4. ❌ NZ Post courier
5. ❌ NZ Couriers
6. ❌ Mainfreight
7. ❌ Post Haste
8. ❌ Batch picking
9. ❌ Wave management
10. ❌ Advanced reporting dashboards
11. ❌ White-label options
12. ❌ Custom workflow automation UI
13. ❌ Production module
14. ❌ CRM module
15. ❌ Maintenance module
16. ❌ FTP automation
17. ❌ Real-time sync scheduler

---

## Urgent Recommendations

### Immediate Actions (Before Go-Live)

1. **Remove all ERP integration claims**
   - No working connectors exist
   - High customer dissatisfaction risk

2. **Remove all NZ courier claims**
   - Zero NZ carrier code exists
   - Core selling point is false

3. **Remove add-on modules from pricing**
   - Production, CRM, Maintenance don't exist
   - Legal liability

4. **Remove Elite-only features**
   - White-label: not implemented
   - Custom workflow automation: no UI
   - Advanced reporting: framework only

5. **Soften quantitative claims**
   - "50% faster picking" → no benchmarking evidence
   - "99% fewer errors" → no data
   - "2-day go-live" → risky promise

### Short-Term (Next 3 Months)

1. **Implement 2-3 critical integrations**
   - Start with Xero (simplest)
   - Then one ERP (NetSuite or SAP)
   - One NZ courier (NZ Post)

2. **Build batch picking**
   - Core WMS efficiency feature
   - Promised for Pro tier

3. **Complete reporting engine**
   - At least 5 operational reports
   - Basic dashboard

### Long-Term (6-12 Months)

1. **All promised ERP integrations**
2. **All 4 NZ couriers**
3. **Advanced reporting dashboards**
4. **Workflow automation UI**
5. **Add-on modules (if desired)**

---

## Suggested Marketing Copy Changes

### Before (Current Claims)

> "Full order & inventory sync with NetSuite, SAP Business One, and Xero"

### After (Honest Claims)

> "Integration framework supporting ERPs and e-commerce platforms. Xero integration coming soon. Contact us for custom integrations."

---

### Before

> "Generate labels for NZ Post, NZ Couriers, Mainfreight. One screen, one action."

### After

> "Universal shipping label generation. Extensible carrier integration framework. NZ carrier support in development."

---

### Before

> "Batch Picking. Wave Management."

### After

> "Smart picking workflow with barcode validation. Batch picking coming in Q2 2026."

---

## Legal & Commercial Risk Assessment

### High Risk Areas (Legal Exposure)

1. **False Advertising**
   - Specific ERP integrations claimed but not delivered
   - NZ courier support claimed but doesn't exist
   - Add-on modules sold but not implemented

2. **Breach of Contract**
   - Elite tier features completely missing
   - Pro tier missing batch/wave picking

3. **Misleading Conduct**
   - "2-day go-live" with no integration support
   - Quantitative performance claims with no evidence

### Medium Risk Areas

1. **Customer Dissatisfaction**
   - Expected features not available
   - Integration delays

2. **Reputation Damage**
   - Reviews will mention missing features
   - Industry word-of-mouth

---

## Conclusion

The OpsUI codebase demonstrates **solid architecture and engineering practices**. The core WMS functionality is well-implemented with proper domain modeling, authentication, and database design.

**However, the marketing website significantly overstates capabilities.** Critical integrations (ERP, NZ couriers) and advanced features (batch picking, reporting) claimed on the website do not exist in the codebase.

**Recommended Path Forward:**

1. **Immediately align marketing with reality** to avoid legal issues
2. **Prioritize 2-3 critical integrations** for actual implementation
3. **Build out Pro/Elite differentiating features** before selling those tiers
4. **Consider "Early Access" positioning** for features in development

The system has a strong foundation but needs significant development work before it can deliver on its marketing promises.

---

## Appendix: Audit Methodology

### Files Analyzed

- `/packages/backend/src/services/IntegrationsService.ts` - ERP integration logic
- `/packages/backend/src/routes/shipping.ts` - Carrier integration
- `/packages/backend/src/routes/reports.ts` - Reporting system
- `/packages/shared/src/types/integrations.ts` - Integration type definitions
- `/packages/shared/src/types/business-rules.ts` - Workflow automation types
- `/packages/shared/src/types/reporting.ts` - Reporting type definitions
- All service files (OrderService, InventoryService, etc.)

### Search Terms Used

- "NetSuite", "SAP", "Xero"
- "NZ Post", "NZ Couriers", "Mainfreight", "Post Haste"
- "batch", "wave"
- "white-label", "whitelabel"
- "production", "CRM", "maintenance"

### Analysis Criteria

- Code implementation vs. type definitions only
- Stub implementations (console.log, "not implemented")
- Database migrations for feature support
- API endpoint completeness
- Frontend UI components for features

---

**Report Generated:** 2026-01-18
**Next Audit Recommended:** After critical integrations implemented
