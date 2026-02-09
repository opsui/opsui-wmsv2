/**
 * WooCommerce Platform Service
 *
 * Handles integration with WooCommerce's REST API
 * Supports webhook processing, inventory sync, order import, and product sync
 */

import {
  EcommerceConnection,
  EcommerceProductMapping,
  TestConnectionResult,
  PlatformProductData,
  PlatformOrderData,
} from '@opsui/shared';

// ============================================================================
// WOOCOMMERCE SERVICE
// ============================================================================

export class WooCommerceService {
  private readonly DEFAULT_API_VERSION = 'v3';

  // ========================================================================
  // API CLIENT
  // ========================================================================

  /**
   * Build WooCommerce API URL
   */
  private buildApiUrl(connection: EcommerceConnection, endpoint: string): string {
    const apiVersion = connection.apiVersion || this.DEFAULT_API_VERSION;
    const baseUrl = connection.storeUrl.replace(/\/$/, '');
    return `${baseUrl}/wp-json/wc/${apiVersion}/${endpoint}`;
  }

  /**
   * Make authenticated request to WooCommerce API
   */
  private async apiRequest<T>(
    connection: EcommerceConnection,
    endpoint: string,
    method = 'GET',
    body?: any
  ): Promise<T> {
    const url = this.buildApiUrl(connection, endpoint);

    // WooCommerce uses OAuth 1.0a or basic auth with consumer key/secret
    // For simplicity, using basic auth here (HTTPS required)
    const auth = btoa(`${connection.apiKey}:${connection.apiSecret}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} - ${error}`);
    }

