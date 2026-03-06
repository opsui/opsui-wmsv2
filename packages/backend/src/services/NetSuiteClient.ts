/**
 * NetSuite REST API Client
 *
 * Uses Token-Based Authentication (TBA) with OAuth 1.0 to call
 * the NetSuite REST Record API. Does NOT use SuiteQL.
 *
 * Used to pull sales orders for warehouse picking & packing.
 */

import crypto from 'crypto';
import https from 'https';
import config from '../config';
import { logger } from '../config/logger';

interface NetSuiteRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

interface NetSuiteResponse<T = any> {
  status: number;
  data: T;
}

export interface NetSuiteSalesOrder {
  id: string;
  tranId: string;
  status: { id: string; refName: string };
  entity: { id: string; refName: string };
  tranDate: string;
  shipDate?: string;
  memo?: string;
  item?: { items: NetSuiteSalesOrderLine[] };
  shippingAddress?: {
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: { id: string; refName: string };
  };
}

export interface NetSuiteSalesOrderLine {
  item: { id: string; refName: string };
  quantity: number;
  rate?: number;
  amount?: number;
  description?: string;
  line: number;
}

export interface NetSuiteListResponse<T> {
  links: Array<{ rel: string; href: string }>;
  count: number;
  hasMore: boolean;
  items: Array<{ links: Array<{ rel: string; href: string }>; id: string } & T>;
  offset: number;
  totalResults: number;
}

export class NetSuiteClient {
  private accountId: string;
  private tokenId: string;
  private tokenSecret: string;
  private consumerKey: string;
  private consumerSecret: string;
  private baseUrl: string;

  constructor() {
    this.accountId = config.netsuite.accountId;
    this.tokenId = config.netsuite.tokenId;
    this.tokenSecret = config.netsuite.tokenSecret;
    this.consumerKey = config.netsuite.consumerKey;
    this.consumerSecret = config.netsuite.consumerSecret;

    if (!this.accountId || !this.tokenId || !this.consumerKey) {
      throw new Error('NetSuite credentials not configured. Set NETSUITE_* environment variables.');
    }

    this.baseUrl = `https://${this.accountId}.suitetalk.api.netsuite.com/services/rest`;
  }

  private generateOAuthHeader(method: string, fullUrl: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const params: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.tokenId,
      oauth_nonce: nonce,
      oauth_timestamp: timestamp,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_version: '1.0',
    };

    const urlObj = new URL(fullUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Combine OAuth params with query params for signature base
    const combined: Record<string, string> = { ...params };
    for (const [k, v] of urlObj.searchParams) {
      combined[k] = v;
    }

    const sortedParams = Object.keys(combined)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(combined[k])}`)
      .join('&');

    const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.tokenSecret)}`;
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(signatureBase)
      .digest('base64');

    params.oauth_signature = signature;

