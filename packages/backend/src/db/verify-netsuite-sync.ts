/**
 * NetSuite Order Sync Verification & Reconciliation Script
 *
 * This script verifies that WMS orders are in sync with NetSuite
 * and cleans up any stale/orphaned data.
 *
 * Usage:
 *   npx ts-node src/db/verify-netsuite-sync.ts [--fix] [--verbose]
 *
 * Options:
 *   --fix      Apply fixes (cancel stale orders, update statuses)
 *   --verbose  Show detailed output
 *   --dry-run  Show what would be fixed without making changes
 *
 * @domain integrations
 * @database aap_db (reads integration config), wms_db (orders)
 */

import { Pool } from 'pg';
import { NetSuiteClient } from '../services/NetSuiteClient';
import { logger } from '../config/logger';

// ============================================================================
// TYPES
// ============================================================================

interface SyncDiscrepancy {
  orderId: string;
  netsuiteSoTranId: string | null;
  netsuiteSoInternalId: string | null;
  wmsStatus: string;
  netSuiteStatus: string | null;
  lastSyncedAt: Date | null;
  issue: string;
  recommendedAction: 'CANCEL' | 'UPDATE_STATUS' | 'RESYNC' | 'INVESTIGATE';
}

interface SyncReport {
  totalWmsOrders: number;
  netSuiteSourcedOrders: number;
  matchedOrders: number;
  discrepancies: SyncDiscrepancy[];
  staleOrders: number;
  orphanedOrders: number;
  statusMismatches: number;
}

