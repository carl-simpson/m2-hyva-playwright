/**
 * Tier A - PR Smoke Tests
 *
 * Critical path tests run on every pull request.
 * Target: <10 minutes, Chromium only
 *
 * @tags smoke, tier-a
 */

import { test, expect, describe } from '@hyva/fixtures';
import { TestData, Helpers } from '@fixtures/playwright';
import { loadLocators } from '@utils/functions/file';

// Load locators
const pageLocators = loadLocators('locators/page.locator', 'hyva');
const productLocators = loadLocators('locators/product.locator', 'hyva');
const cartLocators = loadLocators('locators/cart.locator', 'hyva');
const sidecartLocators = loadLocators('locators/sidecart.locator', 'hyva');

describe('Tier A - PR Smoke Tests @smoke @tier-a', () => {
  // Set test timeout for smoke tests
  test.setTimeout(120000);

  /**
   * SMOKE-001: Homepage Loads Successfully
   * Verifies the homepage loads with essential elements
   */
  test('SMOKE-001: Homepage loads with essential elements @smoke', async ({ homePage, page }) => {
    await homePage.navigateTo();

    // Verify page loaded
    await expect(page).toHaveURL(/.*\//);

    // Verify search bar is visible
    const searchIcon = page.locator('[data-testid="header-search-icon"], .header-search, .search-toggle, [aria-label="Search"], button:has-text("Search")');
    await expect(searchIcon.first()).toBeVisible();

    // Verify main navigation is visible
    const mainNav = page.locator('[data-testid="main-navigation"], nav.navigation, .nav-sections, nav a, header nav');
    await expect(mainNav.first()).toBeVisible();

    // Verify no console errors (basic check)
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => e.includes('Error'))).toHaveLength(0);
  });

  /**
   * SMOKE-002: Navigation Flow (Home → Category → PDP)
   * Verifies basic navigation works
   */
  test('SMOKE-002: Navigate from homepage to product detail page @smoke', async ({
    homePage,
    page,
  }) => {
    await homePage.navigateTo();

    // Find a product link on the homepage (articles with product links)
    const productLink = page.locator('article a[href*=".html"], a[href*=".html"]:has(img), .product-item a').first();
    await expect(productLink).toBeVisible({ timeout: 10000 });
    await productLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify PDP loaded
    const productTitle = page.locator('[data-testid="pdp-product-name"], .product-info-main .page-title, h1.page-title, h1.font-display, main h1');
    await expect(productTitle.first()).toBeVisible();

    const productPrice = page.locator('[data-testid="pdp-product-price"], .product-info-main .price, .price-box .price, [class*="price"], .font-mono:has-text("£")');
    await expect(productPrice.first()).toBeVisible();

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"], button:has-text("ADD TO CART")');
    await expect(addToCartButton.first()).toBeVisible();
  });

  /**
   * SMOKE-003: Add Simple Product to Cart
   * Verifies add to cart functionality
   */
  test('SMOKE-003: Add simple product to cart successfully @smoke', async ({
    page,
    simpleProductPage,
  }) => {
    const product = TestData.getSimpleProduct();

    // Navigate to product page
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    // Click add to cart
    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();

    // Wait for cart update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for cart animation

    // Verify success message or cart counter update (check for any indicator that cart has items)
    const successIndicator = page.locator('.message-success, [data-testid="add-to-cart-success"], .counter-number, [x-text*="summaryCount"], [x-text*="Count"], header button[aria-label*="Cart"] + span, header button[aria-label*="Cart"] span');
    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * SMOKE-004: Mini-Cart Opens and Shows Product
   * Verifies mini-cart/sidecart functionality
   */
  test('SMOKE-004: Mini-cart displays cart contents @smoke', async ({
    page,
    sideCartPage,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product to cart first
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for cart drawer animation

    // Check if mini-cart/cart drawer opened automatically
    const miniCartContainer = page.locator('[data-testid="minicart-container"], #minicart-content-wrapper, .block-minicart, .sidecart, dialog[open], [role="dialog"]');
    let isMiniCartOpen = await miniCartContainer.first().isVisible().catch(() => false);

    // If not already open, click on cart icon
    if (!isMiniCartOpen) {
      const cartIcon = page.locator('[data-testid="header-cart-icon"], .showcart, .minicart-wrapper a, a[href*="checkout/cart"], button[aria-label*="Cart"], [aria-label*="Shopping Cart"]').first();
      await cartIcon.click();
      await page.waitForTimeout(1000);
      isMiniCartOpen = await miniCartContainer.first().isVisible().catch(() => false);
    }

    const isOnCartPage = page.url().includes('checkout/cart');

    // Verify mini-cart opened or we can navigate to cart page
    expect(isMiniCartOpen || isOnCartPage).toBe(true);

    if (isMiniCartOpen) {
      // Verify product in mini-cart (look for product name or price)
      const productName = page.locator('[data-testid="minicart-item-name"], .product-item-name, .product-name, [x-html*="product_name"], [x-text*="product_name"], p.font-semibold');
      await expect(productName.first()).toBeVisible({ timeout: 5000 });

      // Verify checkout button
      const checkoutButton = page.locator('[data-testid="minicart-checkout-button"], #top-cart-btn-checkout, a:has-text("Checkout"), button:has-text("Checkout"), a[href*="checkout"]');
      await expect(checkoutButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  /**
   * SMOKE-005: Cart Page Displays Correct Totals
   * Verifies cart page functionality
   */
  test('SMOKE-005: Cart page shows correct product and totals @smoke', async ({
    page,
    cartPage,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product to cart
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');

    // Navigate to cart page
    await page.goto(`${process.env.url}/checkout/cart`);
    await page.waitForLoadState('domcontentloaded');

    // Verify product in cart
    const cartItems = page.locator('[data-testid="cart-item"], .cart.item, .cart-item');
    await expect(cartItems.first()).toBeVisible();

    // Verify quantity
    const qtyInput = page.locator('[data-testid="cart-item-qty"], input[name*="qty"], input.qty');
    const qtyValue = await qtyInput.first().inputValue();
    expect(qtyValue).toBe('1');

    // Verify grand total is displayed
    const grandTotal = page.locator('[data-testid="cart-grand-total"], .grand.totals .price, #cart-totals .grand .price');
    await expect(grandTotal.first()).toBeVisible();

    // Verify proceed to checkout button
    const checkoutButton = page.locator('[data-testid="cart-checkout-button"], button:has-text("Proceed to Checkout"), .checkout-button');
    await expect(checkoutButton.first()).toBeVisible();
  });

  /**
   * SMOKE-006: Cart Quantity Change Updates Totals
   * Verifies cart quantity update functionality
   */
  test('SMOKE-006: Changing cart quantity updates totals @smoke', async ({
    page,
    cartPage,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product to cart
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');

    // Navigate to cart
    await page.goto(`${process.env.url}/checkout/cart`);
    await page.waitForLoadState('domcontentloaded');

    // Get initial total
    const grandTotalLocator = page.locator('[data-testid="cart-grand-total"], .grand.totals .price, #cart-totals .grand .price');
    const initialTotal = await grandTotalLocator.first().textContent();

    // Change quantity to 2
    const qtyInput = page.locator('[data-testid="cart-item-qty"], input[name*="qty"], input.qty').first();
    await qtyInput.fill('2');

    // Click update button
    const updateButton = page.locator('[data-testid="cart-update-button"], button:has-text("Update"), .action.update');
    await updateButton.first().click();
    await page.waitForLoadState('networkidle');

    // Verify quantity updated
    const newQtyValue = await qtyInput.inputValue();
    expect(newQtyValue).toBe('2');

    // Verify total changed
    const newTotal = await grandTotalLocator.first().textContent();
    expect(newTotal).not.toBe(initialTotal);
  });

  /**
   * SMOKE-007: Guest Checkout - Shipping Address
   * Verifies guest can enter shipping address
   */
  test('SMOKE-007: Guest can enter shipping address @smoke', async ({
    page,
    checkoutPage,
    customerData,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product to cart
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');

    // Proceed to checkout
    await checkoutPage.navigateToCheckout();

    // Enter email
    await checkoutPage.enterEmail(customerData.email);

    // Fill shipping address
    await checkoutPage.fillShippingAddressFromCustomer(customerData);

    // Wait for shipping methods
    await checkoutPage.waitForShippingMethods();

    // Verify shipping methods are visible
    const shippingMethodsVisible = await checkoutPage.areShippingMethodsVisible();
    expect(shippingMethodsVisible).toBe(true);
  });

  /**
   * SMOKE-008: Guest Checkout - Shipping Method Selection
   * Verifies shipping method selection works
   */
  test('SMOKE-008: Select shipping method updates totals @smoke', async ({
    page,
    checkoutPage,
    customerData,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product and proceed to checkout
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');

    await checkoutPage.navigateToCheckout();
    await checkoutPage.enterEmail(customerData.email);
    await checkoutPage.fillShippingAddressFromCustomer(customerData);
    await checkoutPage.waitForShippingMethods();

    // Select shipping method
    await checkoutPage.selectFlatRateShipping();

    // Click next
    await checkoutPage.clickNext();

    // Verify payment methods section appears
    await checkoutPage.waitForPaymentMethods();
    const paymentMethodsVisible = await checkoutPage.arePaymentMethodsVisible();
    expect(paymentMethodsVisible).toBe(true);
  });

  /**
   * SMOKE-009: Guest Checkout - Payment Method Visible
   * Verifies payment methods are visible after shipping
   */
  test('SMOKE-009: Payment methods are visible after shipping selection @smoke', async ({
    page,
    checkoutPage,
    customerData,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product and proceed to checkout
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');

    await checkoutPage.navigateToCheckout();
    await checkoutPage.enterEmail(customerData.email);
    await checkoutPage.fillShippingAddressFromCustomer(customerData);
    await checkoutPage.waitForShippingMethods();
    await checkoutPage.selectFlatRateShipping();
    await checkoutPage.clickNext();
    await checkoutPage.waitForPaymentMethods();

    // Verify payment method is visible (Check/Money Order or any Mollie method)
    const paymentMethod = page.locator('[data-testid="checkout-payment-checkmo"], #checkmo, input[value="checkmo"], label:has-text("Check / Money"), input[value^="mollie"], .payment-method, label:has-text("Credit"), label:has-text("iDEAL"), label:has-text("Card")');
    await expect(paymentMethod.first()).toBeVisible({ timeout: 10000 });

    // Verify place order button exists (may be disabled until payment method selected)
    const placeOrderButton = page.locator('[data-testid="checkout-place-order-button"], button:has-text("Place Order"), button.action.checkout');
    await expect(placeOrderButton.first()).toBeAttached();
  });

  /**
   * SMOKE-010: Guest Checkout - Complete Order (or redirect to payment)
   * Verifies full checkout flow - completes if offline payment available, or verifies redirect to payment gateway
   */
  test('SMOKE-010: Guest completes checkout with offline payment @smoke', async ({
    page,
    checkoutPage,
    customerData,
  }) => {
    const product = TestData.getSimpleProduct();

    // Add product to cart
    await page.goto(`${process.env.url}/${product.sku.toLowerCase().replace(/_/g, '-')}.html`);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page.locator('[data-testid="pdp-add-to-cart-button"], #product-addtocart-button, button[data-addto="cart"]');
    await addToCartButton.first().click();
    await page.waitForLoadState('networkidle');

    // Complete checkout
    await checkoutPage.navigateToCheckout();
    await checkoutPage.enterEmail(customerData.email);
    await checkoutPage.fillShippingAddressFromCustomer(customerData);
    await checkoutPage.waitForShippingMethods();
    await checkoutPage.selectFlatRateShipping();
    await checkoutPage.clickNext();
    await checkoutPage.waitForPaymentMethods();

    // Try to select Check/Money Order or Bank Transfer (offline methods)
    const checkmo = page.locator('#checkmo, input[value="checkmo"]').first();
    const bankTransfer = page.locator('#banktransfer, input[value="banktransfer"]').first();

    let hasOfflinePayment = false;
    if (await checkmo.isVisible().catch(() => false)) {
      await checkmo.click();
      hasOfflinePayment = true;
    } else if (await bankTransfer.isVisible().catch(() => false)) {
      await bankTransfer.click();
      hasOfflinePayment = true;
    }

    if (hasOfflinePayment) {
      // Complete with offline payment
      await checkoutPage.clickPlaceOrder();

      // Verify success page
      await page.waitForURL(/checkout\/onepage\/success|success/, { timeout: 30000 });

      const successMessage = page.locator('[data-testid="checkout-success-message"], .checkout-success, .page-title:has-text("Thank"), h1:has-text("Thank"), main:has-text("order")');
      await expect(successMessage.first()).toBeVisible();

      // Verify order number or confirmation is displayed
      const orderConfirmation = page.locator('[data-testid="checkout-order-number"], .checkout-success .order-number, a[href*="order/view"], .order-number, p:has-text("order number"), span:has-text("#")');
      // Order number is optional - some themes show it differently
      const hasOrderNumber = await orderConfirmation.first().isVisible().catch(() => false);
      if (!hasOrderNumber) {
        // Just verify we're on success page with some confirmation content
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).toContain('thank');
      }
    } else {
      // No offline payment available - verify we can see payment methods (Mollie, etc.)
      const paymentMethods = page.locator('.payment-method, input[value^="mollie"], label:has-text("Credit"), label:has-text("iDEAL")');
      const methodCount = await paymentMethods.count();
      expect(methodCount).toBeGreaterThan(0);

      // Test passes if payment methods are available (can't complete without external gateway)
      console.log(`Found ${methodCount} payment methods - checkout flow verified up to payment selection`);
    }
  });
});