    return (
      `OAuth realm="${this.accountId}", ` +
      Object.keys(params)
        .map(k => `${k}="${encodeURIComponent(params[k])}"`)
        .join(', ')
    );
  }

  async request<T = any>(options: NetSuiteRequestOptions): Promise<NetSuiteResponse<T>> {
    const queryString = options.query
      ? '?' +
        Object.entries(options.query)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&')
      : '';

    const fullUrl = `${this.baseUrl}${options.path}${queryString}`;
    const authHeader = this.generateOAuthHeader(options.method, fullUrl);
    const urlObj = new URL(fullUrl);
    const bodyStr = options.body ? JSON.stringify(options.body) : null;

    return new Promise((resolve, reject) => {
      const reqOptions: https.RequestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'transient',
        },
      };
      if (bodyStr) {
        reqOptions.headers!['Content-Length'] = Buffer.byteLength(bodyStr);
      }

      const req = https.request(reqOptions, res => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          let parsed: T;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data as unknown as T;
          }

          if (res.statusCode && res.statusCode >= 400) {
            logger.warn('NetSuite API error', {
              status: res.statusCode,
              path: options.path,
              response: typeof parsed === 'object' ? parsed : data.substring(0, 500),
            });
          }

          resolve({ status: res.statusCode || 500, data: parsed });
        });
      });

      req.on('error', err => {
        logger.error('NetSuite request failed', { path: options.path, error: err.message });
        reject(err);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('NetSuite request timeout'));
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Test connectivity to NetSuite REST API
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency: number }> {
    const start = Date.now();
    try {
      // Try to access the metadata endpoint which typically requires minimal permissions
      const result = await this.request({ method: 'GET', path: '/record/v1/metadata-catalog/' });
      const latency = Date.now() - start;

      if (result.status === 200) {
        return { success: true, message: 'Connected to NetSuite REST API', latency };
      }

      return {
        success: false,
        message: `NetSuite returned status ${result.status}`,
        latency,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Connection failed',
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Fetch sales orders from NetSuite using REST Record API.
   * Filters by status to get orders ready for fulfillment.
   */
  async getSalesOrders(
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<NetSuiteListResponse<NetSuiteSalesOrder>> {
    const query: Record<string, string> = {
      limit: String(options.limit || 50),
      offset: String(options.offset || 0),
    };

    // Filter for orders pending fulfillment
    if (options.status) {
      query.q = `status IS "${options.status}"`;
    }

    const result = await this.request<NetSuiteListResponse<NetSuiteSalesOrder>>({
      method: 'GET',
      path: '/record/v1/salesOrder',
      query,
    });

    if (result.status !== 200) {
      throw new Error(
        `Failed to fetch sales orders: ${result.status} - ${JSON.stringify(result.data)}`
      );
    }

    return result.data;
  }

  /**
   * Fetch a single sales order with full details (including line items)
   */
  async getSalesOrder(id: string): Promise<NetSuiteSalesOrder> {
    const result = await this.request<NetSuiteSalesOrder>({
      method: 'GET',
      path: `/record/v1/salesOrder/${encodeURIComponent(id)}`,
      query: {
        expandSubResources: 'true',
      },
    });

    if (result.status !== 200) {
      throw new Error(`Failed to fetch sales order ${id}: ${result.status}`);
    }

    return result.data;
  }

  /**
   * Update a sales order status in NetSuite (e.g., mark as fulfilled)
   */
  async updateSalesOrderStatus(id: string, updates: Record<string, unknown>): Promise<void> {
    const result = await this.request({
      method: 'PATCH',
      path: `/record/v1/salesOrder/${encodeURIComponent(id)}`,
      body: updates,
    });

    if (result.status !== 204 && result.status !== 200) {
      throw new Error(`Failed to update sales order ${id}: ${result.status}`);
    }
  }

  /**
   * Fetch inventory items from NetSuite
   */
  async getInventoryItems(
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<NetSuiteListResponse<any>> {
    const result = await this.request<NetSuiteListResponse<any>>({
      method: 'GET',
      path: '/record/v1/inventoryItem',
      query: {
        limit: String(options.limit || 50),
        offset: String(options.offset || 0),
      },
    });

    if (result.status !== 200) {
      throw new Error(`Failed to fetch inventory items: ${result.status}`);
    }

    return result.data;
  }

  /**
   * Create an item fulfillment record in NetSuite
   */
  async createItemFulfillment(
    salesOrderId: string,
    fulfillmentData: Record<string, unknown>
  ): Promise<string> {
    const result = await this.request<{ id: string }>({
      method: 'POST',
      path: '/record/v1/itemFulfillment',
      body: {
        createdFrom: { id: salesOrderId },
        ...fulfillmentData,
      },
    });

    if (result.status !== 201 && result.status !== 200) {
      throw new Error(`Failed to create item fulfillment for SO ${salesOrderId}: ${result.status}`);
    }

    return result.data.id;
  }
}