interface NetSuiteOrderSummary {
  id: string;
  tranId: string;
  status: string;
  readyToShip: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const STALE_THRESHOLD_MINUTES = 5; // Orders not synced in X minutes are considered stale
const BATCH_SIZE = 50; // Process orders in batches

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const verbose = args.includes('--verbose');
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(80));
  console.log('NetSuite Order Sync Verification & Reconciliation');
  console.log('='.repeat(80));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : shouldFix ? 'FIX' : 'VERIFY ONLY'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Create database pool
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    // Step 1: Get NetSuite integration configuration
    console.log('\n📋 Step 1: Fetching NetSuite integration configuration...');

    const integrationResult = await pool.query(`
      SELECT i.integration_id, i.configuration, i.last_sync_at, io.organization_id
      FROM integrations i
      LEFT JOIN integration_organizations io ON io.integration_id = i.integration_id
      WHERE i.provider = 'NETSUITE' AND i.enabled = true
      LIMIT 1
    `);

    if (integrationResult.rows.length === 0) {
      console.log('⚠️  No enabled NetSuite integration found.');
      console.log('   Checking for NetSuite-sourced orders in database anyway...');
    }

    const integration = integrationResult.rows[0];
    const authConfig = integration?.configuration?.auth || integration?.configuration || {};

    // Step 2: Query current WMS orders from NetSuite
    console.log('\n📋 Step 2: Querying NetSuite-sourced orders from WMS database...');

    const wmsOrdersResult = await pool.query(`
      SELECT 
        order_id,
        status,
        netsuite_so_internal_id,
        netsuite_so_tran_id,
        netsuite_if_internal_id,
        netsuite_if_tran_id,
        netsuite_source,
        netsuite_last_synced_at,
        created_at,
        updated_at,
        customer_email
      FROM orders
      WHERE netsuite_source = 'NETSUITE' 
         OR customer_email LIKE 'netsuite:%'
      ORDER BY created_at DESC
    `);

    const wmsOrders = wmsOrdersResult.rows;
    console.log(`   Found ${wmsOrders.length} NetSuite-sourced orders in WMS`);

    // Group by status
    const statusCounts: Record<string, number> = {};
    for (const order of wmsOrders) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    }
    console.log('   Status breakdown:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`     - ${status}: ${count}`);
    }

    // Step 3: Fetch current NetSuite orders (if integration configured)
    let netSuiteOrders: NetSuiteOrderSummary[] = [];
    let netSuiteClient: NetSuiteClient | null = null;

    if (authConfig.accountId && authConfig.tokenId) {
      console.log('\n📋 Step 3: Fetching current orders from NetSuite...');

      try {
        netSuiteClient = new NetSuiteClient({
          accountId: authConfig.accountId,
          tokenId: authConfig.tokenId,
          tokenSecret: authConfig.tokenSecret,
          consumerKey: authConfig.consumerKey,
          consumerSecret: authConfig.consumerSecret,
        });

        // Test connection first
        const testResult = await netSuiteClient.testConnection();
        console.log(
          `   Connection test: ${testResult.success ? '✅ SUCCESS' : '❌ FAILED'} (${testResult.latency}ms)`
        );

        if (testResult.success) {
          // Fetch pending fulfillment orders
          const soResponse = await netSuiteClient.getSalesOrders({
            limit: 500,
            status: '_pendingFulfillment',
          });

          netSuiteOrders = (soResponse.items || []).map((item: any) => ({
            id: item.id,
            tranId: item.tranId,
            status: item.status?.refName || 'Pending Fulfillment',
            readyToShip: item.readyToShip || false,
          }));

          console.log(
            `   Fetched ${netSuiteOrders.length} pending fulfillment orders from NetSuite`
          );
        }
      } catch (error: any) {
        console.log(`   ⚠️  Failed to fetch from NetSuite: ${error.message}`);
        console.log('   Proceeding with WMS-only analysis...');
      }
    } else {
      console.log('\n📋 Step 3: Skipping NetSuite API fetch (no credentials configured)');
      console.log('   Running WMS-only analysis...');
    }

    // Step 4: Analyze discrepancies
    console.log('\n📋 Step 4: Analyzing sync discrepancies...');

    const report: SyncReport = {
      totalWmsOrders: wmsOrders.length,
      netSuiteSourcedOrders: wmsOrders.filter(o => o.netsuite_source === 'NETSUITE').length,
      matchedOrders: 0,
      discrepancies: [],
      staleOrders: 0,
      orphanedOrders: 0,
      statusMismatches: 0,
    };

    const netSuiteOrderMap = new Map<string, NetSuiteOrderSummary>();
    for (const so of netSuiteOrders) {
      netSuiteOrderMap.set(so.id, so);
    }

    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    for (const wmsOrder of wmsOrders) {
      const soId = wmsOrder.netsuite_so_internal_id;
      const lastSynced = wmsOrder.netsuite_last_synced_at
        ? new Date(wmsOrder.netsuite_last_synced_at)
        : null;

      // Check for stale orders (not synced recently)
      if (wmsOrder.status === 'PENDING' && (!lastSynced || lastSynced < staleThreshold)) {
        report.staleOrders++;

        // Check if still in NetSuite pending queue
        const nsOrder = soId ? netSuiteOrderMap.get(soId) : null;

        if (netSuiteOrders.length > 0 && !nsOrder && soId) {
          // Order exists in WMS but not in NetSuite pending queue
          report.discrepancies.push({
            orderId: wmsOrder.order_id,
            netsuiteSoTranId: wmsOrder.netsuite_so_tran_id,
            netsuiteSoInternalId: soId,
            wmsStatus: wmsOrder.status,
            netSuiteStatus: null,
            lastSyncedAt: lastSynced,
            issue:
              'Order not in NetSuite pending fulfillment queue (likely fulfilled or cancelled)',
            recommendedAction: 'INVESTIGATE',
          });
          report.orphanedOrders++;
        } else if (!lastSynced) {
          report.discrepancies.push({
            orderId: wmsOrder.order_id,
            netsuiteSoTranId: wmsOrder.netsuite_so_tran_id,
            netsuiteSoInternalId: soId,
            wmsStatus: wmsOrder.status,
            netSuiteStatus: nsOrder?.status || null,
            lastSyncedAt: lastSynced,
            issue: 'Order never synced (missing netsuite_last_synced_at)',
            recommendedAction: 'RESYNC',
          });
        } else {
          report.discrepancies.push({
            orderId: wmsOrder.order_id,
            netsuiteSoTranId: wmsOrder.netsuite_so_tran_id,
            netsuiteSoInternalId: soId,
            wmsStatus: wmsOrder.status,
            netSuiteStatus: nsOrder?.status || null,
            lastSyncedAt: lastSynced,
            issue: `Order not synced in ${STALE_THRESHOLD_MINUTES}+ minutes`,
            recommendedAction: 'RESYNC',
          });
        }
      } else if (nsOrder && wmsOrder.status === 'PENDING') {
        report.matchedOrders++;
      }

      // Check for orders without NetSuite tracking columns
      if (!wmsOrder.netsuite_so_internal_id && !wmsOrder.netsuite_so_tran_id) {
        if (verbose) {
          console.log(`   ⚠️  Order ${wmsOrder.order_id} has no NetSuite tracking columns`);
        }
      }
    }

    // Step 5: Display report
    console.log('\n' + '='.repeat(80));
    console.log('SYNC VERIFICATION REPORT');
    console.log('='.repeat(80));
    console.log(`Total WMS Orders (NetSuite-sourced): ${report.totalWmsOrders}`);
    console.log(`NetSuite Orders (Pending Fulfillment): ${netSuiteOrders.length}`);
    console.log(`Matched Orders: ${report.matchedOrders}`);
    console.log(`Stale Orders (not synced recently): ${report.staleOrders}`);
    console.log(`Orphaned Orders (not in NetSuite): ${report.orphanedOrders}`);
    console.log(`Total Discrepancies: ${report.discrepancies.length}`);
    console.log('='.repeat(80));

    if (report.discrepancies.length > 0) {
      console.log('\n📋 DISCREPANCY DETAILS:');
      console.log('-'.repeat(80));

      for (const d of report.discrepancies.slice(0, 20)) {
        // Show first 20
        console.log(`\nOrder: ${d.orderId}`);
        console.log(
          `  NetSuite SO: ${d.netsuiteSoTranId || 'N/A'} (${d.netsuiteSoInternalId || 'N/A'})`
        );
        console.log(`  WMS Status: ${d.wmsStatus}`);
        console.log(`  NetSuite Status: ${d.netSuiteStatus || 'Unknown'}`);
        console.log(`  Last Synced: ${d.lastSyncedAt?.toISOString() || 'Never'}`);
        console.log(`  Issue: ${d.issue}`);
        console.log(`  Action: ${d.recommendedAction}`);
      }

      if (report.discrepancies.length > 20) {
        console.log(`\n... and ${report.discrepancies.length - 20} more discrepancies`);
      }
    }

    // Step 6: Apply fixes if requested
    if ((shouldFix || dryRun) && report.discrepancies.length > 0) {
      console.log('\n📋 Step 5: ' + (dryRun ? 'Simulating fixes' : 'Applying fixes') + '...');

      let fixedCount = 0;
      let errorCount = 0;

      for (const d of report.discrepancies) {
        if (d.recommendedAction === 'CANCEL' || d.recommendedAction === 'INVESTIGATE') {
          // For INVESTIGATE, we try to check the actual NetSuite status
          if (netSuiteClient && d.netsuiteSoInternalId) {
            try {
              if (verbose) {
                console.log(`   Checking NetSuite status for SO ${d.netsuiteSoTranId}...`);
              }

              const soDetail = await netSuiteClient.getSalesOrder(d.netsuiteSoInternalId);
              const nsStatus = (soDetail.status?.refName || '').toLowerCase();

              if (nsStatus.includes('cancelled')) {
                console.log(
                  `   ${dryRun ? '[DRY RUN] Would cancel' : 'Cancelling'} order ${d.orderId} (NetSuite status: ${nsStatus})`
                );

                if (!dryRun) {
                  await pool.query(
                    `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW() WHERE order_id = $1`,
                    [d.orderId]
                  );
                }
                fixedCount++;
              } else if (
                nsStatus.includes('billed') ||
                nsStatus.includes('fulfilled') ||
                nsStatus.includes('pending billing')
              ) {
                console.log(
                  `   ${dryRun ? '[DRY RUN] Would update' : 'Updating'} order ${d.orderId} to PICKED (NetSuite status: ${nsStatus})`
                );

                if (!dryRun) {
                  await pool.query(
                    `UPDATE orders SET status = 'PICKED'::order_status, picked_at = COALESCE(picked_at, NOW()), progress = 100, updated_at = NOW() WHERE order_id = $1`,
                    [d.orderId]
                  );
                }
                fixedCount++;
              } else {
                console.log(
                  `   ⚠️  Order ${d.orderId} has NetSuite status: ${nsStatus} - keeping in queue`
                );
              }
            } catch (error: any) {
              console.log(
                `   ❌ Failed to check NetSuite status for ${d.orderId}: ${error.message}`
              );
              errorCount++;
            }
          } else {
            console.log(`   ⚠️  Cannot verify order ${d.orderId} - no NetSuite client or SO ID`);
          }
        } else if (d.recommendedAction === 'RESYNC') {
          console.log(
            `   ${dryRun ? '[DRY RUN] Would mark for resync' : 'Marking for resync'}: ${d.orderId}`
          );
          // Clear last_synced_at to trigger resync on next cycle
          if (!dryRun) {
            await pool.query(
              `UPDATE orders SET netsuite_last_synced_at = NULL WHERE order_id = $1`,
              [d.orderId]
            );
          }
          fixedCount++;
        }
      }

      console.log(`\n${dryRun ? 'Would fix' : 'Fixed'}: ${fixedCount} orders`);
      if (errorCount > 0) {
        console.log(`Errors: ${errorCount}`);
      }
    }

    // Step 7: Clean up truly orphaned orders (no NetSuite ID and old)
    const orphanCleanupResult = await pool.query(`
      SELECT order_id, customer_email, created_at, status
      FROM orders
      WHERE netsuite_source = 'NETSUITE'
        AND netsuite_so_internal_id IS NULL
        AND netsuite_so_tran_id IS NULL
        AND customer_email LIKE 'netsuite:%'
        AND status = 'PENDING'
        AND created_at < NOW() - INTERVAL '1 hour'
    `);

    if (orphanCleanupResult.rows.length > 0) {
      console.log(
        `\n⚠️  Found ${orphanCleanupResult.rows.length} orphaned orders (no NetSuite ID, 1+ hour old)`
      );

      if (shouldFix || dryRun) {
        for (const orphan of orphanCleanupResult.rows) {
          console.log(
            `   ${dryRun ? '[DRY RUN] Would cancel' : 'Cancelling'} orphaned order ${orphan.order_id}`
          );

          if (!dryRun) {
            await pool.query(
              `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW() WHERE order_id = $1`,
              [orphan.order_id]
            );
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));

    if (!shouldFix && !dryRun && report.discrepancies.length > 0) {
      console.log('\n💡 Run with --fix to apply corrections');
      console.log('💡 Run with --dry-run to see what would be fixed');
    }
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
