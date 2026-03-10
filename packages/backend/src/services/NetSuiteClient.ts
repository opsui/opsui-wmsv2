/**
 * NetSuite SOAP API Client
 *
 * Uses Token-Based Authentication (TBA) with OAuth 1.0 HMAC-SHA256
 * via the SuiteTalk SOAP Web Services API.
 *
 * Used to pull sales orders for warehouse picking & packing.
 */

import crypto from 'crypto';
import https from 'https';
import config from '../config';
import { logger } from '../config/logger';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// SOAP XML HELPERS
// ============================================================================

const NS_VERSION = '2023_1';
const NAMESPACES = {
  soap: 'http://schemas.xmlsoap.org/soap/envelope/',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  tns: `urn:messages_${NS_VERSION}.platform.webservices.netsuite.com`,
  platformCore: `urn:core_${NS_VERSION}.platform.webservices.netsuite.com`,
  platformCommon: `urn:common_${NS_VERSION}.platform.webservices.netsuite.com`,
  tranSales: `urn:sales_${NS_VERSION}.transactions.webservices.netsuite.com`,
};

// ============================================================================
// CLIENT
// ============================================================================

export class NetSuiteClient {
  private accountId: string;
  private tokenId: string;
  private tokenSecret: string;
  private consumerKey: string;
  private consumerSecret: string;
  private soapUrl: string;

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

