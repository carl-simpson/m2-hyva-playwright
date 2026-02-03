/**
 * Hyvä Checkout Page Object
 *
 * Provides methods for interacting with the Hyvä Checkout flow.
 * Supports both guest and logged-in customer checkout.
 */

import BasePage from '@common/pages/base.page';
import { Page, TestInfo, test, expect } from '@playwright/test';
import * as locators from '@hyva/locators/checkout.locator';
import { loadJsonData } from '@utils/functions/file';
import { CustomerData } from '@common/interfaces/CustomerData';

// Checkout data interface
interface CheckoutData {
  default: {
    url?: string;
    header_title?: string;
    page_title_text?: string;
    shipping_step_title?: string;
    payment_step_title?: string;
    success_page_heading?: string;
    success_message?: string;
    email_required_error?: string;
    address_required_error?: string;
    shipping_method_required_error?: string;
    payment_method_required_error?: string;
  };
}

// Default checkout data
const defaultData: CheckoutData = {
  default: {
    url: '/checkout',
    header_title: 'Checkout',
    page_title_text: 'Checkout',
    success_page_heading: 'Thank you for your purchase!',
  },
};

// Load checkout data
let data = loadJsonData<CheckoutData>('checkout.data.json', 'hyva', defaultData);
if (data && !data.default) {
  data = { default: data as any };
}

// Address interface for checkout
export interface CheckoutAddress {
  firstname: string;
  lastname: string;
  street: string;
  city: string;
  region?: string;
  postcode: string;
  country: string;
  telephone: string;
}

export default class HyvaCheckoutPage extends BasePage<CheckoutData> {
  constructor(public page: Page, public workerInfo: TestInfo) {
    super(page, workerInfo, data, locators);
  }

