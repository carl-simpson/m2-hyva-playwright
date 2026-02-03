#!/usr/bin/env ts-node
/**
 * Seed All Fixtures
 *
 * Creates all test fixtures (products, customers, coupons) via Magento REST API.
 *
 * Usage:
 *   npm run seed:fixtures         # Seed all fixtures for default tier (B)
 *   npm run seed:fixtures -- A    # Seed fixtures for Tier A only
 *   npm run seed:fixtures -- B    # Seed fixtures for Tier B
 *   npm run seed:fixtures -- C    # Seed all fixtures
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { MagentoApiClient, createApiClient } from './api-client';
import productsManifest from '../manifest/products.manifest.json';
import customersManifest from '../manifest/customers.manifest.json';
import couponsManifest from '../manifest/coupons.manifest.json';

type Tier = 'A' | 'B' | 'C';

interface ProductFixture {
  id: string;
  type: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  status?: string;
  visibility?: string;
  description?: string;
  shortDescription?: string;
  tier: Tier[];
}

interface CustomerFixture {
  id: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  addresses?: Array<{
    type: string;
    firstname?: string;
    lastname?: string;
    street: string;
    city: string;
    region?: string;
    postcode: string;
    country: string;
    telephone: string;
  }>;
  tier: Tier[];
}

interface CouponFixture {
  id: string;
  code: string;
  name: string;
  type: string;
  discount_amount: number;
  minimum_order?: number;
  apply_to_shipping?: boolean;
  free_shipping?: boolean;
  tier: Tier[];
}

/**
 * Seed products from manifest
 */
async function seedProducts(client: MagentoApiClient, tier: Tier): Promise<void> {
  console.log('\n📦 Seeding Products...');

  const products = (productsManifest.fixtures as ProductFixture[]).filter((p) =>
    p.tier.includes(tier)
  );

  for (const product of products) {
    try {
      // Check if product already exists
      const existing = await client.getProduct(product.sku);

      if (existing) {
        console.log(`  ⚠ Product already exists: ${product.sku}`);
        continue;
      }

      await client.createProduct({
        sku: product.sku,
        name: product.name,
        price: product.price,
        qty: product.qty,
        status: product.status === 'disabled' ? 2 : 1,
        visibility: 4, // Catalog, Search
        description: product.description,
        shortDescription: product.shortDescription,
      });

      console.log(`  ✓ Created product: ${product.sku} (${product.name})`);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      console.error(`  ✗ Failed to create ${product.sku}: ${message}`);
    }
  }
}

/**
 * Seed customers from manifest
 */
async function seedCustomers(client: MagentoApiClient, tier: Tier): Promise<void> {
  console.log('\n👤 Seeding Customers...');

  const customers = (customersManifest.fixtures as CustomerFixture[]).filter((c) =>
    c.tier.includes(tier)
  );

  for (const customer of customers) {
    try {
      // Check if customer already exists
      const existing = await client.getCustomerByEmail(customer.email);

      if (existing) {
        console.log(`  ⚠ Customer already exists: ${customer.email}`);
        continue;
      }

      const addresses = customer.addresses?.map((addr) => ({
        firstname: addr.firstname || customer.firstname,
        lastname: addr.lastname || customer.lastname,
        street: [addr.street],
        city: addr.city,
        region: addr.region ? { region: addr.region } : undefined,
        postcode: addr.postcode,
        countryId: addr.country,
        telephone: addr.telephone,
        defaultShipping: addr.type.includes('shipping'),
        defaultBilling: addr.type.includes('billing'),
      }));

      await client.createCustomer({
        email: customer.email,
        firstname: customer.firstname,
        lastname: customer.lastname,
        password: customer.password,
        addresses,
      });

      console.log(`  ✓ Created customer: ${customer.email}`);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;

      if (message.includes('already exists') || message.includes('already registered')) {
        console.log(`  ⚠ Customer already exists: ${customer.email}`);
      } else {
        console.error(`  ✗ Failed to create ${customer.email}: ${message}`);
      }
    }
  }
}

/**
 * Seed coupons from manifest
 */
async function seedCoupons(client: MagentoApiClient, tier: Tier): Promise<void> {
  console.log('\n🎟️  Seeding Coupons...');

  const coupons = (couponsManifest.fixtures as CouponFixture[]).filter((c) =>
    c.tier.includes(tier)
  );

  for (const coupon of coupons) {
    try {
      // Check if coupon already exists
      const existing = await client.getCouponByCode(coupon.code);

      if (existing) {
        console.log(`  ⚠ Coupon already exists: ${coupon.code}`);
        continue;
      }

      // Map coupon type
      let discountType: 'by_percent' | 'by_fixed' | 'cart_fixed' | 'buy_x_get_y';
      switch (coupon.type) {
        case 'percentage':
          discountType = 'by_percent';
          break;
        case 'fixed':
          discountType = 'cart_fixed';
          break;
        default:
          discountType = 'by_percent';
      }

      await client.createCouponRule({
        name: coupon.name,
        code: coupon.code,
        discountType,
        discountAmount: coupon.discount_amount,
        applyToShipping: coupon.apply_to_shipping,
      });

      console.log(`  ✓ Created coupon: ${coupon.code} (${coupon.name})`);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;

      if (message.includes('already exists')) {
        console.log(`  ⚠ Coupon already exists: ${coupon.code}`);
      } else {
        console.error(`  ✗ Failed to create ${coupon.code}: ${message}`);
      }
    }
  }
}

/**
 * Main seeding function
 */
async function seedAll(tier: Tier = 'B'): Promise<void> {
  console.log('='.repeat(60));
  console.log(`🌱 Fixture Seeding - Tier ${tier}`);
  console.log('='.repeat(60));

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

    // Seed fixtures
    await seedProducts(client, tier);
    await seedCustomers(client, tier);
    await seedCoupons(client, tier);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fixture seeding complete for Tier ${tier}`);
    console.log('='.repeat(60));
    console.log('\n⚠ Remember to flush Magento cache: bin/magento cache:flush');
  } catch (error: any) {
    console.error('\n✗ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
const tierArg = process.argv[2]?.toUpperCase() as Tier | undefined;
const tier: Tier = ['A', 'B', 'C'].includes(tierArg || '') ? (tierArg as Tier) : 'B';

seedAll(tier).catch(console.error);

export { seedAll, seedProducts, seedCustomers, seedCoupons };
