/**
 * Test Data Loader
 *
 * Provides functions to load test fixtures from manifests.
 * Supports tier-based filtering for the 3-tier test strategy.
 */

import productsManifest from '../manifest/products.manifest.json';
import customersManifest from '../manifest/customers.manifest.json';
import couponsManifest from '../manifest/coupons.manifest.json';

export type Tier = 'A' | 'B' | 'C';

// Product fixture interface
export interface ProductFixture {
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

// Customer fixture interface
export interface CustomerFixture {
  id: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  addresses?: CustomerAddress[];
  tier: Tier[];
}

export interface CustomerAddress {
  type: string;
  firstname?: string;
  lastname?: string;
  street: string;
  city: string;
  region?: string;
  postcode: string;
  country: string;
  telephone: string;
}

// Coupon fixture interface
export interface CouponFixture {
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
 * Get all product fixtures
 */
export function getAllProducts(): ProductFixture[] {
  return productsManifest.fixtures as ProductFixture[];
}

/**
 * Get products for a specific tier
 */
export function getProductsForTier(tier: Tier): ProductFixture[] {
  return getAllProducts().filter((p) => p.tier.includes(tier));
}

/**
 * Get product by ID
 */
export function getProductById(id: string): ProductFixture | undefined {
  return getAllProducts().find((p) => p.id === id);
}

/**
 * Get product by SKU
 */
export function getProductBySku(sku: string): ProductFixture | undefined {
  return getAllProducts().find((p) => p.sku === sku);
}

/**
 * Get a simple product for testing
 * Returns the basic simple product (TEST_SIMPLE_001)
 */
export function getSimpleProduct(): ProductFixture {
  const product = getProductById('simple_product_basic');
  if (!product) {
    throw new Error('Basic simple product not found in manifest');
  }
  return product;
}

/**
 * Get out of stock product for testing
 */
export function getOutOfStockProduct(): ProductFixture {
  const product = getProductById('simple_product_oos');
  if (!product) {
    throw new Error('Out of stock product not found in manifest');
  }
  return product;
}

/**
 * Get low stock product for testing
 */
export function getLowStockProduct(): ProductFixture {
  const product = getProductById('simple_product_low_stock');
  if (!product) {
    throw new Error('Low stock product not found in manifest');
  }
  return product;
}

/**
 * Get all customer fixtures
 */
export function getAllCustomers(): CustomerFixture[] {
  return customersManifest.fixtures as CustomerFixture[];
}

/**
 * Get customers for a specific tier
 */
export function getCustomersForTier(tier: Tier): CustomerFixture[] {
  return getAllCustomers().filter((c) => c.tier.includes(tier));
}

/**
 * Get customer by ID
 */
export function getCustomerById(id: string): CustomerFixture | undefined {
  return getAllCustomers().find((c) => c.id === id);
}

/**
 * Get customer by email
 */
export function getCustomerByEmail(email: string): CustomerFixture | undefined {
  return getAllCustomers().find((c) => c.email === email);
}

/**
 * Get the basic test customer
 */
export function getTestCustomer(): CustomerFixture {
  const customer = getCustomerById('test_customer_basic');
  if (!customer) {
    throw new Error('Basic test customer not found in manifest');
  }
  return customer;
}

/**
 * Get customer with multiple addresses
 */
export function getMultiAddressCustomer(): CustomerFixture {
  const customer = getCustomerById('test_customer_multi_address');
  if (!customer) {
    throw new Error('Multi-address customer not found in manifest');
  }
  return customer;
}

/**
 * Get EU customer for international testing
 */
export function getEUCustomer(): CustomerFixture {
  const customer = getCustomerById('test_customer_eu');
  if (!customer) {
    throw new Error('EU customer not found in manifest');
  }
  return customer;
}

/**
 * Get all coupon fixtures
 */
export function getAllCoupons(): CouponFixture[] {
  return couponsManifest.fixtures as CouponFixture[];
}

/**
 * Get coupons for a specific tier
 */
export function getCouponsForTier(tier: Tier): CouponFixture[] {
  return getAllCoupons().filter((c) => c.tier.includes(tier));
}

/**
 * Get coupon by ID
 */
export function getCouponById(id: string): CouponFixture | undefined {
  return getAllCoupons().find((c) => c.id === id);
}

/**
 * Get coupon by code
 */
export function getCouponByCode(code: string): CouponFixture | undefined {
  return getAllCoupons().find((c) => c.code === code);
}

/**
 * Get percentage discount coupon
 */
export function getPercentageCoupon(): CouponFixture {
  const coupon = getCouponById('coupon_10_percent');
  if (!coupon) {
    throw new Error('Percentage coupon not found in manifest');
  }
  return coupon;
}

/**
 * Get fixed amount coupon
 */
export function getFixedCoupon(): CouponFixture {
  const coupon = getCouponById('coupon_5_fixed');
  if (!coupon) {
    throw new Error('Fixed coupon not found in manifest');
  }
  return coupon;
}

/**
 * Get free shipping coupon
 */
export function getFreeShippingCoupon(): CouponFixture {
  const coupon = getCouponById('coupon_free_shipping');
  if (!coupon) {
    throw new Error('Free shipping coupon not found in manifest');
  }
  return coupon;
}

/**
 * Get current test tier from environment
 */
export function getCurrentTier(): Tier {
  const tier = process.env.TEST_TIER?.toUpperCase() as Tier;
  return ['A', 'B', 'C'].includes(tier) ? tier : 'B';
}

/**
 * Get all fixtures for current tier
 */
export function getFixturesForCurrentTier() {
  const tier = getCurrentTier();
  return {
    tier,
    products: getProductsForTier(tier),
    customers: getCustomersForTier(tier),
    coupons: getCouponsForTier(tier),
  };
}