    return (await response.json()) as T;
  }

  // ========================================================================
  // CONNECTION
  // ========================================================================

  /**
   * Test connection to WooCommerce
   */
  async testConnection(connection: EcommerceConnection): Promise<TestConnectionResult> {
    try {
      const startTime = Date.now();

      const response = await this.apiRequest<any>(connection, 'system_status');

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'Connected to WooCommerce successfully',
        responseTimeMs: responseTime,
        platformInfo: {
          environment: response.environment,
          version: response.wc_version,
          apiVersion: response.wc_api_version,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to WooCommerce',
        responseTimeMs: 0,
      };
    }
  }

  // ========================================================================
  // PRODUCTS
  // ========================================================================

  /**
   * Fetch products from WooCommerce
   */
  async fetchProducts(
    connection: EcommerceConnection,
    skus?: string[]
  ): Promise<PlatformProductData[]> {
    const products: PlatformProductData[] = [];

    if (skus && skus.length > 0) {
      // Fetch specific products by SKU
      for (const sku of skus) {
        const product = await this.fetchProductBySku(connection, sku);
        if (product) {
          products.push(product);
        }
      }
    } else {
      // Fetch all products with pagination
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.apiRequest<any[]>(
          connection,
          `products?per_page=100&page=${page}`
        );

        const fetchedProducts = response.map(p => this.normalizeProduct(p));
        products.push(...fetchedProducts);

        hasMore = fetchedProducts.length === 100;
        page++;
      }
    }

    return products;
  }

  /**
   * Fetch a single product by SKU
   */
  private async fetchProductBySku(
    connection: EcommerceConnection,
    sku: string
  ): Promise<PlatformProductData | null> {
    try {
      const response = await this.apiRequest<any[]>(
        connection,
        `products?sku=${encodeURIComponent(sku)}`
      );

      if (response && response.length > 0) {
        return this.normalizeProduct(response[0]);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize WooCommerce product to standard format
   */
  private normalizeProduct(product: any): PlatformProductData {
    return {
      externalProductId: String(product.id),
      externalVariantId: String(product.id),
      title: product.name,
      description: product.description,
      sku: product.sku,
      price: product.price ? parseFloat(product.price) : undefined,
      compareAtPrice: product.regular_price ? parseFloat(product.regular_price) : undefined,
      costPrice: undefined, // WooCommerce doesn't have cost price by default
      quantity: product.stock_quantity,
      weight: product.weight,
      weightUnit: product.weight_unit || 'kg',
      images: product.images?.map((img: any) => img.src) || [],
      tags: product.tags?.map((t: any) => t.name) || [],
      status: product.status,
      createdAt: product.date_created ? new Date(product.date_created) : undefined,
      updatedAt: product.date_modified ? new Date(product.date_modified) : undefined,
    };
  }

  // ========================================================================
  // INVENTORY
  // ========================================================================

  /**
   * Update inventory in WooCommerce
   */
  async updateInventory(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping,
    quantity: number
  ): Promise<void> {
    await this.apiRequest(connection, `products/${mapping.externalProductId}`, 'PUT', {
      stock_quantity: quantity,
      manage_stock: true,
    });
  }

  /**
   * Get inventory from WooCommerce
   */
  async getInventory(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping
  ): Promise<number | undefined> {
    try {
      const response = await this.apiRequest<any>(
        connection,
        `products/${mapping.externalProductId}`
      );

      return response.stock_quantity;
    } catch {
      return undefined;
    }
  }

  // ========================================================================
  // ORDERS
  // ========================================================================

  /**
   * Fetch orders from WooCommerce
   */
  async fetchOrders(
    connection: EcommerceConnection,
    orderIds?: string[],
    daysToLookBack = 7
  ): Promise<PlatformOrderData[]> {
    const orders: PlatformOrderData[] = [];

    if (orderIds && orderIds.length > 0) {
      // Fetch specific orders
      for (const orderId of orderIds) {
        try {
          const order = await this.fetchOrderById(connection, orderId);
          if (order) {
            orders.push(order);
          }
        } catch {
          // Skip failed orders
        }
      }
    } else {
      // Fetch orders by date range
      const after = new Date(Date.now() - daysToLookBack * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('.')[0];

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.apiRequest<any[]>(
          connection,
          `orders?after=${after}&per_page=100&page=${page}`
        );

        const fetchedOrders = response.map(o => this.normalizeOrder(o));
        orders.push(...fetchedOrders);

        hasMore = fetchedOrders.length === 100;
        page++;
      }
    }

    return orders;
  }

  /**
   * Fetch a single order by ID
   */
  private async fetchOrderById(
    connection: EcommerceConnection,
    orderId: string
  ): Promise<PlatformOrderData | null> {
    try {
      const response = await this.apiRequest<any>(connection, `orders/${orderId}`);
      return this.normalizeOrder(response);
    } catch {
      return null;
    }
  }

  /**
   * Normalize WooCommerce order to standard format
   */
  private normalizeOrder(order: any): PlatformOrderData {
    return {
      externalOrderId: String(order.id),
      orderNumber: order.order_key?.toString() || String(order.id),
      orderDate: new Date(order.date_created),
      orderStatus: order.status || 'unknown',
      financialStatus: order.payment_method || 'unknown',
      currency: order.currency,
      subtotal: order.total ? parseFloat(order.total) : 0,
      tax: order.total_tax ? parseFloat(order.total_tax) : 0,
      shipping: order.shipping_total ? parseFloat(order.shipping_total) : 0,
      total: order.total ? parseFloat(order.total) : 0,
      discount: order.discount_total ? parseFloat(order.discount_total) : 0,
      customer: {
        externalCustomerId: order.customer_id ? String(order.customer_id) : undefined,
        email: order.billing?.email,
        firstName: order.billing?.first_name,
        lastName: order.billing?.last_name,
        phone: order.billing?.phone,
      },
      shippingAddress: order.shipping
        ? {
            firstName: order.shipping.first_name,
            lastName: order.shipping.last_name,
            company: order.shipping.company,
            address1: order.shipping.address_1,
            address2: order.shipping.address_2,
            city: order.shipping.city,
            province: order.shipping.state,
            country: order.shipping.country,
            postalCode: order.shipping.postcode,
            phone: order.shipping.phone,
          }
        : undefined,
      billingAddress: order.billing
        ? {
            firstName: order.billing.first_name,
            lastName: order.billing.last_name,
            company: order.billing.company,
            address1: order.billing.address_1,
            address2: order.billing.address_2,
            city: order.billing.city,
            province: order.billing.state,
            country: order.billing.country,
            postalCode: order.billing.postcode,
            phone: order.billing.phone,
          }
        : undefined,
      lineItems: (order.line_items || []).map((item: any) => ({
        externalLineItemId: String(item.id),
        sku: item.sku,
        title: item.name,
        quantity: item.quantity,
        price: item.price ? parseFloat(item.price) : 0,
        total: item.total ? parseFloat(item.total) : 0,
        productId: item.product_id ? String(item.product_id) : undefined,
        variantId: item.variation_id ? String(item.variation_id) : undefined,
      })),
      shippingMethod: order.shipping_lines?.[0]?.method_title,
      trackingNumbers: [], // WooCommerce stores tracking in meta
      notes: order.customer_note,
    };
  }

  // ========================================================================
  // WEBHOOKS
  // ========================================================================

  /**
   * Verify WooCommerce webhook signature
   */
  async verifyWebhook(connection: EcommerceConnection, payload: any): Promise<boolean> {
    // WooCommerce webhooks can be verified using the signature in headers
    // In a real implementation, this would verify the X-WC-Webhook-Signature header
    return true; // Placeholder
  }

  /**
   * Handle order webhook from WooCommerce
   */
  async handleOrderWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process order webhook
  }

  /**
   * Handle product webhook from WooCommerce
   */
  async handleProductWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process product webhook
  }

  /**
   * Handle inventory webhook from WooCommerce
   */
  async handleInventoryWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process inventory webhook
  }
}