  /**
   * Navigate to checkout page
   */
  async navigateToCheckout(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Navigate to checkout`, async () => {
      await this.page.goto(`${process.env.url || process.env.BASE_URL}/checkout`);
      await this.page.waitForLoadState('domcontentloaded');
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Wait for checkout to be ready
   */
  async waitForCheckoutReady(): Promise<void> {
    // Wait for loading mask to disappear
    const loadingMask = this.page.locator(locators.loadingMask).first();
    try {
      if (await loadingMask.isVisible({ timeout: 2000 })) {
        await loadingMask.waitFor({ state: 'hidden', timeout: 30000 });
      }
    } catch {
      // Loading mask not found, continue
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500); // Small delay for JS to initialize
  }

  /**
   * Enter email address (guest checkout)
   */
  async enterEmail(email: string): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Enter email ${email}`, async () => {
      // Wait for checkout page to load fully
      await this.page.waitForSelector('#checkout, .checkout-container', { state: 'visible', timeout: 30000 });

      const emailField = this.page.locator(locators.emailInput).first();
      await emailField.waitFor({ state: 'visible', timeout: 30000 });
      await emailField.fill(email);
      await emailField.blur();
      await this.page.waitForTimeout(1000); // Allow validation
    });
  }

  /**
   * Fill shipping address form
   */
  async fillShippingAddress(address: CheckoutAddress): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Fill shipping address`, async () => {
      // Fill name fields
      await this.page.locator(locators.firstnameInput).first().fill(address.firstname);
      await this.page.locator(locators.lastnameInput).first().fill(address.lastname);

      // Fill address fields
      await this.page.locator(locators.streetInput).first().fill(address.street);
      await this.page.locator(locators.cityInput).first().fill(address.city);

      // Handle region (select or input) - skip for UK/countries without regions
      const regionSelect = this.page.locator(locators.regionSelect).first();
      const regionInput = this.page.locator(locators.regionInput).first();

      try {
        if (await regionSelect.isVisible({ timeout: 2000 })) {
          if (address.region) {
            // Try to select by label, value, or partial match
            try {
              await regionSelect.selectOption({ label: address.region }, { timeout: 5000 });
            } catch {
              // If exact match fails, try text contains
              const options = await regionSelect.locator('option').allTextContents();
              const match = options.find(opt => opt.toLowerCase().includes(address.region?.toLowerCase() || ''));
              if (match) {
                await regionSelect.selectOption({ label: match });
              }
            }
          }
        } else if (await regionInput.isVisible({ timeout: 2000 })) {
          if (address.region) {
            await regionInput.fill(address.region);
          }
        }
      } catch {
        // Region not required for this country, skip
      }

      // Fill postcode
      await this.page.locator(locators.postcodeInput).first().fill(address.postcode);

      // Select country
      const countrySelect = this.page.locator(locators.countrySelect).first();
      if (await countrySelect.isVisible()) {
        await countrySelect.selectOption(address.country);
      }

      // Fill telephone
      await this.page.locator(locators.telephoneInput).first().fill(address.telephone);

      // Wait for address validation
      await this.page.waitForTimeout(1000);
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Fill shipping address from CustomerData
   */
  async fillShippingAddressFromCustomer(customer: CustomerData): Promise<void> {
    const address: CheckoutAddress = {
      firstname: customer.firstName,
      lastname: customer.lastName,
      street: customer.street_one_line,
      city: customer.city,
      region: customer.state,
      postcode: customer.zip,
      country: 'GB', // Default to UK
      telephone: customer.phone,
    };
    await this.fillShippingAddress(address);
  }

  /**
   * Wait for shipping methods to load
   */
  async waitForShippingMethods(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Wait for shipping methods`, async () => {
      await this.waitForCheckoutReady();
      const shippingContainer = this.page.locator(locators.shippingMethodsContainer).first();
      await shippingContainer.waitFor({ state: 'visible', timeout: 30000 });
    });
  }

  /**
   * Check if shipping methods are visible
   */
  async areShippingMethodsVisible(): Promise<boolean> {
    const container = this.page.locator(locators.shippingMethodsContainer).first();
    return await container.isVisible();
  }

  /**
   * Select flat rate shipping
   */
  async selectFlatRateShipping(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select flat rate shipping`, async () => {
      await this.waitForShippingMethods();
      const flatRate = this.page.locator(locators.flatRateShipping).first();
      await flatRate.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Select free shipping
   */
  async selectFreeShipping(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select free shipping`, async () => {
      await this.waitForShippingMethods();
      const freeShipping = this.page.locator(locators.freeShipping).first();
      await freeShipping.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Select shipping method by name
   */
  async selectShippingMethod(methodName: string): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select shipping method ${methodName}`, async () => {
      await this.waitForShippingMethods();
      const method = this.page.locator(`label:has-text("${methodName}")`).first();
      await method.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Click next to proceed to payment
   */
  async clickNext(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Click next button`, async () => {
      const nextBtn = this.page.locator(locators.nextButton).first();
      await nextBtn.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Wait for payment methods to load
   */
  async waitForPaymentMethods(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Wait for payment methods`, async () => {
      await this.waitForCheckoutReady();
      const paymentContainer = this.page.locator(locators.paymentMethodsContainer).first();
      await paymentContainer.waitFor({ state: 'visible', timeout: 30000 });
    });
  }

  /**
   * Check if payment methods are visible
   */
  async arePaymentMethodsVisible(): Promise<boolean> {
    const container = this.page.locator(locators.paymentMethodsContainer).first();
    return await container.isVisible();
  }

  /**
   * Select Check/Money Order payment
   */
  async selectCheckMoneyOrder(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Check/Money Order`, async () => {
      await this.waitForPaymentMethods();
      const checkmo = this.page.locator(locators.checkMoneyOrder).first();
      await checkmo.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Select Bank Transfer payment
   */
  async selectBankTransfer(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Bank Transfer`, async () => {
      await this.waitForPaymentMethods();
      const bankTransfer = this.page.locator(locators.bankTransfer).first();
      await bankTransfer.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Select Cash on Delivery payment
   */
  async selectCashOnDelivery(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Cash on Delivery`, async () => {
      await this.waitForPaymentMethods();
      const cod = this.page.locator(locators.cashOnDelivery).first();
      await cod.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Check if Mollie payment methods are visible
   */
  async areMollieMethodsVisible(): Promise<boolean> {
    const container = this.page.locator(locators.mollieContainer);
    return await container.isVisible();
  }

  /**
   * Get list of visible Mollie payment methods
   */
  async getVisibleMollieMethods(): Promise<string[]> {
    const methods: string[] = [];

    if (await this.page.locator(locators.mollieIdeal).isVisible()) {
      methods.push('iDEAL');
    }
    if (await this.page.locator(locators.mollieCreditCard).isVisible()) {
      methods.push('Credit Card');
    }
    if (await this.page.locator(locators.molliePaypal).isVisible()) {
      methods.push('PayPal');
    }
    if (await this.page.locator(locators.mollieBancontact).isVisible()) {
      methods.push('Bancontact');
    }

    return methods;
  }

  /**
   * Select Mollie iDEAL payment
   */
  async selectMollieIdeal(bank?: string): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Mollie iDEAL`, async () => {
      await this.waitForPaymentMethods();
      const ideal = this.page.locator(locators.mollieIdeal).first();
      await ideal.click();
      await this.waitForCheckoutReady();

      // Select bank if provided
      if (bank) {
        const bankSelect = this.page.locator(locators.mollieIdealBankSelect);
        if (await bankSelect.isVisible()) {
          await bankSelect.selectOption({ label: bank });
        }
      }
    });
  }

  /**
   * Select Mollie Credit Card payment
   */
  async selectMollieCreditCard(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Mollie Credit Card`, async () => {
      await this.waitForPaymentMethods();
      const creditCard = this.page.locator(locators.mollieCreditCard).first();
      await creditCard.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Select Mollie PayPal payment
   */
  async selectMolliePaypal(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Mollie PayPal`, async () => {
      await this.waitForPaymentMethods();
      const paypal = this.page.locator(locators.molliePaypal).first();
      await paypal.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Accept terms and conditions if checkbox is present
   */
  async acceptTermsIfPresent(): Promise<void> {
    const termsCheckbox = this.page.locator(locators.termsCheckbox).first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
  }

  /**
   * Click Place Order button
   */
  async clickPlaceOrder(): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Click Place Order`, async () => {
      await this.acceptTermsIfPresent();
      const placeOrderBtn = this.page.locator(locators.placeOrderButton).first();
      await placeOrderBtn.click();
      await this.page.waitForLoadState('networkidle');
    });
  }

  /**
   * Place order and wait for redirect or success
   */
  async placeOrderAndWait(): Promise<void> {
    await this.clickPlaceOrder();
    // Wait for navigation - could be success page or payment redirect
    await this.page.waitForURL(/checkout\/onepage\/success|mollie|payment/);
  }

  /**
   * Check if on success page
   */
  async isOnSuccessPage(): Promise<boolean> {
    return this.page.url().includes('checkout/onepage/success');
  }

  /**
   * Get order number from success page
   */
  async getOrderNumber(): Promise<string> {
    await test.step(`${this.workerInfo.project.name}: Get order number`, async () => {});

    const orderNumberElement = this.page.locator(locators.orderNumber).first();
    await orderNumberElement.waitFor({ state: 'visible' });
    const text = await orderNumberElement.textContent();
    return text?.trim() || '';
  }

  /**
   * Verify success page is displayed
   */
  async verifySuccessPage(): Promise<string> {
    await test.step(`${this.workerInfo.project.name}: Verify success page`, async () => {
      await this.page.waitForURL(/checkout\/onepage\/success/);
      const successMessage = this.page.locator(locators.successMessage).first();
      await expect(successMessage).toBeVisible();
    });
    return await this.getOrderNumber();
  }

  /**
   * Get order summary totals
   */
  async getOrderSummary(): Promise<{ subtotal: string; shipping: string; grandTotal: string }> {
    const subtotal = await this.page.locator(locators.summarySubtotal).first().textContent();
    const shipping = await this.page.locator(locators.summaryShipping).first().textContent();
    const grandTotal = await this.page.locator(locators.summaryGrandTotal).first().textContent();

    return {
      subtotal: subtotal?.trim() || '',
      shipping: shipping?.trim() || '',
      grandTotal: grandTotal?.trim() || '',
    };
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(code: string): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Apply coupon ${code}`, async () => {
      // Open coupon section if collapsed
      const toggle = this.page.locator(locators.couponToggle);
      if (await toggle.isVisible()) {
        await toggle.click();
      }

      const couponInput = this.page.locator(locators.couponInput).first();
      await couponInput.fill(code);

      const applyBtn = this.page.locator(locators.couponApplyButton).first();
      await applyBtn.click();
      await this.waitForCheckoutReady();
    });
  }

  /**
   * Complete full guest checkout flow
   */
  async completeGuestCheckout(
    email: string,
    address: CheckoutAddress,
    shippingMethod: 'flatrate' | 'free' = 'flatrate',
    paymentMethod: 'checkmo' | 'banktransfer' | 'cashondelivery' = 'checkmo'
  ): Promise<string> {
    await this.navigateToCheckout();
    await this.enterEmail(email);
    await this.fillShippingAddress(address);

    if (shippingMethod === 'flatrate') {
      await this.selectFlatRateShipping();
    } else {
      await this.selectFreeShipping();
    }

    await this.clickNext();

    if (paymentMethod === 'checkmo') {
      await this.selectCheckMoneyOrder();
    } else if (paymentMethod === 'banktransfer') {
      await this.selectBankTransfer();
    } else {
      await this.selectCashOnDelivery();
    }

    await this.clickPlaceOrder();
    return await this.verifySuccessPage();
  }

  /**
   * Check if redirected to Mollie
   */
  async isRedirectedToMollie(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('mollie.com') || url.includes('mollie.test');
  }

  /**
   * Handle Mollie test page - select status
   */
  async selectMollieTestStatus(status: 'paid' | 'failed' | 'cancelled' | 'expired'): Promise<void> {
    await test.step(`${this.workerInfo.project.name}: Select Mollie test status ${status}`, async () => {
      // Wait for Mollie test page
      await this.page.waitForURL(/mollie/);

      // Find and click the appropriate status button
      const statusButton = this.page.locator(`button:has-text("${status}"), a:has-text("${status}")`).first();
      await statusButton.click();

      // Wait for redirect back to store
      await this.page.waitForURL(/checkout|cart/);
    });
  }
}
