/**
 * NetSuite SOAP API Client
 *
 * Uses Token-Based Authentication (TBA) with OAuth 1.0 HMAC-SHA256
 * via the SuiteTalk SOAP Web Services API.
 *
 * Used to pull sales orders for warehouse picking & packing.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Rate limiting to prevent API throttling
 * - Request metrics tracking
 */

import crypto from 'crypto';
import https from 'https';
import config from '../config';
import { logger } from '../config/logger';
import { withRetry, RetryOptions } from '../utils/retry';
import { getNetSuiteRateLimiter, getNetSuiteConcurrencyLimiter } from '../utils/rateLimiter';

// ============================================================================
// TYPES
// ============================================================================

export interface NetSuiteSalesOrder {
  id: string;
  tranId: string;
  otherRefNum?: string;
  status: { id: string; refName: string };
  entity: { id: string; refName: string };
  tranDate: string;
  shipDate?: string;
  memo?: string;
  readyToShip?: boolean;
  subTotal?: number;
  total?: number;
  taxTotal?: number;
  item?: { items: NetSuiteSalesOrderLine[] };
  shippingAddress?: {
    addressee?: string;
    attention?: string;
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    country?: { id: string; refName: string };
  };
}

export interface NetSuiteSalesOrderLine {
  item: { id: string; refName: string };
  quantity: number;
  quantityCommitted?: number;
  quantityFulfilled?: number;
  quantityAvailable?: number;
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

  /**
   * Execute a SOAP request with rate limiting, retry logic, and metrics tracking
   */
  private async soapRequest(soapAction: string, envelope: string): Promise<string> {
    const rateLimiter = getNetSuiteRateLimiter();
    const concurrencyLimiter = getNetSuiteConcurrencyLimiter();

    const retryOptions: RetryOptions = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      operationName: `NetSuite.${soapAction}`,
    };

    return withRetry(async () => {
      // Wait for rate limiter
      await rateLimiter.acquire();

      // Run with concurrency limit
      return concurrencyLimiter.run(async () => {
        const startTime = Date.now();
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
                const latency = Date.now() - startTime;

                if (res.statusCode && res.statusCode >= 500 && data.includes('faultstring')) {
                  const fault = this.extractTag(data, 'faultstring');
                  logger.warn('NetSuite SOAP fault', { soapAction, fault, latency });
                }

                logger.debug('NetSuite SOAP request completed', {
                  soapAction,
                  latency,
                  statusCode: res.statusCode,
                });

                resolve(data);
              });
            }
          );

          req.on('error', err => {
            logger.error('NetSuite SOAP request failed', { soapAction, error: err.message });
            reject(err);
          });

