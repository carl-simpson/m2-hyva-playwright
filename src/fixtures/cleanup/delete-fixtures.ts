#!/usr/bin/env ts-node
/**
 * Delete Fixtures
 *
 * Removes all test fixtures (products, customers, coupons) created by the seeding scripts.
 * Uses pattern matching to identify test fixtures (TEST_* SKUs, *@qbdigital.test emails, etc.)
 *
 * Usage:
 *   npm run cleanup:fixtures           # Delete all test fixtures
 *   npm run cleanup:fixtures -- --dry  # Dry run (show what would be deleted)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createApiClient, MagentoApiClient } from '../seed/api-client';

// Patterns to identify test fixtures
const TEST_SKU_PREFIX = 'TEST_%';
const TEST_EMAIL_PATTERN = '%@qbdigital.test';
const TEST_COUPON_PREFIX = 'Test%';

interface CleanupStats {
  products: { found: number; deleted: number; failed: number };
  customers: { found: number; deleted: number; failed: number };
  coupons: { found: number; deleted: number; failed: number };
}

/**
 * Delete test products
 */
async function deleteProducts(
  client: MagentoApiClient,
  dryRun: boolean
): Promise<{ found: number; deleted: number; failed: number }> {
  console.log('\n📦 Cleaning up Products...');

  const stats = { found: 0, deleted: 0, failed: 0 };

  try {
    const products = await client.searchProducts(TEST_SKU_PREFIX);
    stats.found = products.length;

    if (products.length === 0) {
      console.log('  No test products found');
      return stats;
    }

    for (const product of products) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would delete: ${product.sku} (${product.name})`);
        stats.deleted++;
      } else {
        try {
          const deleted = await client.deleteProduct(product.sku);
          if (deleted) {
            console.log(`  ✓ Deleted: ${product.sku}`);
            stats.deleted++;
          } else {
            console.log(`  ⚠ Not found: ${product.sku}`);
          }
        } catch (error: any) {
          console.error(`  ✗ Failed to delete ${product.sku}: ${error.message}`);
          stats.failed++;
        }
      }
    }
  } catch (error: any) {
    console.error(`  ✗ Failed to search products: ${error.message}`);
  }

  return stats;
}

/**
 * Delete test customers
 */
async function deleteCustomers(
  client: MagentoApiClient,
  dryRun: boolean
): Promise<{ found: number; deleted: number; failed: number }> {
  console.log('\n👤 Cleaning up Customers...');

  const stats = { found: 0, deleted: 0, failed: 0 };

  try {
    const customers = await client.searchCustomers(TEST_EMAIL_PATTERN);
    stats.found = customers.length;

    if (customers.length === 0) {
      console.log('  No test customers found');
      return stats;
    }

    for (const customer of customers) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would delete: ${customer.email}`);
        stats.deleted++;
      } else {
        try {
          const deleted = await client.deleteCustomer(customer.id);
          if (deleted) {
            console.log(`  ✓ Deleted: ${customer.email}`);
            stats.deleted++;
          } else {
            console.log(`  ⚠ Not found: ${customer.email}`);
          }
        } catch (error: any) {
          console.error(`  ✗ Failed to delete ${customer.email}: ${error.message}`);
          stats.failed++;
        }
      }
    }
  } catch (error: any) {
    console.error(`  ✗ Failed to search customers: ${error.message}`);
  }

  return stats;
}

/**
 * Delete test coupon rules
 */
async function deleteCoupons(
  client: MagentoApiClient,
  dryRun: boolean
): Promise<{ found: number; deleted: number; failed: number }> {
  console.log('\n🎟️  Cleaning up Coupons...');

  const stats = { found: 0, deleted: 0, failed: 0 };

  try {
    const rules = await client.searchSalesRules(TEST_COUPON_PREFIX);
    stats.found = rules.length;

    if (rules.length === 0) {
      console.log('  No test coupons found');
      return stats;
    }

    for (const rule of rules) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would delete: ${rule.name} (ID: ${rule.rule_id})`);
        stats.deleted++;
      } else {
        try {
          const deleted = await client.deleteSalesRule(rule.rule_id);
          if (deleted) {
            console.log(`  ✓ Deleted: ${rule.name}`);
            stats.deleted++;
          } else {
            console.log(`  ⚠ Not found: ${rule.name}`);
          }
        } catch (error: any) {
          console.error(`  ✗ Failed to delete ${rule.name}: ${error.message}`);
          stats.failed++;
        }
      }
    }
  } catch (error: any) {
    console.error(`  ✗ Failed to search coupons: ${error.message}`);
  }

  return stats;
}

/**
 * Main cleanup function
 */
async function cleanupAll(dryRun: boolean = false): Promise<void> {
  console.log('='.repeat(60));
  console.log(`🧹 Fixture Cleanup${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n⚠ DRY RUN MODE - No changes will be made\n');
  }

  // Validate environment
  if (!process.env.BASE_URL && !process.env.url) {
    console.error('✗ BASE_URL environment variable is required');
    process.exit(1);
  }

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    console.error('✗ ADMIN_USER and ADMIN_PASS environment variables are required');
    process.exit(1);
  }

  const client = createApiClient();

  try {
    // Authenticate
    await client.authenticate();

    // Delete fixtures
    const stats: CleanupStats = {
      products: await deleteProducts(client, dryRun),
      customers: await deleteCustomers(client, dryRun),
      coupons: await deleteCoupons(client, dryRun),
    };

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`\n  Products:  ${stats.products.deleted}/${stats.products.found} deleted`);
    console.log(`  Customers: ${stats.customers.deleted}/${stats.customers.found} deleted`);
    console.log(`  Coupons:   ${stats.coupons.deleted}/${stats.coupons.found} deleted`);

    const totalFailed =
      stats.products.failed + stats.customers.failed + stats.coupons.failed;

    if (totalFailed > 0) {
      console.log(`\n  ⚠ ${totalFailed} item(s) failed to delete`);
    }

    if (dryRun) {
      console.log('\n  ℹ This was a dry run. Run without --dry to actually delete.');
    } else {
      console.log('\n  ⚠ Remember to flush Magento cache: bin/magento cache:flush');
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Cleanup ${dryRun ? 'preview' : 'complete'}`);
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('\n✗ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
const dryRun = process.argv.includes('--dry') || process.argv.includes('-d');

cleanupAll(dryRun).catch(console.error);

export { cleanupAll, deleteProducts, deleteCustomers, deleteCoupons };
