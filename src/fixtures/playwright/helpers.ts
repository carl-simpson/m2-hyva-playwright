/**
 * Test Helpers
 *
 * Common helper functions for E2E testing with Playwright.
 * Provides reusable operations for login, cart management, and navigation.
 */

import { Page, expect } from '@playwright/test';
import { CustomerFixture, ProductFixture, CouponFixture } from './test-data';
import { getConfig } from '../../utils/env';

/**
 * Login helper - logs in a customer
 */
export async function loginAsCustomer(
  page: Page,
  customer: CustomerFixture
): Promise<void> {
  const config = getConfig();
  const loginUrl = `${config.baseUrl}/customer/account/login`;

  await page.goto(loginUrl);
  await page.waitForLoadState('domcontentloaded');

  // Fill login form - use data-testid selectors where available, fallback to standard selectors
  const emailField = page.locator('[data-testid="login-email-input"], #email');
  const passwordField = page.locator('[data-testid="login-password-input"], #pass');
  const loginButton = page.locator('[data-testid="login-submit-button"], button[type="submit"]:has-text("Sign In"), #send2');

  await emailField.fill(customer.email);
  await passwordField.fill(customer.password);
  await loginButton.click();

  await page.waitForLoadState('networkidle');

  // Verify login was successful - should redirect to account page
  await expect(page).toHaveURL(/customer\/account/);
}

/**
 * Logout helper - logs out the current customer
 */
export async function logout(page: Page): Promise<void> {
  const config = getConfig();
  const logoutUrl = `${config.baseUrl}/customer/account/logout`;

  await page.goto(logoutUrl);
  await page.waitForLoadState('domcontentloaded');

  // Wait for logout to complete
  await page.waitForTimeout(2000);
}

/**
 * Navigate to product page by SKU
 */