          req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('NetSuite SOAP request timeout'));
          });

          req.write(bodyBuf);
          req.end();
        });
      });
    }, retryOptions);
  }

  // ==========================================================================
  // XML PARSING HELPERS
  // ==========================================================================

  private extractTag(xml: string, tag: string): string {
    // Match tag regardless of namespace prefix
    const regex = new RegExp(
      `<(?:[\\w-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}\\b>`,
      'i'
    );
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractAttribute(xml: string, tag: string, attr: string): string {
    const regex = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*?${attr}="([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }

  private extractCustomFieldValue(xml: string, scriptId: string): string {
    // Match <customField scriptId="custbody8" ...>...<value>true</value>...</customField>
    const regex = new RegExp(
      `<(?:[\\w-]+:)?customField[^>]*scriptId="${scriptId}"[^>]*>[\\s\\S]*?<\\/(?:[\\w-]+:)?customField>`,
      'i'
    );
    const match = xml.match(regex);
    if (!match) return '';
    return this.extractTag(match[0], 'value');
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

  private normalizeNetSuiteBusinessDate(value: string): string {
    if (!value) {
      return value;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Pacific/Auckland',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(parsed);

    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;

    return year && month && day ? `${year}-${month}-${day}` : value;
  }

  private parseShippingAddress(block?: string): NetSuiteSalesOrder['shippingAddress'] | undefined {
    if (!block) {
      return undefined;
    }

    const addressee = this.extractTag(block, 'addressee') || this.extractTag(block, 'company');
    const attention = this.extractTag(block, 'attention');
    const addr1 = this.extractTag(block, 'addr1');
    const addr2 = this.extractTag(block, 'addr2');
    const city = this.extractTag(block, 'city');
    const state = this.extractTag(block, 'state');
    const zip = this.extractTag(block, 'zip');
    const phone = this.extractTag(block, 'addrPhone') || this.extractTag(block, 'phone');
    const email = this.extractTag(block, 'addrEmail') || this.extractTag(block, 'email');
    const country = this.extractTag(block, 'country');

    if (
      !addressee &&
      !attention &&
      !addr1 &&
      !addr2 &&
      !city &&
      !state &&
      !zip &&
      !phone &&
      !email &&
      !country
    ) {
      return undefined;
    }

    return {
      addressee: addressee || undefined,
      attention: attention || undefined,
      addr1: addr1 || undefined,
      addr2: addr2 || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      phone: phone || undefined,
      email: email || undefined,
      country: country ? { id: country, refName: country } : undefined,
    };
  }

  private parseSalesOrderFromXml(recordXml: string): NetSuiteSalesOrder {
    const internalId = this.extractAttribute(recordXml, 'record', 'internalId');
    const tranId = this.extractTag(recordXml, 'tranId');
    const otherRefNum = this.extractTag(recordXml, 'otherRefNum');
    const tranDate = this.normalizeNetSuiteBusinessDate(this.extractTag(recordXml, 'tranDate'));
    const shipDate = this.normalizeNetSuiteBusinessDate(this.extractTag(recordXml, 'shipDate'));
    const memo = this.extractTag(recordXml, 'memo');
    const subTotal = parseFloat(this.extractTag(recordXml, 'subTotal')) || undefined;
    const total = parseFloat(this.extractTag(recordXml, 'total')) || undefined;
    const taxTotal = parseFloat(this.extractTag(recordXml, 'taxTotal')) || undefined;

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
    const shippingAddress = this.parseShippingAddress(shippingBlock);

    // Line items
    const items = this.parseLineItems(recordXml);

    // "Ready To Ship" = custbody8 checkbox on the sales order (set by sales team)
    const readyToShip =
      recordXml.includes('custbody8') &&
      this.extractCustomFieldValue(recordXml, 'custbody8') === 'true';

    return {
      id: internalId,
      tranId: tranId || internalId,
      otherRefNum: otherRefNum || undefined,
      status: { id: statusId, refName: statusName },
      entity: { id: entityId, refName: entityName },
      tranDate,
      shipDate: shipDate || undefined,
      memo: memo || undefined,
      readyToShip,
      subTotal,
      total,
      taxTotal,
      item: items.length > 0 ? { items } : undefined,
      shippingAddress,
    };
  }

  private parseLineItems(recordXml: string): NetSuiteSalesOrderLine[] {
    const lines: NetSuiteSalesOrderLine[] = [];

    // Extract the itemList block first
    const itemListBlock = this.extractTag(recordXml, 'itemList');
    const xmlToParse = itemListBlock || recordXml;

    // NetSuite SOAP line items have this structure:
    // <tranSales:item>                          ← outer line wrapper (no attributes)
    //   <tranSales:item internalId="123">       ← inner item reference
    //     <platformCore:name>SKU</platformCore:name>
    //   </tranSales:item>
    //   <tranSales:quantity>5.0</tranSales:quantity>
    //   <tranSales:line>1</tranSales:line>
    //   ...
    // </tranSales:item>                         ← outer close
    //
    // Strategy: split the itemList on the outer <ns:item> open tags (which have NO attributes)
    // Each outer item starts with `<tranSales:item>` (bare, no internalId) followed by an inner
    // `<tranSales:item internalId="...">`.

    // Split by the outer item open tag pattern: <ns:item> immediately followed by <ns:item internalId=
    const splitPattern = /<([\w-]+):item>(?=\s*<[\w-]+:item\s+internalId)/gi;
    const parts = xmlToParse.split(splitPattern);

    // parts[0] is before first match, then alternating: [captureGroup, content, captureGroup, content, ...]
    // We want the content parts (odd indices after filtering)
    for (let i = 2; i < parts.length; i += 2) {
      const block = parts[i];
      if (!block || !block.includes('quantity')) continue;

      const itemId = this.extractAttribute(block, 'item', 'internalId');
      const itemName =
        this.extractTag(block, 'name') || this.extractTag(block, 'description') || '';
      const quantity = parseFloat(this.extractTag(block, 'quantity')) || 0;
      const quantityCommitted = parseFloat(this.extractTag(block, 'quantityCommitted')) || 0;
      const quantityFulfilled = parseFloat(this.extractTag(block, 'quantityFulfilled')) || 0;
      const quantityAvailable = parseFloat(this.extractTag(block, 'quantityAvailable')) || 0;
      const rate = parseFloat(this.extractTag(block, 'rate')) || undefined;
      const amount = parseFloat(this.extractTag(block, 'amount')) || undefined;
      const description = this.extractTag(block, 'description') || undefined;
      const line = parseInt(this.extractTag(block, 'line')) || lines.length + 1;

      if (quantity > 0 && (itemId || itemName)) {
        lines.push({
          item: { id: itemId, refName: itemName.replace(/<[^>]*>/g, '').trim() },
          quantity,
          quantityCommitted,
          quantityFulfilled,
          quantityAvailable,
          rate,
          amount,
          description,
          line,
        });
      }
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
   * Fetch remaining pages of a SOAP search using searchMoreWithId
   */
  private async searchMoreWithId(searchId: string, pageIndex: number): Promise<string> {
    const body = [
      '<tns:searchMoreWithId>',
      `  <tns:searchId>${this.escapeXml(searchId)}</tns:searchId>`,
      `  <tns:pageIndex>${pageIndex}</tns:pageIndex>`,
      '</tns:searchMoreWithId>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    return this.soapRequest('searchMoreWithId', envelope);
  }

  private parseFulfillmentsFromSearchResponse(response: string): any[] {
    const records = this.extractAllFulfillmentRecords(response);

    return records.map(recordXml => {
      const internalId = this.extractAttribute(recordXml, 'record', 'internalId');
      const tranId = this.extractTag(recordXml, 'tranId');
      const shipStatusRaw =
        this.extractAttribute(recordXml, 'shipStatus', '_scriptId') ||
        this.extractTag(recordXml, 'shipStatus') ||
        '';
      const shipStatus = shipStatusRaw
        .replace(/<[^>]*>/g, '')
        .trim()
        .toLowerCase();
      const createdFromId = this.extractAttribute(recordXml, 'createdFrom', 'internalId');
      const createdFromName = this.extractTag(recordXml, 'createdFrom') || '';
      const lineItems = this.parseLineItems(recordXml);
      const shippingBlock =
        this.extractTag(recordXml, 'shippingAddress') || this.extractTag(recordXml, 'shipAddress');
      const shippingAddress = this.parseShippingAddress(shippingBlock);

      return {
        links: [],
        id: internalId,
        tranId,
        shipStatus,
        createdFrom: createdFromId
          ? {
              id: createdFromId,
              refName: createdFromName.replace(/<[^>]*>/g, '').trim(),
            }
          : undefined,
        item: lineItems.length > 0 ? { items: lineItems } : undefined,
        shippingAddress,
      };
    });
  }

  /**
   * Fetch sales orders from NetSuite using SOAP search with pagination
   */
  async getSalesOrders(
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      modifiedAfter?: Date;
    } = {}
  ): Promise<NetSuiteListResponse<NetSuiteSalesOrder>> {
    // Use page size 200 (NetSuite default max for searches with body fields)
    // If a smaller limit is provided, shrink the page size to reduce payload.
    const limit = options.limit ? Math.max(1, options.limit) : null;
    const pageSize = limit ? Math.min(200, limit) : 200;

    const searchPrefs = [
      '<tns:searchPreferences>',
      `  <tns:pageSize>${pageSize}</tns:pageSize>`,
      '  <tns:bodyFieldsOnly>true</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    // Fetch recent sales orders and filter statuses client-side.
    // The SOAP status filter returned false-zero results in production.
    const dateFrom = options.modifiedAfter
      ? new Date(options.modifiedAfter).toISOString()
      : (() => {
          const recentSoDate = new Date();
          recentSoDate.setDate(recentSoDate.getDate() - 7);
          return recentSoDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
        })();

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:TransactionSearchBasic">',
      '    <platformCommon:type operator="anyOf">',
      '      <platformCore:searchValue>_salesOrder</platformCore:searchValue>',
      '    </platformCommon:type>',
      '    <platformCommon:lastModifiedDate operator="after">',
      `      <platformCore:searchValue>${dateFrom}</platformCore:searchValue>`,
      '    </platformCommon:lastModifiedDate>',
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
    const totalPages = parseInt(this.extractTag(response, 'totalPages')) || 1;
    const searchId = this.extractTag(response, 'searchId');

    // Parse page 1 records
    let allRecords = this.extractAllRecords(response);

    logger.info('Sales order search page 1', {
      totalRecords,
      totalPages,
      recordsInPage: allRecords.length,
      hasSearchId: !!searchId,
    });

    // Fetch remaining pages using searchMoreWithId
    if (totalPages > 1 && searchId) {
      for (let page = 2; page <= totalPages; page++) {
        if (limit && allRecords.length >= limit) break;
        try {
          const pageResponse = await this.searchMoreWithId(searchId, page);

          if (!pageResponse.includes('isSuccess="true"')) {
            logger.warn('Failed to fetch sales order page', { page, totalPages });
            break;
          }

          const pageRecords = this.extractAllRecords(pageResponse);
          allRecords = allRecords.concat(pageRecords);

          if (limit && allRecords.length >= limit) {
            allRecords = allRecords.slice(0, limit);
            break;
          }

          logger.info('Sales order search page fetched', {
            page,
            totalPages,
            recordsInPage: pageRecords.length,
            totalSoFar: allRecords.length,
          });
        } catch (err: any) {
          logger.error('Error fetching sales order page', {
            page,
            totalPages,
            error: err.message,
          });
          break;
        }
      }
    }

    const allItems: Array<
      { links: Array<{ rel: string; href: string }>; id: string } & NetSuiteSalesOrder
    > = allRecords.map(recordXml => {
      const order = this.parseSalesOrderFromXml(recordXml);
      return {
        links: [],
        ...order,
      };
    });

    if (limit && allItems.length > limit) {
      allItems.length = limit;
    }

    // Log all unique statuses found for debugging
    const statusMap = new Map<string, number>();
    for (const item of allItems) {
      const key = `${item.status?.id || '?'}|${item.status?.refName || '?'}`;
      statusMap.set(key, (statusMap.get(key) || 0) + 1);
    }
    logger.info('Sales order statuses found', {
      statuses: Object.fromEntries(statusMap),
      totalFetched: allItems.length,
      totalPages,
    });

    // Filter to Pending Fulfillment status client-side
    const items = options.status
      ? allItems.filter(item => {
          const statusName = (item.status?.refName || '').toLowerCase();
          return statusName.includes('pending fulfillment');
        })
      : allItems;

    logger.info('Fetched sales orders via SOAP', {
      count: items.length,
      totalFetched: allItems.length,
      totalRecords,
      totalPages,
      statusFilter: options.status || 'none',
      modifiedAfter: options.modifiedAfter ? dateFrom : null,
      usedServerSideStatusFilter: false,
    });

    return {
      links: [],
      count: items.length,
      hasMore: false,
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
      shipStatus?: string;
      modifiedAfter?: Date;
    } = {}
  ): Promise<NetSuiteListResponse<any>> {
    const pageSize = Math.max(5, Math.min(options.limit || 50, 1000));

    const searchPrefs = [
      '<tns:searchPreferences>',
      `  <tns:pageSize>${pageSize}</tns:pageSize>`,
      '  <tns:bodyFieldsOnly>false</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    // Default to a 7-day window, but allow callers to narrow the sweep for incremental syncs.
    const modifiedAfter = options.modifiedAfter
      ? new Date(options.modifiedAfter)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateFrom = modifiedAfter.toISOString();

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:TransactionSearchBasic">',
      '    <platformCommon:type operator="anyOf">',
      '      <platformCore:searchValue>_itemFulfillment</platformCore:searchValue>',
      '    </platformCommon:type>',
      '    <platformCommon:lastModifiedDate operator="after">',
      `      <platformCore:searchValue>${dateFrom}</platformCore:searchValue>`,
      '    </platformCommon:lastModifiedDate>',
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
    const totalPages = parseInt(this.extractTag(response, 'totalPages')) || 1;
    const searchId = this.extractTag(response, 'searchId');
    let allItems = this.parseFulfillmentsFromSearchResponse(response);

    if (totalPages > 1 && searchId) {
      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageResponse = await this.searchMoreWithId(searchId, page);

          if (!pageResponse.includes('isSuccess="true"')) {
            logger.warn('Failed to fetch item fulfillment page', { page, totalPages });
            break;
          }

          allItems = allItems.concat(this.parseFulfillmentsFromSearchResponse(pageResponse));
        } catch (err: any) {
          logger.error('Error fetching item fulfillment page', {
            page,
            totalPages,
            error: err.message,
          });
          break;
        }
      }
    }

    // Return all fulfillments (including shipped) — sync service handles status filtering
    const items = allItems;

    logger.info('Fetched item fulfillments via SOAP', {
      count: items.length,
      totalRecords,
      totalPages,
      modifiedAfter: dateFrom,
    });

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
   * Fetch item fulfillments for specific sales order internal IDs
   * This is more efficient than fetching all fulfillments when we only need specific ones
   */
  async getItemFulfillmentsBySalesOrder(soInternalIds: string[]): Promise<any[]> {
    if (!soInternalIds || soInternalIds.length === 0) return [];

    const pageSize = 100;
    const searchPrefs = [
      '<tns:searchPreferences>',
      `  <tns:pageSize>${pageSize}</tns:pageSize>`,
      '  <tns:bodyFieldsOnly>false</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    // Build search filter for multiple SO IDs
    const idFilters = soInternalIds.map(
      id =>
        `      <platformCore:searchValue internalId="${this.escapeXml(id)}" xsi:type="platformCore:RecordRef"/>`
    );

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:TransactionSearchBasic">',
      '    <platformCommon:type operator="anyOf" xsi:type="platformCore:SearchEnumMultiSelectField">',
      '      <platformCore:searchValue>_itemFulfillment</platformCore:searchValue>',
      '    </platformCommon:type>',
      '    <platformCommon:createdFrom operator="anyOf" xsi:type="platformCore:SearchMultiSelectField">',
      idFilters.join('\n'),
      '    </platformCommon:createdFrom>',
      '  </tns:searchRecord>',
      '</tns:search>',
    ].join('\n');

    const envelope = this.buildEnvelope(searchPrefs, searchBody);

    try {
      const response = await this.soapRequest('search', envelope);

      if (!response.includes('isSuccess="true"')) {
        const fault =
          this.extractTag(response, 'faultstring') || this.extractTag(response, 'message');
        logger.warn('Failed to search fulfillments by SO IDs', {
          soIds: soInternalIds.slice(0, 5),
          error: fault,
        });
        return [];
      }

      const totalPages = parseInt(this.extractTag(response, 'totalPages')) || 1;
      const searchId = this.extractTag(response, 'searchId');
      let fulfillments = this.parseFulfillmentsFromSearchResponse(response);

      if (totalPages > 1 && searchId) {
        for (let page = 2; page <= totalPages; page++) {
          try {
            const pageResponse = await this.searchMoreWithId(searchId, page);

            if (!pageResponse.includes('isSuccess="true"')) {
              logger.warn('Failed to fetch targeted fulfillment page', { page, totalPages });
              break;
            }

            fulfillments = fulfillments.concat(
              this.parseFulfillmentsFromSearchResponse(pageResponse)
            );
          } catch (err: any) {
            logger.error('Error fetching targeted fulfillment page', {
              page,
              totalPages,
              error: err.message,
            });
            break;
          }
        }
      }

      logger.info('Fetched fulfillments by SO IDs', {
        requestedSoIds: soInternalIds.length,
        foundFulfillments: fulfillments.length,
      });

      return fulfillments;
    } catch (error: any) {
      logger.warn('Failed to fetch fulfillments by SO IDs', {
        soIds: soInternalIds.slice(0, 5),
        error: error.message,
      });
      return [];
    }
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
    const shippingAddress = this.parseShippingAddress(shippingBlock);

    // Line items
    const lineItems = this.parseLineItems(response);

    // Ship status (_picked, _packed, _shipped)
    const shipStatusRaw =
      this.extractAttribute(response, 'shipStatus', '_scriptId') ||
      this.extractTag(response, 'shipStatus') ||
      '';
    const shipStatus = shipStatusRaw
      .replace(/<[^>]*>/g, '')
      .trim()
      .toLowerCase();

    return {
      id: internalId || id,
      tranId: tranId || id,
      memo,
      shipDate: shipDate || undefined,
      shipStatus,
      entity: { id: entityId, refName: entityName },
      createdFrom: { id: createdFromId, refName: createdFromName.replace(/<[^>]*>/g, '').trim() },
      item: lineItems.length > 0 ? { items: lineItems } : lineItems,
      shippingAddress,
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

    const order = this.parseSalesOrderFromXml(response);
    return order;
  }

  /**
   * Update a sales order status in NetSuite (e.g., mark as fulfilled)
   */
  async updateSalesOrderStatus(id: string, updates: Record<string, unknown>): Promise<void> {
    const standardFields: string[] = [];
    const customFields: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (/^custbody/i.test(key)) {
        const customFieldType =
          typeof value === 'boolean' ? 'BooleanCustomFieldRef' : 'StringCustomFieldRef';
        customFields.push(
          [
            `      <platformCore:customField xsi:type="platformCore:${customFieldType}" scriptId="${this.escapeXml(key)}">`,
            `        <platformCore:value>${this.escapeXml(String(value))}</platformCore:value>`,
            '      </platformCore:customField>',
          ].join('\n')
        );
        continue;
      }

      standardFields.push(
        `    <tranSales:${this.escapeXml(key)}>${this.escapeXml(String(value))}</tranSales:${this.escapeXml(key)}>`
      );
    }

    const body = [
      '<tns:update>',
      `  <tns:record xsi:type="tranSales:SalesOrder" internalId="${this.escapeXml(id)}">`,
      ...standardFields,
      ...(customFields.length > 0
        ? ['    <tranSales:customFieldList>', ...customFields, '    </tranSales:customFieldList>']
        : []),
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
    const pageSize = Math.max(5, Math.min(options.limit || 50, 1000));

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
   * Fetch a single inventory item by internal ID to get barcode, bin, and display name
   */
  async getInventoryItem(id: string): Promise<{
    id: string;
    itemId: string;
    displayName: string;
    upcCode: string;
    binNumber: string;
    description: string;
  }> {
    // NetSuite line items can point at multiple concrete item record types.
    const itemTypes = [
      'inventoryItem',
      'assemblyItem',
      'kitItem',
      'lotNumberedInventoryItem',
      'serializedInventoryItem',
      'nonInventorySaleItem',
    ];
    let response = '';

    for (const itemType of itemTypes) {
      const body = [
        '<tns:get>',
        '  <tns:baseRef xsi:type="platformCore:RecordRef"',
        `    type="${itemType}" internalId="${this.escapeXml(id)}"/>`,
        '</tns:get>',
      ].join('\n');

      const envelope = this.buildEnvelope('', body);
      response = await this.soapRequest('get', envelope);

      if (response.includes('isSuccess="true"')) break;

      // If it's a type mismatch, try next type
      const fault = this.extractTag(response, 'faultstring') || '';
      if (fault.includes('different type') && itemType !== itemTypes[itemTypes.length - 1]) {
        continue;
      }
    }

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') || this.extractTag(response, 'message');
      throw new Error(`Failed to fetch inventory item ${id}: ${fault || 'Unknown error'}`);
    }

    const itemId = this.extractTag(response, 'itemId') || '';
    const displayName = this.extractTag(response, 'displayName') || '';
    const upcCode = this.extractTag(response, 'upcCode') || '';
    const description =
      this.extractTag(response, 'salesDescription') ||
      this.extractTag(response, 'description') ||
      '';

    // Bin number - try preferredBin, then binNumber, then location
    const preferredBinName =
      this.extractTag(response, 'preferredBinNumber') ||
      this.extractTag(response, 'binNumber') ||
      '';
    const binNumber = preferredBinName.replace(/<[^>]*>/g, '').trim();

    return {
      id,
      itemId: itemId.replace(/<[^>]*>/g, '').trim(),
      displayName: displayName.replace(/<[^>]*>/g, '').trim(),
      upcCode: upcCode.replace(/<[^>]*>/g, '').trim(),
      binNumber,
      description: description.replace(/<[^>]*>/g, '').trim(),
    };
  }

  /**
   * Create an item fulfillment record in NetSuite
   */
  async createItemFulfillment(
    salesOrderId: string,
    fulfillmentData: Record<string, unknown>
  ): Promise<string> {
    // Initialize fulfillment from sales order
    const body = [
      '<tns:initialize>',
      '  <tns:initializeRecord>',
      '    <platformCore:type>itemFulfillment</platformCore:type>',
      `    <platformCore:reference xsi:type="platformCore:InitializeRef" type="salesOrder" internalId="${this.escapeXml(salesOrderId)}"/>`,
      '  </tns:initializeRecord>',
      '</tns:initialize>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    const response = await this.soapRequest('initialize', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault = this.extractTag(response, 'faultstring') || 'Unknown SOAP error';
      throw new Error(`Failed to create item fulfillment for SO ${salesOrderId}: ${fault}`);
    }

    const initializedRecord = this.extractInitializedFulfillmentRecord(response);
    if (!initializedRecord) {
      throw new Error(
        `Failed to create item fulfillment for SO ${salesOrderId}: missing initialized record`
      );
    }

    const { recordXml: fulfillmentRecord, receivableLineCount } =
      this.markReceivableFulfillmentLines(initializedRecord, fulfillmentData);

    if (receivableLineCount === 0) {
      throw new Error(
        `Failed to create item fulfillment for SO ${salesOrderId}: no receivable fulfillment lines returned by NetSuite`
      );
    }

    const addBody = ['<tns:add>', `  ${fulfillmentRecord}`, '</tns:add>'].join('\n');

    const addEnvelope = this.buildEnvelope('', addBody);
    const addResponse = await this.soapRequest('add', addEnvelope);

    if (!addResponse.includes('isSuccess="true"')) {
      const fault = this.extractTag(addResponse, 'faultstring') || 'Unknown SOAP error';
      throw new Error(`Failed to create item fulfillment for SO ${salesOrderId}: ${fault}`);
    }

    const newId = this.extractAttribute(addResponse, 'baseRef', 'internalId');
    return newId;
  }

  async updateItemFulfillmentShipment(
    itemFulfillmentId: string,
    shipmentData: { trackingNumber: string; carrier?: string; packageWeight?: number }
  ): Promise<void> {
    const body = [
      '<tns:get>',
      '  <tns:baseRef xsi:type="platformCore:RecordRef"',
      `    type="itemFulfillment" internalId="${this.escapeXml(itemFulfillmentId)}"/>`,
      '</tns:get>',
    ].join('\n');

    const envelope = this.buildEnvelope('', body);
    const response = await this.soapRequest('get', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(response, 'faultstring') || this.extractTag(response, 'message');
      throw new Error(
        `Failed to fetch item fulfillment ${itemFulfillmentId} for shipment update: ${fault || 'Unknown error'}`
      );
    }

    const recordXml = this.extractInitializedFulfillmentRecord(response);
    if (!recordXml) {
      throw new Error(
        `Failed to update item fulfillment ${itemFulfillmentId}: missing record payload`
      );
    }

    const updatedRecord = this.applyShipmentDetailsToFulfillmentRecord(recordXml, shipmentData);
    const updateBody = ['<tns:update>', `  ${updatedRecord}`, '</tns:update>'].join('\n');
    const updateEnvelope = this.buildEnvelope('', updateBody);
    const updateResponse = await this.soapRequest('update', updateEnvelope);

    if (!updateResponse.includes('isSuccess="true"')) {
      const fault =
        this.extractTag(updateResponse, 'faultstring') ||
        this.extractTag(updateResponse, 'message');
      throw new Error(
        `Failed to update item fulfillment ${itemFulfillmentId}: ${fault || 'Unknown error'}`
      );
    }
  }

  private extractInitializedFulfillmentRecord(response: string): string | null {
    const match = response.match(/<record\b[\s\S]*?<\/record>/);
    return match ? match[0] : null;
  }

  private applyShipmentDetailsToFulfillmentRecord(
    recordXml: string,
    shipmentData: { trackingNumber: string; carrier?: string; packageWeight?: number }
  ): string {
    let updatedRecord = recordXml;
    const escapedTrackingNumber = this.escapeXml(shipmentData.trackingNumber);
    const escapedCarrier = shipmentData.carrier ? this.escapeXml(shipmentData.carrier) : '';
    const normalizedPackageWeight =
      typeof shipmentData.packageWeight === 'number' && shipmentData.packageWeight > 0
        ? shipmentData.packageWeight
        : 1;

    if (updatedRecord.includes('<tranSales:shipStatus>')) {
      updatedRecord = updatedRecord.replace(
        /<tranSales:shipStatus>[\s\S]*?<\/tranSales:shipStatus>/,
        '<tranSales:shipStatus>_shipped</tranSales:shipStatus>'
      );
    } else {
      updatedRecord = updatedRecord.replace(
        /<\/record>/,
        '<tranSales:shipStatus>_shipped</tranSales:shipStatus></record>'
      );
    }

    const packagePayload = [
      '<tranSales:package>',
      escapedCarrier ? `<tranSales:packageDescr>${escapedCarrier}</tranSales:packageDescr>` : '',
      `<tranSales:packageWeight>${normalizedPackageWeight}</tranSales:packageWeight>`,
      `<tranSales:packageTrackingNumber>${escapedTrackingNumber}</tranSales:packageTrackingNumber>`,
      '</tranSales:package>',
    ]
      .filter(Boolean)
      .join('');

    if (updatedRecord.includes('<tranSales:packageList')) {
      if (updatedRecord.includes('<tranSales:package>')) {
        updatedRecord = updatedRecord.replace(
          /<tranSales:package>[\s\S]*?<\/tranSales:package>/,
          packagePayload
        );
      } else {
        updatedRecord = updatedRecord.replace(
          /<\/tranSales:packageList>/,
          `${packagePayload}</tranSales:packageList>`
        );
      }
    } else {
      updatedRecord = updatedRecord.replace(
        /<\/record>/,
        `<tranSales:packageList replaceAll="false">${packagePayload}</tranSales:packageList></record>`
      );
    }

    return updatedRecord;
  }

  private markReceivableFulfillmentLines(
    initializedRecord: string,
    fulfillmentData: Record<string, unknown>
  ): { recordXml: string; receivableLineCount: number } {
    let receivableLineCount = 0;
    const lineSelections = this.parseFulfillmentLineSelections(fulfillmentData);
    const normalize = (value: string | undefined): string => (value || '').trim().toLowerCase();

    const recordXml = initializedRecord.replace(
      /<tranSales:item>([\s\S]*?<tranSales:quantityRemaining>[\s\S]*?<\/tranSales:quantityRemaining>[\s\S]*?)<\/tranSales:item>/g,
      (fullMatch, itemBody: string) => {
        const quantityRemainingRaw = this.extractTag(itemBody, 'quantityRemaining') || '0';
        const quantityRemaining = Number(quantityRemainingRaw);
        const orderLine = this.extractTag(itemBody, 'orderLine') || '';
        const itemInternalId = this.extractAttribute(itemBody, 'item', 'internalId') || '';
        const itemSkuName =
          this.extractTag(itemBody, 'itemName') || this.extractTag(itemBody, 'name') || '';
        const itemDescription = this.extractTag(itemBody, 'description') || '';
        const candidateNames = new Set(
          [normalize(itemSkuName), normalize(itemDescription)].filter(Boolean)
        );
        const selectedLine = lineSelections.find(
          line =>
            (line.orderLine && line.orderLine === orderLine) ||
            (line.itemId && line.itemId === itemInternalId) ||
            (line.itemName && candidateNames.has(normalize(line.itemName))) ||
            (line.sku && candidateNames.has(normalize(line.sku)))
        );
        const shouldReceive = selectedLine
          ? Number.isFinite(quantityRemaining) && quantityRemaining > 0 && selectedLine.quantity > 0
          : lineSelections.length === 0 &&
            Number.isFinite(quantityRemaining) &&
            quantityRemaining > 0;

        if (shouldReceive) {
          receivableLineCount += 1;
        }

        let updatedBody = itemBody;

        if (itemBody.includes('<tranSales:itemReceive>')) {
          updatedBody = updatedBody.replace(
            /<tranSales:itemReceive>(true|false)<\/tranSales:itemReceive>/,
            `<tranSales:itemReceive>${shouldReceive ? 'true' : 'false'}</tranSales:itemReceive>`
          );
        } else {
          updatedBody = `<tranSales:itemReceive>${shouldReceive ? 'true' : 'false'}</tranSales:itemReceive>${updatedBody}`;
        }

        if (selectedLine && shouldReceive && Number.isFinite(selectedLine.quantity)) {
          if (updatedBody.includes('<tranSales:quantity>')) {
            updatedBody = updatedBody.replace(
              /<tranSales:quantity>[\s\S]*?<\/tranSales:quantity>/,
              `<tranSales:quantity>${selectedLine.quantity}</tranSales:quantity>`
            );
          } else if (updatedBody.includes('<tranSales:quantityRemaining>')) {
            updatedBody = updatedBody.replace(
              /<tranSales:quantityRemaining>[\s\S]*?<\/tranSales:quantityRemaining>/,
              match => `${match}<tranSales:quantity>${selectedLine.quantity}</tranSales:quantity>`
            );
          } else {
            updatedBody = `${updatedBody}<tranSales:quantity>${selectedLine.quantity}</tranSales:quantity>`;
          }
        } else if (!shouldReceive) {
          // Explicitly zero out quantity so NetSuite doesn't autofill from the SO
          if (updatedBody.includes('<tranSales:quantity>')) {
            updatedBody = updatedBody.replace(
              /<tranSales:quantity>[\s\S]*?<\/tranSales:quantity>/,
              `<tranSales:quantity>0</tranSales:quantity>`
            );
          } else if (updatedBody.includes('<tranSales:quantityRemaining>')) {
            updatedBody = updatedBody.replace(
              /<tranSales:quantityRemaining>[\s\S]*?<\/tranSales:quantityRemaining>/,
              match => `${match}<tranSales:quantity>0</tranSales:quantity>`
            );
          } else {
            updatedBody = `${updatedBody}<tranSales:quantity>0</tranSales:quantity>`;
          }
        }

        return `<tranSales:item>${updatedBody}</tranSales:item>`;
      }
    );

    return { recordXml, receivableLineCount };
  }

  private parseFulfillmentLineSelections(fulfillmentData: Record<string, unknown>): Array<{
    orderLine?: string;
    itemId?: string;
    itemName?: string;
    sku?: string;
    quantity: number;
  }> {
    const lines = Array.isArray(fulfillmentData.lines) ? fulfillmentData.lines : [];
    const parsed: Array<{
      orderLine?: string;
      itemId?: string;
      itemName?: string;
      sku?: string;
      quantity: number;
    }> = [];

    for (const line of lines as unknown[]) {
      if (!line || typeof line !== 'object') continue;

      const candidate = line as Record<string, unknown>;
      const quantity = Number(candidate.quantity ?? 0);
      const orderLine =
        candidate.orderLine != null && candidate.orderLine !== ''
          ? String(candidate.orderLine)
          : undefined;
      const itemId =
        candidate.itemId != null && candidate.itemId !== '' ? String(candidate.itemId) : undefined;
      const sku = candidate.sku != null && candidate.sku !== '' ? String(candidate.sku) : undefined;
      const itemName =
        candidate.itemName != null && candidate.itemName !== ''
          ? String(candidate.itemName)
          : undefined;

      if ((!orderLine && !itemId && !itemName && !sku) || !Number.isFinite(quantity)) {
        continue;
      }

      parsed.push({ orderLine, itemId, itemName, sku, quantity });
    }

    return parsed;
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
