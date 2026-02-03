/**
 * Extended Playwright Fixtures
 *
 * Provides test fixtures for the 3-tier testing strategy:
 * - Test data from manifests (products, customers, coupons)
 * - Pre-authenticated customer sessions
 * - Cart with items ready for checkout
 * - Helper functions for common operations
 */

import { test as baseTest, Page, BrowserContext } from '@playwright/test';
import * as testData from './test-data';
import * as helpers from './helpers';
import { getConfig, EnvConfig } from '../../utils/env';

// Re-export test data and helpers for convenience
export * from './test-data';
export * from './helpers';

/**
 * Test fixture types
 */
interface TestFixtures {
  // Environment config
  config: EnvConfig;

  // Test data
  testProduct: testData.ProductFixture;
  testCustomer: testData.CustomerFixture;
  testCoupon: testData.CouponFixture;

  // Authenticated page
  authenticatedPage: Page;

  // Page with cart items
  cartWithProduct: Page;

  // Helper functions bound to page
  testHelpers: BoundHelpers;
}

/**
 * Helper functions bound to the current page
 */
interface BoundHelpers {
  login: (customer?: testData.CustomerFixture) => Promise<void>;
  logout: () => Promise<void>;
  goToProduct: (product: testData.ProductFixture) => Promise<void>;
  addToCart: (quantity?: number) => Promise<void>;
  goToCart: () => Promise<void>;
  goToCheckout: () => Promise<void>;
  applyCoupon: (coupon: testData.CouponFixture | string) => Promise<void>;
  getCartTotal: () => Promise<number>;
  getCartItemCount: () => Promise<number>;
  clearCart: () => Promise<void>;
  waitForPageReady: () => Promise<void>;
  isLoggedIn: () => Promise<boolean>;
}

/**
 * Extended test with fixtures
 */
export const test = baseTest.extend<TestFixtures>({
  /**
   * Environment configuration fixture
   */
  config: async ({}, use) => {
    const config = getConfig();
    await use(config);
  },

  /**
   * Test product fixture - provides the basic test product
   */
  testProduct: async ({}, use) => {
    const product = testData.getSimpleProduct();
    await use(product);
  },

  /**
   * Test customer fixture - provides the basic test customer
   */
  testCustomer: async ({}, use) => {
    const customer = testData.getTestCustomer();
    await use(customer);
  },

  /**
   * Test coupon fixture - provides the percentage coupon
   */
  testCoupon: async ({}, use) => {
    const coupon = testData.getPercentageCoupon();
    await use(coupon);
  },

  /**
   * Authenticated page fixture
   * Provides a page with the test customer already logged in
   */
  authenticatedPage: async ({ page, testCustomer }, use) => {
    await helpers.loginAsCustomer(page, testCustomer);
    await use(page);
    // Cleanup: logout after test
    await helpers.logout(page);
  },

  /**
   * Cart with product fixture
   * Provides a page with a product already in the cart
   */
  cartWithProduct: async ({ page, testProduct, config }, use) => {
    // Navigate to product page
    await helpers.goToProductByUrl(page, testProduct.sku.toLowerCase().replace(/_/g, '-'));

    // Add product to cart
    await helpers.addToCart(page, 1);

    await use(page);

    // Cleanup: clear cart after test
    try {
      await helpers.clearCart(page);
    } catch {
      // Ignore cleanup errors
    }
  },

  /**
   * Test helpers bound to current page
   */
  testHelpers: async ({ page, testCustomer }, use) => {
    const boundHelpers: BoundHelpers = {
      login: (customer?: testData.CustomerFixture) =>
        helpers.loginAsCustomer(page, customer || testCustomer),
      logout: () => helpers.logout(page),
      goToProduct: (product: testData.ProductFixture) =>
        helpers.goToProduct(page, product),
      addToCart: (quantity?: number) => helpers.addToCart(page, quantity),
      goToCart: () => helpers.goToCart(page),
      goToCheckout: () => helpers.goToCheckout(page),
      applyCoupon: (coupon: testData.CouponFixture | string) =>
        helpers.applyCoupon(page, coupon),
      getCartTotal: () => helpers.getCartTotal(page),
      getCartItemCount: () => helpers.getCartItemCount(page),
      clearCart: () => helpers.clearCart(page),
      waitForPageReady: () => helpers.waitForPageReady(page),
      isLoggedIn: () => helpers.isLoggedIn(page),
    };

    await use(boundHelpers);
  },
});

/**
 * Export expect for assertions
 */
export { expect } from '@playwright/test';

/**
 * Export describe for test grouping
 */
export const describe = test.describe;

/**
 * Create custom fixture for specific test scenarios
 */
export function createCustomFixture<T extends object>(
  fixtures: Partial<TestFixtures> & T
) {
  return test.extend<T>(fixtures as any);
}

/**
 * Test data getters for use in tests
 */
export const TestData = {
  // Products
  getSimpleProduct: testData.getSimpleProduct,
  getOutOfStockProduct: testData.getOutOfStockProduct,
  getLowStockProduct: testData.getLowStockProduct,
  getProductById: testData.getProductById,
  getProductBySku: testData.getProductBySku,
  getProductsForTier: testData.getProductsForTier,

  // Customers
  getTestCustomer: testData.getTestCustomer,
  getMultiAddressCustomer: testData.getMultiAddressCustomer,
  getEUCustomer: testData.getEUCustomer,
  getCustomerById: testData.getCustomerById,
  getCustomerByEmail: testData.getCustomerByEmail,
  getCustomersForTier: testData.getCustomersForTier,

  // Coupons
  getPercentageCoupon: testData.getPercentageCoupon,
  getFixedCoupon: testData.getFixedCoupon,
  getFreeShippingCoupon: testData.getFreeShippingCoupon,
  getCouponById: testData.getCouponById,
  getCouponByCode: testData.getCouponByCode,
  getCouponsForTier: testData.getCouponsForTier,

  // Tier management
  getCurrentTier: testData.getCurrentTier,
  getFixturesForCurrentTier: testData.getFixturesForCurrentTier,
};

/**
 * Helper functions for direct use
 */
export const Helpers = {
  loginAsCustomer: helpers.loginAsCustomer,
  logout: helpers.logout,
  goToProduct: helpers.goToProduct,
  goToProductByUrl: helpers.goToProductByUrl,
  addToCart: helpers.addToCart,
  goToCart: helpers.goToCart,
  goToCheckout: helpers.goToCheckout,
  applyCoupon: helpers.applyCoupon,
  removeCoupon: helpers.removeCoupon,
  getCartTotal: helpers.getCartTotal,
  getCartItemCount: helpers.getCartItemCount,
  clearCart: helpers.clearCart,
  waitForPageReady: helpers.waitForPageReady,
  takeScreenshot: helpers.takeScreenshot,
  elementExists: helpers.elementExists,
  getTextContent: helpers.getTextContent,
  waitForText: helpers.waitForText,
  scrollIntoView: helpers.scrollIntoView,
  getUrlPath: helpers.getUrlPath,
  isLoggedIn: helpers.isLoggedIn,
  formatPrice: helpers.formatPrice,
};
