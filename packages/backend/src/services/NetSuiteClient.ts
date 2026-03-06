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

export interface NetSuiteCredentials {
  accountId: string;
  tokenId: string;
  tokenSecret: string;
  consumerKey: string;
  consumerSecret: string;
}

export class NetSuiteClient {
  private accountId: string;
  private tokenId: string;
  private tokenSecret: string;
  private consumerKey: string;
  private consumerSecret: string;
  private baseUrl: string;

  constructor(credentials?: NetSuiteCredentials) {
    this.accountId = credentials?.accountId || config.netsuite.accountId;
    this.tokenId = credentials?.tokenId || config.netsuite.tokenId;
    this.tokenSecret = credentials?.tokenSecret || config.netsuite.tokenSecret;
    this.consumerKey = credentials?.consumerKey || config.netsuite.consumerKey;
    this.consumerSecret = credentials?.consumerSecret || config.netsuite.consumerSecret;

    if (!this.accountId || !this.tokenId || !this.consumerKey) {
      throw new Error(
        'NetSuite credentials not configured. Provide credentials or set NETSUITE_* environment variables.'
      );
    }

    // NetSuite REST API requires account ID with underscores replaced by hyphens and lowercased
    const restAccountId = this.accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${restAccountId}.suitetalk.api.netsuite.com/services/rest`;
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
        (reqOptions.headers as Record<string, string | number>)['Content-Length'] =
          Buffer.byteLength(bodyStr);
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
    };

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
   * Fetch item fulfillments from NetSuite - these are orders ready for picking/packing.
   * This endpoint may have different permissions than salesOrder.
   */
  async getItemFulfillments(
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<NetSuiteListResponse<any>> {
    const query: Record<string, string> = {
      limit: String(options.limit || 50),
    };

    const result = await this.request<NetSuiteListResponse<any>>({
      method: 'GET',
      path: '/record/v1/itemFulfillment',
      query,
    });

    if (result.status !== 200) {
      throw new Error(
        `Failed to fetch item fulfillments: ${result.status} - ${JSON.stringify(result.data)}`
      );
    }

    return result.data;
  }

  /**
   * Fetch a single item fulfillment with full details
   */
  async getItemFulfillment(id: string): Promise<any> {
    const result = await this.request<any>({
      method: 'GET',
      path: `/record/v1/itemFulfillment/${encodeURIComponent(id)}`,
      query: {
        expandSubResources: 'true',
      },
    });

    if (result.status !== 200) {
      throw new Error(`Failed to fetch item fulfillment ${id}: ${result.status}`);
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
   * Execute a SuiteQL query against NetSuite.
   * SuiteQL often works when the Record API is blocked by role permissions.
   */
  async suiteqlQuery<T = any>(
    sql: string,
    limit = 50,
    offset = 0
  ): Promise<{
    items: T[];
    hasMore: boolean;
    totalResults: number;
  }> {
    const result = await this.request<any>({
      method: 'POST',
      path: '/query/v1/suiteql',
      query: { limit: String(limit), offset: String(offset) },
      body: { q: sql },
    });

    if (result.status !== 200) {
      throw new Error(`SuiteQL query failed: ${result.status} - ${JSON.stringify(result.data)}`);
    }

    return {
      items: result.data.items || [],
      hasMore: result.data.hasMore || false,
      totalResults: result.data.totalResults || 0,
    };
  }

  /**
   * Fetch sales orders via SuiteQL (fallback when Record API lacks permissions)
   */
  async getSalesOrdersViaSuiteQL(limit = 50): Promise<any[]> {
    const sql = `
      SELECT
        t.id,
        t.tranid AS tranId,
        t.status,
        t.trandate AS tranDate,
        t.shipdate AS shipDate,
        t.memo,
        t.entity,
        BUILTIN.DF(t.entity) AS entityName,
        BUILTIN.DF(t.status) AS statusName
      FROM transaction t
      WHERE t.type = 'SalesOrd'
      ORDER BY t.trandate DESC
    `;
    const result = await this.suiteqlQuery(sql, limit);
    return result.items;
  }

  /**
   * Fetch a single sales order with line items via SuiteQL
   */
  async getSalesOrderViaSuiteQL(id: string): Promise<any> {
    // Get the order header
    const headerSql = `
      SELECT
        t.id,
        t.tranid AS "tranId",
        t.status,
        t.trandate AS "tranDate",
        t.shipdate AS "shipDate",
        t.memo,
        t.entity,
        BUILTIN.DF(t.entity) AS "entityName",
        BUILTIN.DF(t.status) AS "statusName",
        t.shipaddress AS "shippingAddress"
      FROM transaction t
      WHERE t.id = ${id}
    `;
    const header = await this.suiteqlQuery(headerSql, 1);
    if (header.items.length === 0) {
      throw new Error(`Sales order ${id} not found`);
    }

    // Get line items
    const linesSql = `
      SELECT
        tl.item,
        BUILTIN.DF(tl.item) AS "itemName",
        tl.quantity,
        tl.rate,
        tl.amount,
        tl.line
      FROM transactionline tl
      WHERE tl.transaction = ${id}
        AND tl.mainline = 'F'
        AND tl.item IS NOT NULL
    `;
    const lines = await this.suiteqlQuery(linesSql, 1000);

    const order = header.items[0];
    order.lineItems = lines.items;
    return order;
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
