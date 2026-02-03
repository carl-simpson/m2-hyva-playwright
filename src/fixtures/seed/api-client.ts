/**
 * Magento 2 REST API Client
 *
 * Provides methods for creating and managing test fixtures via the Magento 2 REST API.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface ProductPayload {
  sku: string;
  name: string;
  price: number;
  qty: number;
  status?: number;
  visibility?: number;
  typeId?: string;
  attributeSetId?: number;
  weight?: number;
  taxClassId?: string;
  description?: string;
  shortDescription?: string;
  categories?: string[];
}

export interface CustomerPayload {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  websiteId?: number;
  storeId?: number;
  groupId?: number;
  addresses?: CustomerAddressPayload[];
}

export interface CustomerAddressPayload {
  firstname: string;
  lastname: string;
  street: string[];
  city: string;
  region?: { region: string; region_id?: number };
  postcode: string;
  countryId: string;
  telephone: string;
  defaultShipping?: boolean;
  defaultBilling?: boolean;
}

export interface CouponRulePayload {
  name: string;
  code: string;
  discountType: 'by_percent' | 'by_fixed' | 'cart_fixed' | 'buy_x_get_y';
  discountAmount: number;
  websiteIds?: number[];
  customerGroupIds?: number[];
  fromDate?: string;
  toDate?: string;
  usesPerCoupon?: number;
  usesPerCustomer?: number;
  applyToShipping?: boolean;
  stopRulesProcessing?: boolean;
}

export interface ApiProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  status: number;
  visibility: number;
  type_id: string;
}

export interface ApiCustomer {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  website_id: number;
  store_id: number;
}

export interface ApiSalesRule {
  rule_id: number;
  name: string;
  is_active: boolean;
}

/**
 * Magento 2 REST API Client
 */
