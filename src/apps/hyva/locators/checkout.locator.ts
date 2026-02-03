/**
 * Hyvä Checkout Locators
 *
 * Locators for Hyvä Checkout components.
 * Prioritizes data-testid selectors where available with fallbacks.
 */

// Page structure
export const checkoutContainer = '[data-testid="checkout-container"], #checkout, .checkout-container';
export const loadingMask = '.loading-mask, [data-testid="loading"], .loader';

// Email step
export const emailInput = '#customer-email';
export const emailError = '[data-testid="checkout-email-error"], .field-error';

// Shipping address form
export const shippingAddressForm = '[data-testid="checkout-shipping-address"], #shipping-new-address-form, .form-shipping-address';
export const firstnameInput = '[data-testid="checkout-firstname-input"], input[name="firstname"]';
export const lastnameInput = '[data-testid="checkout-lastname-input"], input[name="lastname"]';
export const streetInput = '[data-testid="checkout-street-input"], input[name="street[0]"]';
export const cityInput = '[data-testid="checkout-city-input"], input[name="city"]';
export const regionSelect = '[data-testid="checkout-region-select"], select[name="region_id"]';
export const regionInput = '[data-testid="checkout-region-input"], input[name="region"]';
export const postcodeInput = '[data-testid="checkout-postcode-input"], input[name="postcode"]';
export const countrySelect = '[data-testid="checkout-country-select"], select[name="country_id"]';
export const telephoneInput = '[data-testid="checkout-telephone-input"], input[name="telephone"]';

// Shipping methods
export const shippingMethodsContainer = '[data-testid="checkout-shipping-methods"], #checkout-shipping-method-load, .table-checkout-shipping-method';
export const shippingMethodRadio = '[data-testid="checkout-shipping-method"], input[name="ko_unique_1"], input[type="radio"][name^="shipping"]';
export const flatRateShipping = '[data-testid="checkout-shipping-flatrate"], input[value="flatrate_flatrate"], label:has-text("Flat Rate")';
export const freeShipping = '[data-testid="checkout-shipping-free"], input[value="freeshipping_freeshipping"], label:has-text("Free")';
export const shippingPrice = '[data-testid="checkout-shipping-price"], .col-price .price';

// Buttons - Shipping step
export const nextButton = '[data-testid="checkout-next-button"], button:has-text("Next"), .button.action.continue.primary';
export const updateButton = '[data-testid="checkout-update-button"], button:has-text("Update")';

// Payment methods
export const paymentMethodsContainer = '[data-testid="checkout-payment-methods"], #checkout-payment-method-load, .payment-methods';
export const paymentMethodRadio = '[data-testid="checkout-payment-method"], input[name="payment[method]"]';
export const checkMoneyOrder = '[data-testid="checkout-payment-checkmo"], #checkmo, input[value="checkmo"]';
export const bankTransfer = '[data-testid="checkout-payment-banktransfer"], #banktransfer, input[value="banktransfer"]';
export const cashOnDelivery = '[data-testid="checkout-payment-cashondelivery"], #cashondelivery, input[value="cashondelivery"]';

// Mollie payment methods
export const mollieContainer = '[data-testid="checkout-mollie-container"], .payment-method-mollie, #mollie-methods';
export const mollieIdeal = '[data-testid="checkout-mollie-ideal"], input[value="mollie_methods_ideal"], label:has-text("iDEAL")';
export const mollieCreditCard = '[data-testid="checkout-mollie-creditcard"], input[value="mollie_methods_creditcard"], label:has-text("Credit Card"), label:has-text("Creditcard")';
export const molliePaypal = '[data-testid="checkout-mollie-paypal"], input[value="mollie_methods_paypal"], label:has-text("PayPal")';
export const mollieBancontact = '[data-testid="checkout-mollie-bancontact"], input[value="mollie_methods_bancontact"], label:has-text("Bancontact")';
export const mollieIdealBankSelect = '[data-testid="checkout-mollie-ideal-bank"], select[name="issuer"], #mollie_methods_ideal_issuer';

// Place order
export const placeOrderButton = '[data-testid="checkout-place-order-button"], button:has-text("Place Order"), .action.primary.checkout';
export const termsCheckbox = '[data-testid="checkout-terms-checkbox"], input[name="agreement[1]"], .checkout-agreements input[type="checkbox"]';

// Order summary
export const orderSummary = '[data-testid="checkout-order-summary"], .opc-block-summary, .order-summary';
export const summarySubtotal = '[data-testid="checkout-summary-subtotal"], .totals.sub .price, tr.totals.sub .amount .price';
export const summaryShipping = '[data-testid="checkout-summary-shipping"], .totals.shipping .price, tr.totals.shipping .amount .price';
export const summaryDiscount = '[data-testid="checkout-summary-discount"], .totals.discount .price, tr.totals.discount .amount .price';
export const summaryGrandTotal = '[data-testid="checkout-summary-grand-total"], .grand.totals .price, tr.grand.totals .amount .price';

// Success page
export const successContainer = '[data-testid="checkout-success-container"], .checkout-success, .page-title-wrapper';
export const successMessage = '[data-testid="checkout-success-message"], .checkout-success .page-title, .page-title:has-text("Thank you")';
export const orderNumber = '[data-testid="checkout-order-number"], .checkout-success .order-number strong, a[href*="order/view"]';
export const continueShoppingButton = '[data-testid="checkout-continue-shopping"], a:has-text("Continue Shopping")';

// Error messages
export const errorMessage = '[data-testid="checkout-error-message"], .message-error, .mage-error';
export const fieldError = '[data-testid="checkout-field-error"], .field-error, .mage-error';

// Billing address
export const billingAddressContainer = '[data-testid="checkout-billing-address"], .billing-address-form, #billing-new-address-form';
export const sameAsShippingCheckbox = '[data-testid="checkout-same-as-shipping"], input[name="billing-address-same-as-shipping"]';

// Coupon/Discount
export const couponToggle = '[data-testid="checkout-coupon-toggle"], #block-discount-heading, .payment-option-title:has-text("Apply Discount")';
export const couponInput = '[data-testid="checkout-coupon-input"], #discount-code, input[name="discount_code"]';
export const couponApplyButton = '[data-testid="checkout-coupon-apply"], button:has-text("Apply Discount"), #discount-form button[type="submit"]';
export const couponCancelButton = '[data-testid="checkout-coupon-cancel"], button:has-text("Cancel coupon")';
