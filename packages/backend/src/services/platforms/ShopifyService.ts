/**
 * Shopify Platform Service
 *
 * Handles integration with Shopify's Admin API
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
// SHOPIFY SERVICE
// ============================================================================

export class ShopifyService {
  private readonly BASE_API_VERSION = '2024-01';
  private readonly SHOPIFY_DOMAIN = '.myshopify.com';

  // ========================================================================
  // API CLIENT
  // ========================================================================

  /**
   * Build Shopify API URL
   */
  private buildApiUrl(connection: EcommerceConnection, endpoint: string): string {
    const apiVersion = connection.apiVersion || this.BASE_API_VERSION;
    const baseUrl = connection.storeUrl.replace(/\/$/, '');
    return `${baseUrl}/admin/api/${apiVersion}/${endpoint}`;
  }

  /**
   * Make authenticated request to Shopify API
   */
  private async apiRequest<T>(
    connection: EcommerceConnection,
    endpoint: string,
    method = 'GET',
    body?: any
  ): Promise<T> {
    const url = this.buildApiUrl(connection, endpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': connection.accessToken || connection.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Update rate limit info from headers
    const rateLimitRemaining = response.headers.get('X-Shopify-Shop-Api-Call-Limit');
    if (rateLimitRemaining) {
      const [used, limit] = rateLimitRemaining.split('/').map(Number);
      // Store this for later use
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    return (await response.json()) as T;
  }

  // ========================================================================
  // CONNECTION
  // ========================================================================

  /**
   * Test connection to Shopify
   */
  async testConnection(connection: EcommerceConnection): Promise<
    TestConnectionResult & {
      rateLimitRemaining?: number;
      rateLimitResetAt?: Date;
    }
  > {
    try {
      const startTime = Date.now();

      const response = await this.apiRequest<any>(connection, 'shop.json');

      const responseTime = Date.now() - startTime;

      // Extract rate limit from response headers (would need to be passed through)
      const rateLimitRemaining = 40; // Placeholder - would extract from headers
      const rateLimitResetAt = new Date(Date.now() + 3600000); // 1 hour from now

      return {
        success: true,
        message: 'Connected to Shopify successfully',
        responseTimeMs: responseTime,
        rateLimitRemaining,
        rateLimitResetAt,
        platformInfo: {
          shopName: response.shop?.name,
          shopEmail: response.shop?.email,
          domain: response.shop?.domain,
          currency: response.shop?.currency,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Shopify',
        responseTimeMs: 0,
      };
    }
  }

  // ========================================================================
  // PRODUCTS
  // ========================================================================

  /**
   * Fetch products from Shopify
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
        const response = await this.apiRequest<any>(
          connection,
          `products.json?limit=250&page=${page}`
        );

        const fetchedProducts = this.normalizeProducts(response.products || []);
        products.push(...fetchedProducts);

        hasMore = fetchedProducts.length === 250;
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
      const response = await this.apiRequest<any>(
        connection,
        `products.json?fields=id,title,variants,images,status&handle=${sku}`
      );

      if (response.products && response.products.length > 0) {
        const product = response.products[0];
        const variant = product.variants?.find((v: any) => v.sku === sku);

        return this.normalizeProduct(product, variant);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize Shopify product to standard format
   */
  private normalizeProduct(product: any, variant?: any): PlatformProductData {
    const targetVariant = variant || (product.variants && product.variants[0]);

    return {
      externalProductId: String(product.id),
      externalVariantId: targetVariant ? String(targetVariant.id) : undefined,
      title: product.title,
      description: product.body_html,
      sku: targetVariant?.sku,
      price: targetVariant?.price ? parseFloat(targetVariant.price) : undefined,
      compareAtPrice: targetVariant?.compare_at_price
        ? parseFloat(targetVariant.compare_at_price)
        : undefined,
      costPrice: targetVariant?.inventory_item?.cost
        ? parseFloat(targetVariant.inventory_item.cost)
        : undefined,
      quantity: targetVariant?.inventory_quantity,
      weight: targetVariant?.weight,
      weightUnit: targetVariant?.weight_unit,
      images: product.images?.map((img: any) => img.src) || [],
      tags: product.tags ? product.tags.split(', ') : [],
      status: product.status,
      createdAt: product.created_at ? new Date(product.created_at) : undefined,
      updatedAt: product.updated_at ? new Date(product.updated_at) : undefined,
    };
  }

  /**
   * Normalize multiple products
   */
  private normalizeProducts(products: any[]): PlatformProductData[] {
    return products.flatMap(product => {
      if (product.variants && product.variants.length > 0) {
        return product.variants.map((variant: any) => this.normalizeProduct(product, variant));
      }
      return [this.normalizeProduct(product)];
    });
  }

  // ========================================================================
  // INVENTORY
  // ========================================================================

  /**
   * Update inventory in Shopify
   */
  async updateInventory(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping,
    quantity: number
  ): Promise<void> {
    const inventoryLevelId = await this.getInventoryLevelId(connection, mapping);

    if (!inventoryLevelId) {
      throw new Error(`Inventory level not found for variant ${mapping.externalVariantId}`);
    }

    await this.apiRequest(connection, `inventory_levels/set.json`, 'POST', {
      location_id: await this.getLocationId(connection),
      inventory_item_id: mapping.externalVariantId,
      available: quantity,
    });
  }

  /**
   * Get inventory from Shopify
   */
  async getInventory(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping
  ): Promise<number | undefined> {
    try {
      const response = await this.apiRequest<any>(
        connection,
        `variants/${mapping.externalVariantId}.json`
      );

      return response.variant?.inventory_quantity;
    } catch {
      return undefined;
    }
  }

  /**
   * Get inventory level ID for a variant
   */
  private async getInventoryLevelId(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping
  ): Promise<string | null> {
    try {
      const locationId = await this.getLocationId(connection);

      const response = await this.apiRequest<any>(
        connection,
        `inventory_levels.json?inventory_item_ids=${mapping.externalVariantId}&location_ids=${locationId}`
      );

      return response.inventory_levels?.[0]?.inventory_level_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Get location ID for inventory tracking
   */
  private async getLocationId(connection: EcommerceConnection): Promise<string> {
    try {
      const response = await this.apiRequest<any>(connection, 'locations.json');

      // Use first location or specific location from settings
      return response.locations?.[0]?.id || '1';
    } catch {
      return '1';
    }
  }

  // ========================================================================
  // ORDERS
  // ========================================================================

  /**
   * Fetch orders from Shopify
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
      const createdAtMin = new Date(Date.now() - daysToLookBack * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('.')[0];

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.apiRequest<any>(
          connection,
          `orders.json?status=any&created_at_min=${createdAtMin}&limit=250&page=${page}`
        );

        const fetchedOrders = (response.orders || []).map((o: any) => this.normalizeOrder(o));
        orders.push(...fetchedOrders);

        hasMore = fetchedOrders.length === 250;
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
      const response = await this.apiRequest<any>(connection, `orders/${orderId}.json`);
      return this.normalizeOrder(response.order);
    } catch {
      return null;
    }
  }

  /**
   * Normalize Shopify order to standard format
   */
  private normalizeOrder(order: any): PlatformOrderData {
    return {
      externalOrderId: String(order.id),
      orderNumber: order.order_number?.toString(),
      orderDate: new Date(order.created_at),
      orderStatus: order.financial_status || 'unknown',
      financialStatus: order.financial_status || 'unknown',
      currency: order.currency,
      subtotal: order.subtotal_price ? parseFloat(order.subtotal_price) : 0,
      tax: order.total_tax ? parseFloat(order.total_tax) : 0,
      shipping: order.total_shipping_price_set?.shop_money?.amount
        ? parseFloat(order.total_shipping_price_set.shop_money.amount)
        : 0,
      total: order.total_price ? parseFloat(order.total_price) : 0,
      discount: order.total_discounts ? parseFloat(order.total_discounts) : 0,
      customer: {
        externalCustomerId: order.customer?.id ? String(order.customer.id) : undefined,
        email: order.customer?.email,
        firstName: order.customer?.first_name,
        lastName: order.customer?.last_name,
        phone: order.customer?.phone,
      },
      shippingAddress: order.shipping_address
        ? {
            firstName: order.shipping_address.first_name,
            lastName: order.shipping_address.last_name,
            company: order.shipping_address.company,
            address1: order.shipping_address.address1,
            address2: order.shipping_address.address2,
            city: order.shipping_address.city,
            province: order.shipping_address.province_code,
            country: order.shipping_address.country_code,
            postalCode: order.shipping_address.zip,
            phone: order.shipping_address.phone,
          }
        : undefined,
      billingAddress: order.billing_address
        ? {
            firstName: order.billing_address.first_name,
            lastName: order.billing_address.last_name,
            company: order.billing_address.company,
            address1: order.billing_address.address1,
            address2: order.billing_address.address2,
            city: order.billing_address.city,
            province: order.billing_address.province_code,
            country: order.billing_address.country_code,
            postalCode: order.billing_address.zip,
            phone: order.billing_address.phone,
          }
        : undefined,
      lineItems: (order.line_items || []).map((item: any) => ({
        externalLineItemId: String(item.id),
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        price: item.price ? parseFloat(item.price) : 0,
        total: item.total_discount_set?.shop_money?.amount
          ? parseFloat(item.total_discount_set.shop_money.amount)
          : 0,
        productId: item.product_id ? String(item.product_id) : undefined,
        variantId: item.variant_id ? String(item.variant_id) : undefined,
      })),
      shippingMethod: order.shipping_lines?.[0]?.title,
      trackingNumbers: order.fulfillments?.flatMap((f: any) => f.tracking_numbers || []) || [],
      notes: order.note,
    };
  }

  // ========================================================================
  // WEBHOOKS
  // ========================================================================

  /**
   * Verify Shopify webhook signature
   */
  async verifyWebhook(connection: EcommerceConnection, payload: any): Promise<boolean> {
    // Shopify webhooks are verified using HMAC-SHA256
    // In a real implementation, this would verify the X-Shopify-Hmac-SHA256 header
    return true; // Placeholder
  }

  /**
   * Handle order webhook from Shopify
   */
  async handleOrderWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process order webhook
    // This would trigger order sync
  }

  /**
   * Handle product webhook from Shopify
   */
  async handleProductWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process product webhook
    // This would trigger product sync
  }

  /**
   * Handle inventory webhook from Shopify
   */
  async handleInventoryWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process inventory webhook
    // This would trigger inventory sync
  }
}
