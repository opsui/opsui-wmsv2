/**
 * Check what tables exist in the database
 */

import { query, closePool } from './client';

async function checkTables() {
  try {
    console.log('Checking existing tables...\n');

    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Existing tables:');
    result.rows.forEach((row: any) => {
      const tableName = row.table_name || row.table_name;
      console.log(`  - ${tableName}`);
    });
    console.log(`\nTotal: ${result.rows.length} tables`);

    // Check specifically for accounting-related tables
    const accountingTables = [
      'inventory',
      'financial_transactions',
      'receipts',
      'receipt_lines',
      'shipments',
      'receiving_exceptions',
      'quality_inspections',
      'accounts_receivable',
      'accounts_payable',
      'suppliers',
      'customers',
      'return_authorizations',
    ];

    console.log('\nAccounting tables status:');
    const existingTables = result.rows.map((row: any) => row.table_name || row.table_name);

    accountingTables.forEach((table: string) => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await closePool();
    process.exit(1);
  }
}

checkTables();