    const restAccountId = this.accountId.toLowerCase().replace(/_/g, '-');
    this.soapUrl = `https://${restAccountId}.suitetalk.api.netsuite.com/services/NetSuitePort_${NS_VERSION}`;
  }

  // ==========================================================================
  // SOAP TRANSPORT
  // ==========================================================================

  private generateTokenPassport(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const baseString = `${this.accountId}&${this.consumerKey}&${this.tokenId}&${nonce}&${timestamp}`;
    const signingKey = `${this.consumerSecret}&${this.tokenSecret}`;
    const signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');

    return [
      '<tns:tokenPassport>',
      `  <platformCore:account>${this.accountId}</platformCore:account>`,
      `  <platformCore:consumerKey>${this.consumerKey}</platformCore:consumerKey>`,
      `  <platformCore:token>${this.tokenId}</platformCore:token>`,
      `  <platformCore:nonce>${nonce}</platformCore:nonce>`,
      `  <platformCore:timestamp>${timestamp}</platformCore:timestamp>`,
      `  <platformCore:signature algorithm="HMAC-SHA256">${signature}</platformCore:signature>`,
      '</tns:tokenPassport>',
    ].join('\n');
  }

  private buildEnvelope(headerExtra: string, body: string): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<soap:Envelope xmlns:soap="${NAMESPACES.soap}"`,
      `  xmlns:xsi="${NAMESPACES.xsi}"`,
      `  xmlns:tns="${NAMESPACES.tns}"`,
      `  xmlns:platformCore="${NAMESPACES.platformCore}"`,
      `  xmlns:platformCommon="${NAMESPACES.platformCommon}"`,
      `  xmlns:tranSales="${NAMESPACES.tranSales}">`,
      '  <soap:Header>',
      `    ${this.generateTokenPassport()}`,
      headerExtra ? `    ${headerExtra}` : '',
      '  </soap:Header>',
      '  <soap:Body>',
      `    ${body}`,
      '  </soap:Body>',
      '</soap:Envelope>',
    ].join('\n');
  }

  private async soapRequest(soapAction: string, envelope: string): Promise<string> {
    const urlObj = new URL(this.soapUrl);
    const bodyBuf = Buffer.from(envelope, 'utf-8');

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: soapAction,
            'Content-Length': bodyBuf.length,
          },
        },
        res => {
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 500 && data.includes('faultstring')) {
              const fault = this.extractTag(data, 'faultstring');
              logger.warn('NetSuite SOAP fault', { soapAction, fault });
            }
            resolve(data);
          });
        }
      );

      req.on('error', err => {
        logger.error('NetSuite SOAP request failed', { soapAction, error: err.message });
        reject(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('NetSuite SOAP request timeout'));
      });

      req.write(bodyBuf);
      req.end();
    });
  }

  // ==========================================================================
  // XML PARSING HELPERS
  // ==========================================================================

  private extractTag(xml: string, tag: string): string {
    // Match tag regardless of namespace prefix
    const regex = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractAttribute(xml: string, tag: string, attr: string): string {
    const regex = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*?${attr}="([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }

  private extractAllRecords(xml: string): string[] {
    const records: string[] = [];
    // Match <platformCore:record ...>...</platformCore:record> or any namespaced record tag
    const regex =
      /<(?:[\w-]+:)?record\s[^>]*xsi:type="tranSales:SalesOrder"[^>]*>[\s\S]*?<\/(?:[\w-]+:)?record>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      records.push(match[0]);
    }
    return records;
  }

  private extractAllFulfillmentRecords(xml: string): string[] {
    const records: string[] = [];
    const regex =
      /<(?:[\w-]+:)?record\s[^>]*xsi:type="tranSales:ItemFulfillment"[^>]*>[\s\S]*?<\/(?:[\w-]+:)?record>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      records.push(match[0]);
    }
    return records;
  }

  private parseSalesOrderFromXml(recordXml: string): NetSuiteSalesOrder {
    const internalId = this.extractAttribute(recordXml, 'record', 'internalId');
    const tranId = this.extractTag(recordXml, 'tranId');
    const tranDate = this.extractTag(recordXml, 'tranDate');
    const shipDate = this.extractTag(recordXml, 'shipDate');
    const memo = this.extractTag(recordXml, 'memo');

    // Entity
    const entityId = this.extractAttribute(recordXml, 'entity', 'internalId');
    const entityName = this.extractTag(recordXml, 'name') || this.extractTag(recordXml, 'entity');

    // Status
    const statusId = this.extractAttribute(recordXml, 'status', 'internalId') || '';
    const statusName =
      this.extractTag(recordXml, 'statusRef') || this.extractTag(recordXml, 'status') || '';

    // Shipping address
    const shippingBlock =
      this.extractTag(recordXml, 'shippingAddress') || this.extractTag(recordXml, 'shipAddress');
    const addr1 = this.extractTag(shippingBlock, 'addr1');
    const addr2 = this.extractTag(shippingBlock, 'addr2');
    const city = this.extractTag(shippingBlock, 'city');
    const state = this.extractTag(shippingBlock, 'state');
    const zip = this.extractTag(shippingBlock, 'zip');
    const country = this.extractTag(shippingBlock, 'country');

    // Line items
    const items = this.parseLineItems(recordXml);

    return {
      id: internalId,
      tranId: tranId || internalId,
      status: { id: statusId, refName: statusName },
      entity: { id: entityId, refName: entityName },
      tranDate,
      shipDate: shipDate || undefined,
      memo: memo || undefined,
      item: items.length > 0 ? { items } : undefined,
      shippingAddress:
        addr1 || city
          ? {
              addr1,
              addr2,
              city,
              state,
              zip,
              country: country ? { id: country, refName: country } : undefined,
            }
          : undefined,
    };
  }

  private parseLineItems(recordXml: string): NetSuiteSalesOrderLine[] {
    const lines: NetSuiteSalesOrderLine[] = [];
    // Match individual line item blocks
    const lineRegex = /<(?:[\w-]+:)?(?:item|line)\b[^>]*>[\s\S]*?<\/(?:[\w-]+:)?(?:item|line)>/gi;
    const lineBlocks = recordXml.match(lineRegex) || [];

    let lineNum = 1;
    for (const block of lineBlocks) {
      // Skip the outer <itemList> wrapper
      if (block.includes('itemList') || block.includes('ItemList')) continue;

      const itemId = this.extractAttribute(block, 'item', 'internalId');
      const itemName =
        this.extractTag(block, 'name') ||
        this.extractTag(block, 'item') ||
        this.extractTag(block, 'description') ||
        '';
      const quantity = parseFloat(this.extractTag(block, 'quantity')) || 0;
      const rate = parseFloat(this.extractTag(block, 'rate')) || undefined;
      const amount = parseFloat(this.extractTag(block, 'amount')) || undefined;
      const description = this.extractTag(block, 'description') || undefined;
      const line = parseInt(this.extractTag(block, 'line')) || lineNum;

      if (quantity > 0 && (itemId || itemName)) {
        lines.push({
          item: { id: itemId, refName: itemName.replace(/<[^>]*>/g, '').trim() },
          quantity,
          rate,
          amount,
          description,
          line,
        });
      }
      lineNum++;
    }

    return lines;
  }

  // ==========================================================================
  // PUBLIC API — same interface as the old REST client
  // ==========================================================================

  /**
   * Test connectivity to NetSuite SOAP API
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency: number }> {
    const start = Date.now();
    try {
      const envelope = this.buildEnvelope('', '<tns:getServerTime/>');
      const response = await this.soapRequest('getServerTime', envelope);
      const latency = Date.now() - start;

      if (response.includes('isSuccess="true"')) {
        const serverTime = this.extractTag(response, 'serverTime');
        return {
          success: true,
          message: `Connected to NetSuite SOAP API (server time: ${serverTime})`,
          latency,
        };
      }

      const fault = this.extractTag(response, 'faultstring');
      return {
        success: false,
        message: fault || `NetSuite SOAP request failed`,
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
   * Fetch sales orders from NetSuite using SOAP search
   */
  async getSalesOrders(
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<NetSuiteListResponse<NetSuiteSalesOrder>> {
    const pageSize = options.limit || 50;

    const searchPrefs = [
      '<tns:searchPreferences>',
      `  <tns:pageSize>${pageSize}</tns:pageSize>`,
      '  <tns:bodyFieldsOnly>false</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:TransactionSearchBasic">',
      '    <platformCommon:type operator="anyOf">',
      '      <platformCore:searchValue>_salesOrder</platformCore:searchValue>',
      '    </platformCommon:type>',
      '    <platformCommon:mainLine operator="is">',
      '      <platformCore:searchValue>true</platformCore:searchValue>',
      '    </platformCommon:mainLine>',
      '  </tns:searchRecord>',
      '</tns:search>',
    ].join('\n');

    const envelope = this.buildEnvelope(searchPrefs, searchBody);
    const response = await this.soapRequest('search', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') ||
        this.extractTag(response, 'message') ||
        'Unknown SOAP error';
      throw new Error(`Failed to fetch sales orders: ${fault}`);
    }

    const totalRecords = parseInt(this.extractTag(response, 'totalRecords')) || 0;
    const records = this.extractAllRecords(response);

    const items: Array<
      { links: Array<{ rel: string; href: string }>; id: string } & NetSuiteSalesOrder
    > = records.map(recordXml => {
      const order = this.parseSalesOrderFromXml(recordXml);
      return {
        links: [],
        ...order,
      };
    });

    logger.info('Fetched sales orders via SOAP', { count: items.length, totalRecords });

    return {
      links: [],
      count: items.length,
      hasMore: items.length < totalRecords,
      items,
      offset: 0,
      totalResults: totalRecords,
    };
  }

  /**
   * Fetch item fulfillments from NetSuite using SOAP search
   */
  async getItemFulfillments(
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<NetSuiteListResponse<any>> {
    const pageSize = options.limit || 50;

    const searchPrefs = [
      '<tns:searchPreferences>',
      `  <tns:pageSize>${pageSize}</tns:pageSize>`,
      '  <tns:bodyFieldsOnly>false</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:TransactionSearchBasic">',
      '    <platformCommon:type operator="anyOf">',
      '      <platformCore:searchValue>_itemFulfillment</platformCore:searchValue>',
      '    </platformCommon:type>',
      '    <platformCommon:mainLine operator="is">',
      '      <platformCore:searchValue>true</platformCore:searchValue>',
      '    </platformCommon:mainLine>',
      '  </tns:searchRecord>',
      '</tns:search>',
    ].join('\n');

    const envelope = this.buildEnvelope(searchPrefs, searchBody);
    const response = await this.soapRequest('search', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') ||
        this.extractTag(response, 'message') ||
        'Unknown SOAP error';
      throw new Error(`Failed to fetch item fulfillments: ${fault}`);
    }

    const totalRecords = parseInt(this.extractTag(response, 'totalRecords')) || 0;
    const records = this.extractAllFulfillmentRecords(response);

    const items = records.map(recordXml => {
      const internalId = this.extractAttribute(recordXml, 'record', 'internalId');
      const tranId = this.extractTag(recordXml, 'tranId');
      return { links: [], id: internalId, tranId };
    });

    logger.info('Fetched item fulfillments via SOAP', { count: items.length, totalRecords });

    return {
      links: [],
      count: items.length,
      hasMore: items.length < totalRecords,
      items,
      offset: 0,
      totalResults: totalRecords,
    };
  }

  /**
   * Fetch a single item fulfillment with full details
   */
  async getItemFulfillment(id: string): Promise<any> {
    const body = [
      '<tns:get>',
      '  <tns:baseRef xsi:type="platformCore:RecordRef"',
      `    type="itemFulfillment" internalId="${this.escapeXml(id)}"/>`,
      '</tns:get>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    const response = await this.soapRequest('get', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') || this.extractTag(response, 'message');
      throw new Error(`Failed to fetch item fulfillment ${id}: ${fault || 'Unknown error'}`);
    }

    // Parse basic fulfillment data
    const internalId = this.extractAttribute(response, 'record', 'internalId');
    const tranId = this.extractTag(response, 'tranId');
    const memo = this.extractTag(response, 'memo');
    const shipDate = this.extractTag(response, 'shipDate');
    const entityId = this.extractAttribute(response, 'entity', 'internalId');
    const entityName = this.extractTag(response, 'name');
    const createdFromId = this.extractAttribute(response, 'createdFrom', 'internalId');
    const createdFromName = this.extractTag(response, 'createdFrom') || '';

    // Shipping address
    const shippingBlock =
      this.extractTag(response, 'shippingAddress') || this.extractTag(response, 'shipAddress');

    // Line items
    const lineItems = this.parseLineItems(response);

    return {
      id: internalId || id,
      tranId: tranId || id,
      memo,
      shipDate: shipDate || undefined,
      entity: { id: entityId, refName: entityName },
      createdFrom: { id: createdFromId, refName: createdFromName.replace(/<[^>]*>/g, '').trim() },
      item: lineItems.length > 0 ? { items: lineItems } : lineItems,
      shippingAddress: shippingBlock
        ? {
            addr1: this.extractTag(shippingBlock, 'addr1'),
            addr2: this.extractTag(shippingBlock, 'addr2'),
            city: this.extractTag(shippingBlock, 'city'),
            state: this.extractTag(shippingBlock, 'state'),
            zip: this.extractTag(shippingBlock, 'zip'),
            country: {
              id: this.extractTag(shippingBlock, 'country'),
              refName: this.extractTag(shippingBlock, 'country'),
            },
          }
        : undefined,
    };
  }

  /**
   * Fetch a single sales order with full details (including line items)
   */
  async getSalesOrder(id: string): Promise<NetSuiteSalesOrder> {
    const body = [
      '<tns:get>',
      '  <tns:baseRef xsi:type="platformCore:RecordRef"',
      `    type="salesOrder" internalId="${this.escapeXml(id)}"/>`,
      '</tns:get>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    const response = await this.soapRequest('get', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') || this.extractTag(response, 'message');
      throw new Error(`Failed to fetch sales order ${id}: ${fault || 'Unknown error'}`);
    }

    return this.parseSalesOrderFromXml(response);
  }

  /**
   * Update a sales order status in NetSuite (e.g., mark as fulfilled)
   */
  async updateSalesOrderStatus(id: string, updates: Record<string, unknown>): Promise<void> {
    // Build field updates
    const fields = Object.entries(updates)
      .map(
        ([key, value]) =>
          `<tranSales:${this.escapeXml(key)}>${this.escapeXml(String(value))}</tranSales:${this.escapeXml(key)}>`
      )
      .join('\n');

    const body = [
      '<tns:update>',
      `  <tns:record xsi:type="tranSales:SalesOrder" internalId="${this.escapeXml(id)}">`,
      `    ${fields}`,
      '  </tns:record>',
      '</tns:update>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    const response = await this.soapRequest('update', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') || this.extractTag(response, 'message');
      throw new Error(`Failed to update sales order ${id}: ${fault || 'Unknown error'}`);
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
    const pageSize = options.limit || 50;

    const searchPrefs = [
      '<tns:searchPreferences>',
      `  <tns:pageSize>${pageSize}</tns:pageSize>`,
      '  <tns:bodyFieldsOnly>true</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:ItemSearchBasic">',
      '    <platformCommon:type operator="anyOf">',
      '      <platformCore:searchValue>_inventoryItem</platformCore:searchValue>',
      '    </platformCommon:type>',
      '  </tns:searchRecord>',
      '</tns:search>',
    ].join('\n');

    const envelope = this.buildEnvelope(searchPrefs, searchBody);
    const response = await this.soapRequest('search', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault = this.extractTag(response, 'faultstring') || 'Unknown SOAP error';
      throw new Error(`Failed to fetch inventory items: ${fault}`);
    }

    const totalRecords = parseInt(this.extractTag(response, 'totalRecords')) || 0;

    return {
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: totalRecords,
    };
  }

  /**
   * Create an item fulfillment record in NetSuite
   */
  async createItemFulfillment(
    salesOrderId: string,
    _fulfillmentData: Record<string, unknown>
  ): Promise<string> {
    // Initialize fulfillment from sales order
    const body = [
      '<tns:initialize>',
      '  <tns:initializeRecord>',
      '    <platformCore:type>itemFulfillment</platformCore:type>',
      '    <platformCore:reference xsi:type="platformCore:RecordRef"',
      `      type="salesOrder" internalId="${this.escapeXml(salesOrderId)}"/>`,
      '  </tns:initializeRecord>',
      '</tns:initialize>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    const response = await this.soapRequest('initialize', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault = this.extractTag(response, 'faultstring') || 'Unknown SOAP error';
      throw new Error(`Failed to create item fulfillment for SO ${salesOrderId}: ${fault}`);
    }

    // Extract the initialized record and add it
    const addBody = [
      '<tns:add>',
      `  <tns:record xsi:type="tranSales:ItemFulfillment" internalId="">`,
      `    <tranSales:createdFrom internalId="${this.escapeXml(salesOrderId)}"/>`,
      '  </tns:record>',
      '</tns:add>',
    ].join('\n');

    const addEnvelope = this.buildEnvelope('', addBody);
    const addResponse = await this.soapRequest('add', addEnvelope);

    if (!addResponse.includes('isSuccess="true"')) {
      const fault = this.extractTag(addResponse, 'faultstring') || 'Unknown SOAP error';
      throw new Error(`Failed to create item fulfillment for SO ${salesOrderId}: ${fault}`);
    }

    const newId = this.extractAttribute(addResponse, 'baseRef', 'internalId');
    return newId;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
