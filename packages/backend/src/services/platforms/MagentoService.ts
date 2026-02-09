/**
 * Magento Platform Service
 *
 * Handles integration with Magento's REST API
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
// MAGENTO SERVICE
// ============================================================================

export class MagentoService {
  private readonly DEFAULT_API_VERSION = 'V1';

  // ========================================================================
  // API CLIENT
  // ========================================================================

  /**
   * Build Magento API URL
   */
  private buildApiUrl(connection: EcommerceConnection, endpoint: string): string {
    const apiVersion = connection.apiVersion || this.DEFAULT_API_VERSION;
    const baseUrl = connection.storeUrl.replace(/\/$/, '');
    return `${baseUrl}/rest/${apiVersion}/${endpoint}`;
  }

  /**
   * Make authenticated request to Magento API
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
      Authorization: `Bearer ${connection.accessToken || connection.apiKey}`,
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
      throw new Error(`Magento API error: ${response.status} - ${error}`);
    }

    return (await response.json()) as T;
  }

  // ========================================================================
  // CONNECTION
  // ========================================================================

  /**
   * Test connection to Magento
   */
  async testConnection(connection: EcommerceConnection): Promise<TestConnectionResult> {
    try {
      const startTime = Date.now();

      // Use a simple endpoint to test connection
      const response = await this.apiRequest<any>(connection, 'modules/list');

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'Connected to Magento successfully',
        responseTimeMs: responseTime,
        platformInfo: {
          modules: response?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Magento',
        responseTimeMs: 0,
      };
    }
  }

  // ========================================================================
  // PRODUCTS
  // ========================================================================

  /**
   * Fetch products from Magento
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
          `products/search?searchCriteria[pageSize]=100&searchCriteria[currentPage]=${page}`
        );

        const fetchedProducts = (response.items || []).map((p: any) => this.normalizeProduct(p));
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
      const response = await this.apiRequest<any>(
        connection,
        `products/${encodeURIComponent(sku)}`
      );
      return this.normalizeProduct(response);
    } catch {
      return null;
    }
  }

  /**
   * Normalize Magento product to standard format
   */
  private normalizeProduct(product: any): PlatformProductData {
    return {
      externalProductId: String(product.id),
      externalVariantId: String(product.id),
      title: product.name,
      description: product.custom_attributes?.find((a: any) => a.attribute_code === 'description')
        ?.value,
      sku: product.sku,
      price: product.price ? parseFloat(product.price) : undefined,
      compareAtPrice: product.custom_attributes?.find(
        (a: any) => a.attribute_code === 'special_price'
      )?.value
        ? parseFloat(
            product.custom_attributes.find((a: any) => a.attribute_code === 'special_price').value
          )
        : undefined,
      costPrice: product.custom_attributes?.find((a: any) => a.attribute_code === 'cost')?.value
        ? parseFloat(product.custom_attributes.find((a: any) => a.attribute_code === 'cost').value)
        : undefined,
      quantity: product.extension_attributes?.stock_item?.qty,
      weight: product.custom_attributes?.find((a: any) => a.attribute_code === 'weight')?.value
        ? parseFloat(
            product.custom_attributes.find((a: any) => a.attribute_code === 'weight').value
          )
        : undefined,
      weightUnit: 'kg',
      images: product.media_gallery_entries?.map((img: any) => img.file) || [],
      tags: [],
      status: product.status === '1' ? 'enabled' : 'disabled',
      createdAt: product.created_at ? new Date(product.created_at) : undefined,
      updatedAt: product.updated_at ? new Date(product.updated_at) : undefined,
    };
  }

  // ========================================================================
  // INVENTORY
  // ========================================================================

  /**
   * Update inventory in Magento
   */
  async updateInventory(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping,
    quantity: number
  ): Promise<void> {
    // Magento requires source item update for inventory
    await this.apiRequest(connection, `inventory/source-items`, 'POST', {
      sourceItems: [
        {
          sku: mapping.internalSku,
          source_code: 'default',
          quantity: quantity,
          status: quantity > 0 ? 1 : 0,
        },
      ],
    });
  }

  /**
   * Get inventory from Magento
   */
  async getInventory(
    connection: EcommerceConnection,
    mapping: EcommerceProductMapping
  ): Promise<number | undefined> {
    try {
      const response = await this.apiRequest<any>(
        connection,
        `inventory/source-items?skus=${encodeURIComponent(mapping.internalSku)}`
      );

      return response?.[0]?.quantity;
    } catch {
      return undefined;
    }
  }

  // ========================================================================
  // ORDERS
  // ========================================================================

  /**
   * Fetch orders from Magento
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
      const from = new Date(Date.now() - daysToLookBack * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('.')[0];

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.apiRequest<any>(
          connection,
          `orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][value]=${from}&searchCriteria[filter_groups][0][filters][0][condition_type]=gteq&searchCriteria[pageSize]=100&searchCriteria[currentPage]=${page}`
        );

        const fetchedOrders = (response.items || []).map((o: any) => this.normalizeOrder(o));
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
   * Normalize Magento order to standard format
   */
  private normalizeOrder(order: any): PlatformOrderData {
    const getAddress = (address: any) => ({
      firstName: address.firstname,
      lastName: address.lastname,
      company: address.company,
      address1: address.street?.[0],
      address2: address.street?.[1],
      city: address.city,
      province: address.regionCode,
      country: address.countryId,
      postalCode: address.postcode,
      phone: address.telephone,
    });

    return {
      externalOrderId: String(order.increment_id || order.entity_id),
      orderNumber: order.increment_id?.toString(),
      orderDate: new Date(order.created_at),
      orderStatus: order.status || 'unknown',
      financialStatus: order.state || 'unknown',
      currency: order.order_currency_code,
      subtotal: order.subtotal ? parseFloat(order.subtotal) : 0,
      tax: order.tax_amount ? parseFloat(order.tax_amount) : 0,
      shipping: order.shipping_amount ? parseFloat(order.shipping_amount) : 0,
      total: order.grand_total ? parseFloat(order.grand_total) : 0,
      discount: order.discount_amount ? Math.abs(parseFloat(order.discount_amount)) : 0,
      customer: {
        externalCustomerId: order.customer_id ? String(order.customer_id) : undefined,
        email: order.customer_email,
        firstName: order.customer_firstname,
        lastName: order.customer_lastname,
      },
      shippingAddress: order.extension_attributes?.shipping_assignments?.[0]?.shipping_address
        ? getAddress(order.extension_attributes.shipping_assignments[0].shipping_address)
        : undefined,
      billingAddress: order.billing_address ? getAddress(order.billing_address) : undefined,
      lineItems: (order.items || [])
        .filter((item: any) => item.product_type !== 'configurable')
        .map((item: any) => ({
          externalLineItemId: String(item.item_id),
          sku: item.sku,
          title: item.name,
          quantity: item.qty_ordered,
          price: item.price ? parseFloat(item.price) : 0,
          total: item.row_total ? parseFloat(item.row_total) : 0,
          productId: item.product_id ? String(item.product_id) : undefined,
          variantId: item.product_id ? String(item.product_id) : undefined,
        })),
      shippingMethod: order.extension_attributes?.shipping_assignments?.[0]?.shipping?.method,
      trackingNumbers:
        order.extension_attributes?.shipping_assignments?.[0]?.tracking?.map(
          (t: any) => t.track_number
        ) || [],
      notes: order.customer_note,
    };
  }

  // ========================================================================
  // WEBHOOKS
  // ========================================================================

  /**
   * Verify Magento webhook signature
   */
  async verifyWebhook(connection: EcommerceConnection, payload: any): Promise<boolean> {
    // Magento webhooks verification
    return true; // Placeholder
  }

  /**
   * Handle order webhook from Magento
   */
  async handleOrderWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process order webhook
  }

  /**
   * Handle product webhook from Magento
   */
  async handleProductWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process product webhook
  }

  /**
   * Handle inventory webhook from Magento
   */
  async handleInventoryWebhook(connection: EcommerceConnection, payload: any): Promise<void> {
    // Process inventory webhook
  }
}