export async function goToProduct(page: Page, product: ProductFixture): Promise<void> {
  const config = getConfig();

  // Convert SKU to URL key (lowercase, replace underscores with hyphens)
  const urlKey = product.sku.toLowerCase().replace(/_/g, '-');
  const productUrl = `${config.baseUrl}/${urlKey}.html`;

  await page.goto(productUrl);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to product page by URL key
 */
export async function goToProductByUrl(page: Page, urlKey: string): Promise<void> {
  const config = getConfig();
  const productUrl = `${config.baseUrl}/${urlKey}.html`;

  await page.goto(productUrl);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Add product to cart from PDP
 */
export async function addToCart(
  page: Page,
  quantity: number = 1
): Promise<void> {
  // Set quantity if not 1
  if (quantity !== 1) {
    const qtyField = page.locator('[data-testid="pdp-qty-input"], #qty, input[name="qty"]');
    await qtyField.fill(quantity.toString());
  }

  // Click add to cart button
  const addToCartButton = page.locator(
    '[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button:has-text("Add to Cart")'
  );
  await addToCartButton.click();

  // Wait for cart update
  await page.waitForLoadState('networkidle');

  // Wait for success message or cart counter update
  await page.waitForSelector(
    '.message-success, [data-testid="cart-counter"], .counter-number',
    { timeout: 10000 }
  );
}

/**
 * Add product to cart directly via API
 * Faster than UI interaction for setup
 */
export async function addProductToCartViaApi(
  page: Page,
  sku: string,
  quantity: number = 1
): Promise<void> {
  const config = getConfig();

  // Use the storefront GraphQL endpoint
  const response = await page.evaluate(
    async ({ baseUrl, sku, qty }) => {
      const mutation = `
        mutation AddToCart($sku: String!, $qty: Float!) {
          addProductsToCart(
            cartId: "",
            cartItems: [{ sku: $sku, quantity: $qty }]
          ) {
            cart {
              items {
                id
                product {
                  sku
                  name
                }
                quantity
              }
            }
          }
        }
      `;

      // First create or get cart
      const cartResponse = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { createEmptyCart }`,
        }),
      });

      return cartResponse.json();
    },
    { baseUrl: config.baseUrl, sku, qty: quantity }
  );

  // Refresh page to update cart state
  await page.reload();
}

/**
 * Navigate to cart page
 */
export async function goToCart(page: Page): Promise<void> {
  const config = getConfig();
  await page.goto(`${config.baseUrl}/checkout/cart`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to checkout page
 */
export async function goToCheckout(page: Page): Promise<void> {
  const config = getConfig();
  await page.goto(`${config.baseUrl}/checkout`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Apply coupon code in cart
 */
export async function applyCoupon(
  page: Page,
  coupon: CouponFixture | string
): Promise<void> {
  const code = typeof coupon === 'string' ? coupon : coupon.code;

  // Expand coupon section if collapsed
  const couponToggle = page.locator(
    '[data-testid="cart-coupon-toggle"], #block-discount-heading, .title:has-text("Apply Discount Code")'
  );

  // Check if toggle is visible and click to expand
  if (await couponToggle.isVisible()) {
    await couponToggle.click();
  }

  // Fill coupon code
  const couponInput = page.locator(
    '[data-testid="cart-coupon-input"], #coupon_code, input[name="coupon_code"]'
  );
  await couponInput.fill(code);

  // Click apply button
  const applyButton = page.locator(
    '[data-testid="cart-coupon-apply-button"], button:has-text("Apply"), #discount-coupon-form button[type="submit"]'
  );
  await applyButton.click();

  await page.waitForLoadState('networkidle');
}

/**
 * Remove coupon code in cart
 */
export async function removeCoupon(page: Page): Promise<void> {
  const cancelButton = page.locator(
    '[data-testid="cart-coupon-cancel-button"], button:has-text("Cancel coupon"), #coupon-form button:has-text("Cancel")'
  );

  if (await cancelButton.isVisible()) {
    await cancelButton.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Get cart total from the page
 */
export async function getCartTotal(page: Page): Promise<number> {
  const totalElement = page.locator(
    '[data-testid="cart-grand-total"], .grand.totals .price, td[data-th="Order Total"] .price'
  );

  const totalText = await totalElement.textContent();
  if (!totalText) {
    throw new Error('Could not find cart total');
  }

  // Parse price (remove currency symbol and convert to number)
  const numericValue = totalText.replace(/[^0-9.,]/g, '').replace(',', '');
  return parseFloat(numericValue);
}

/**
 * Get cart item count
 */
export async function getCartItemCount(page: Page): Promise<number> {
  const counter = page.locator(
    '[data-testid="cart-counter"], .counter-number, .minicart-wrapper .counter-number'
  );

  if (!(await counter.isVisible())) {
    return 0;
  }

  const countText = await counter.textContent();
  return parseInt(countText || '0', 10);
}

/**
 * Clear the cart (remove all items)
 */
export async function clearCart(page: Page): Promise<void> {
  await goToCart(page);

  // Find all remove buttons and click them
  const removeButtons = page.locator(
    '[data-testid="cart-item-remove"], .action-delete, a.action.action-delete'
  );

  const count = await removeButtons.count();

  for (let i = count - 1; i >= 0; i--) {
    await removeButtons.nth(i).click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Wait for page to be fully loaded (including AJAX)
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');

  // Wait for any loading indicators to disappear
  const loadingIndicator = page.locator('.loading-mask, .loader, [data-testid="loading"]');
  if (await loadingIndicator.isVisible()) {
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  fullPage: boolean = false
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage,
  });
}

/**
 * Check if element exists on page
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return (await element.count()) > 0;
}

/**
 * Get text content safely (returns empty string if element not found)
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  if ((await element.count()) === 0) {
    return '';
  }
  return (await element.textContent()) || '';
}

/**
 * Wait for element to contain text
 */
export async function waitForText(
  page: Page,
  selector: string,
  text: string,
  timeout: number = 10000
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toContainText(text, { timeout });
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
}

/**
 * Get the current URL path (without base URL)
 */
export function getUrlPath(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for common logged-in indicators
  const logoutLink = page.locator('a[href*="logout"], [data-testid="logout-link"]');
  const welcomeMessage = page.locator('.logged-in, .welcome:has-text("Welcome")');

  return (await logoutLink.isVisible()) || (await welcomeMessage.isVisible());
}

/**
 * Format price for comparison
 */
export function formatPrice(price: number, locale: string = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'en-GB' ? 'GBP' : 'EUR',
  }).format(price);
}