export class MagentoApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly adminUser: string,
    private readonly adminPass: string
  ) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');

    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/V1`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const message = (error.response.data as any)?.message || error.message;
          console.error(`API Error: ${error.response.status} - ${message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with the Magento API
   */
  async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/integration/admin/token', {
        username: this.adminUser,
        password: this.adminPass,
      });

      this.token = response.data;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

      console.log('✓ Authenticated with Magento API');
    } catch (error) {
      console.error('✗ Failed to authenticate with Magento API');
      throw error;
    }
  }

  /**
   * Ensure we're authenticated
   */
  private async ensureAuth(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    }
  }

  // ============================================
  // PRODUCTS
  // ============================================

  /**
   * Create a simple product
   */
  async createProduct(product: ProductPayload): Promise<ApiProduct> {
    await this.ensureAuth();

    const payload = {
      product: {
        sku: product.sku,
        name: product.name,
        attribute_set_id: product.attributeSetId || 4,
        price: product.price,
        status: product.status ?? 1,
        visibility: product.visibility ?? 4,
        type_id: product.typeId || 'simple',
        weight: product.weight ?? 1,
        extension_attributes: {
          stock_item: {
            qty: product.qty,
            is_in_stock: product.qty > 0,
          },
        },
        custom_attributes: [
          { attribute_code: 'tax_class_id', value: product.taxClassId || '2' },
          { attribute_code: 'description', value: product.description || `Test product: ${product.name}` },
          { attribute_code: 'short_description', value: product.shortDescription || product.name },
        ],
      },
    };

    const response = await this.client.post('/products', payload);
    return response.data;
  }

  /**
   * Get a product by SKU
   */
  async getProduct(sku: string): Promise<ApiProduct | null> {
    await this.ensureAuth();

    try {
      const response = await this.client.get(`/products/${encodeURIComponent(sku)}`);
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a product by SKU
   */
  async deleteProduct(sku: string): Promise<boolean> {
    await this.ensureAuth();

    try {
      await this.client.delete(`/products/${encodeURIComponent(sku)}`);
      return true;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Search products by SKU pattern
   */
  async searchProducts(skuPattern: string): Promise<ApiProduct[]> {
    await this.ensureAuth();

    const response = await this.client.get('/products', {
      params: {
        'searchCriteria[filter_groups][0][filters][0][field]': 'sku',
        'searchCriteria[filter_groups][0][filters][0][value]': skuPattern,
        'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like',
      },
    });

    return response.data.items || [];
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  /**
   * Create a customer
   */
  async createCustomer(customer: CustomerPayload): Promise<ApiCustomer> {
    await this.ensureAuth();

    const addresses = customer.addresses?.map((addr) => ({
      firstname: addr.firstname || customer.firstname,
      lastname: addr.lastname || customer.lastname,
      street: addr.street,
      city: addr.city,
      region: addr.region,
      postcode: addr.postcode,
      country_id: addr.countryId,
      telephone: addr.telephone,
      default_shipping: addr.defaultShipping ?? true,
      default_billing: addr.defaultBilling ?? true,
    })) || [];

    const payload = {
      customer: {
        email: customer.email,
        firstname: customer.firstname,
        lastname: customer.lastname,
        website_id: customer.websiteId || 1,
        store_id: customer.storeId || 1,
        group_id: customer.groupId || 1,
        addresses,
      },
      password: customer.password,
    };

    const response = await this.client.post('/customers', payload);
    return response.data;
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<ApiCustomer | null> {
    await this.ensureAuth();

    try {
      const response = await this.client.get('/customers/search', {
        params: {
          'searchCriteria[filter_groups][0][filters][0][field]': 'email',
          'searchCriteria[filter_groups][0][filters][0][value]': email,
          'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
        },
      });

      const items = response.data.items || [];
      return items.length > 0 ? items[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a customer by ID
   */
  async deleteCustomer(customerId: number): Promise<boolean> {
    await this.ensureAuth();

    try {
      await this.client.delete(`/customers/${customerId}`);
      return true;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Search customers by email pattern
   */
  async searchCustomers(emailPattern: string): Promise<ApiCustomer[]> {
    await this.ensureAuth();

    const response = await this.client.get('/customers/search', {
      params: {
        'searchCriteria[filter_groups][0][filters][0][field]': 'email',
        'searchCriteria[filter_groups][0][filters][0][value]': emailPattern,
        'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like',
      },
    });

    return response.data.items || [];
  }

  // ============================================
  // CART PRICE RULES (COUPONS)
  // ============================================

  /**
   * Create a cart price rule with coupon code
   */
  async createCouponRule(coupon: CouponRulePayload): Promise<number> {
    await this.ensureAuth();

    // Create the rule
    const rulePayload = {
      rule: {
        name: coupon.name,
        description: `Test coupon: ${coupon.name}`,
        is_active: true,
        coupon_type: 'SPECIFIC_COUPON',
        uses_per_coupon: coupon.usesPerCoupon || 1000,
        uses_per_customer: coupon.usesPerCustomer || 100,
        from_date: coupon.fromDate || '2024-01-01',
        to_date: coupon.toDate || '2030-12-31',
        simple_action: coupon.discountType,
        discount_amount: coupon.discountAmount,
        apply_to_shipping: coupon.applyToShipping || false,
        stop_rules_processing: coupon.stopRulesProcessing || false,
        website_ids: coupon.websiteIds || [1],
        customer_group_ids: coupon.customerGroupIds || [0, 1, 2, 3],
      },
    };

    const ruleResponse = await this.client.post('/salesRules', rulePayload);
    const ruleId = ruleResponse.data.rule_id;

    // Create the coupon code
    const couponPayload = {
      coupon: {
        rule_id: ruleId,
        code: coupon.code,
        usage_limit: coupon.usesPerCoupon || 1000,
        usage_per_customer: coupon.usesPerCustomer || 100,
        is_primary: true,
      },
    };

    await this.client.post('/coupons', couponPayload);

    return ruleId;
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<{ coupon_id: number; rule_id: number } | null> {
    await this.ensureAuth();

    try {
      const response = await this.client.get('/coupons/search', {
        params: {
          'searchCriteria[filter_groups][0][filters][0][field]': 'code',
          'searchCriteria[filter_groups][0][filters][0][value]': code,
          'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
        },
      });

      const items = response.data.items || [];
      return items.length > 0 ? items[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a sales rule by ID
   */
  async deleteSalesRule(ruleId: number): Promise<boolean> {
    await this.ensureAuth();

    try {
      await this.client.delete(`/salesRules/${ruleId}`);
      return true;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Search sales rules by name pattern
   */
  async searchSalesRules(namePattern: string): Promise<ApiSalesRule[]> {
    await this.ensureAuth();

    const response = await this.client.get('/salesRules/search', {
      params: {
        'searchCriteria[filter_groups][0][filters][0][field]': 'name',
        'searchCriteria[filter_groups][0][filters][0][value]': namePattern,
        'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like',
      },
    });

    return response.data.items || [];
  }

  // ============================================
  // ORDERS (Read Only)
  // ============================================

  /**
   * Get order by increment ID
   */
  async getOrderByIncrementId(incrementId: string): Promise<any | null> {
    await this.ensureAuth();

    try {
      const response = await this.client.get('/orders', {
        params: {
          'searchCriteria[filter_groups][0][filters][0][field]': 'increment_id',
          'searchCriteria[filter_groups][0][filters][0][value]': incrementId,
          'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
        },
      });

      const items = response.data.items || [];
      return items.length > 0 ? items[0] : null;
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Flush Magento cache
   */
  async flushCache(): Promise<void> {
    await this.ensureAuth();

    // Note: This requires custom API endpoint or admin action
    // For now, log a reminder
    console.log('⚠ Remember to flush Magento cache after fixture changes');
  }

  /**
   * Check if API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/store/storeConfigs');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Factory function
export function createApiClient(): MagentoApiClient {
  const baseUrl = process.env.BASE_URL || process.env.url || '';
  const adminUser = process.env.ADMIN_USER || '';
  const adminPass = process.env.ADMIN_PASS || '';

  if (!baseUrl) {
    throw new Error('BASE_URL environment variable is required');
  }

  return new MagentoApiClient(baseUrl, adminUser, adminPass);
}

export default MagentoApiClient;
