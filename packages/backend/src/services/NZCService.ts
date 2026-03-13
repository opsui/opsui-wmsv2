/**
 * NZC (NZ Couriers) API Service
 *
 * Handles integration with the NZC Sweetspot API for shipping rates,
 * shipment creation, and label generation.
 *
 * API Documentation: https://api.gosweetspot.com
 */

import { logger } from '../config/logger';
import config from '../config';

// ============================================================================
// TYPES
// ============================================================================

/**
 * NZC Destination Address
 */
export interface NZCDestination {
  Name: string;
  NameDisplay?: string;
  Address: {
    StreetAddress: string;
    Suburb: string;
    City?: string;
    PostCode: string;
    CountryCode: string;
    State?: string;
  };
  ContactPerson?: string;
  PhoneNumber?: string;
  Email?: string;
}

/**
 * NZC Package dimensions
 */
export interface NZCPackage {
  PackageStockId?: number;
  Name?: string;
  Type?: string;
  Length: number; // cm
  Width: number; // cm
  Height: number; // cm
  Kg: number; // weight in kg
  Units: number; // quantity of this package type
}

/**
 * NZC Rate Request
 */
export interface NZCRateRequest {
  Destination: NZCDestination;
  Packages: NZCPackage[];
  Origin?: {
    Name: string;
    Address: {
      StreetAddress: string;
      Suburb: string;
      Postcode: string;
      Country: string;
    };
  };
}

/**
 * NZC Quote response
 */
export interface NZCQuote {
  QuoteId: string;
  Carrier: string;
  Service: string;
  TotalPrice: number;
  DeliveryType?: string;
  CarrierServiceType?: string;
  IsResidentialDelivery?: boolean;
  IsRuralDelivery?: boolean;
  IsSaturdayDelivery?: boolean;
  TransitDays?: number;
  Description?: string;
}

/**
 * NZC Rate Response
 */
export interface NZCRateResponse {
  Quotes: NZCQuote[];
  Available?: NZCQuote[];
  Suppressed: any[];
  Rejected: Array<{
    Carrier: string;
    Reason: string;
  }>;
  ValidationErrors: Record<string, string>;
}

/**
 * NZC Shipment Request (same as rate request + QuoteId)
 */
export interface NZCShipmentRequest extends NZCRateRequest {
  QuoteId: string;
  DeliveryReference?: string;
  PrintToPrinter?: boolean;
}

/**
 * NZC Shipment Response
 */
export interface NZCShipmentResponse {
  ConsignmentNo: string;
  ConsignmentId: string;
  Packages: Array<{
    ConsignmentNo: string;
    ConsignmentId: string;
  }>;
  Errors?: Array<{
    Message?: string;
    Property?: string;
  }>;
}

/**
 * NZC Label Format options
 */
export enum NZCLabelFormat {
  PNG_100X175 = 'LABEL_PNG_100X175',
  PNG_100X150 = 'LABEL_PNG_100X150',
  PDF_100X175 = 'LABEL_PDF_100X175',
  PDF = 'LABEL_PDF',
}

// ============================================================================
// NZC SERVICE
// ============================================================================

export class NZCService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly supportEmail: string;

  constructor() {
    this.baseUrl = config.nzc?.baseUrl || 'https://api.gosweetspot.com';
    this.apiKey = config.nzc?.apiKey || '';
    this.siteId = config.nzc?.siteId || '';
    this.supportEmail = config.nzc?.supportEmail || '';

    if (!this.apiKey || !this.siteId) {
      logger.warn('NZC API credentials not configured. NZC integration will not work.');
    }
  }

  /**
   * Get request headers for NZC API
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      access_key: this.apiKey,
      site_id: this.siteId,
      supportemail: this.supportEmail,
    };
  }

  /**
   * Convert WMS Address to NZC Destination format
   * Note: Unused private method kept for API completeness
   */
  // @ts-ignore - Unused private method kept for API completeness
  private _addressToNZCDestination(address: any): NZCDestination {
    const countryCode = this._toNzcCountryCode(address.country);

    return {
      Name: address.company || address.name || 'Customer',
      NameDisplay: address.company
        ? `${address.company} - ${address.city}`
        : `${address.name} - ${address.city}`,
      Address: {
        StreetAddress: address.addressLine1,
        Suburb: address.city,
        City: address.city,
        PostCode: address.postalCode,
        CountryCode: countryCode,
        State: address.state || '',
      },
      ContactPerson: address.name,
      PhoneNumber: address.phone || '',
      Email: address.email || '',
    };
  }

  private _toNzcCountryCode(country?: string): string {
    if (!country) return 'NZ';
    const normalized = String(country).trim().toUpperCase();
    if (normalized === '_NEWZEALAND') return 'NZ';
    if (normalized === '_AUSTRALIA') return 'AU';
    if (normalized === 'NEW ZEALAND') return 'NZ';
    if (normalized === 'AUSTRALIA') return 'AU';
    if (normalized.length === 2) return normalized;
    return normalized;
  }

  /**
   * Convert weight from lbs to kg (NZC uses kg)
   * Note: Unused private method kept for API completeness
   */
  // @ts-ignore - Unused private method kept for API completeness
  private _lbsToKg(lbs: number): number {
    return Math.round(lbs * 0.453592 * 100) / 100;
  }

  /**
   * Convert dimensions from inches to cm (NZC uses cm)
   * Note: Unused private method kept for API completeness
   */
  // @ts-ignore - Unused private method kept for API completeness
  private _inchesToCm(inches: number): number {
    return Math.round(inches * 2.54 * 10) / 10;
  }

  /**
   * Get shipping rates from NZC
   */
  async getRates(destination: NZCDestination, packages: NZCPackage[]): Promise<NZCRateResponse> {
    try {
      const requestBody: NZCRateRequest = {
        Destination: destination,
        Packages: packages,
      };

      logger.info('[NZC] Fetching rates', {
        destination: destination.Name,
        packageCount: packages.length,
      });

      const response = await fetch(`${this.baseUrl}/api/rates`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[NZC] Rate request failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`NZC API error: ${response.status} ${response.statusText}`);
      }

      const rawData = (await response.json()) as unknown;
      const rawObject =
        rawData && typeof rawData === 'object' ? (rawData as Partial<NZCRateResponse>) : {};
      const availableRates = Array.isArray((rawObject as { Available?: unknown[] }).Available)
        ? (((rawObject as { Available?: unknown[] }).Available ?? []) as unknown[]).map(rate =>
            this._normalizeAvailableRate(rate)
          )
        : [];
      const quoteRates = Array.isArray(rawObject.Quotes)
        ? (rawObject.Quotes as unknown[]).map(rate => this._normalizeAvailableRate(rate))
        : [];
      const normalizedQuotes = quoteRates.length > 0 ? quoteRates : availableRates;
      const data: NZCRateResponse = {
        Quotes: normalizedQuotes,
        Available: availableRates,
        Suppressed: Array.isArray(rawObject.Suppressed) ? rawObject.Suppressed : [],
        Rejected: Array.isArray(rawObject.Rejected) ? rawObject.Rejected : [],
        ValidationErrors:
          rawObject.ValidationErrors && typeof rawObject.ValidationErrors === 'object'
            ? rawObject.ValidationErrors
            : {},
      };
      const quoteCount = Array.isArray(data.Quotes) ? data.Quotes.length : 0;
      const rejectedCount = Array.isArray(data.Rejected) ? data.Rejected.length : 0;
      const suppressedCount = Array.isArray(data.Suppressed) ? data.Suppressed.length : 0;
      const validationErrorCount =
        data.ValidationErrors && typeof data.ValidationErrors === 'object'
          ? Object.keys(data.ValidationErrors).length
          : 0;

      // Log validation errors if any
      if (validationErrorCount > 0) {
        logger.warn('[NZC] Rate validation errors', data.ValidationErrors);
      }

      // Log rejected quotes if any
      if (rejectedCount > 0) {
        logger.warn('[NZC] Rejected quotes', data.Rejected);
      }

      logger.info('[NZC] Rates fetched successfully', {
        quoteCount,
        availableCount: availableRates.length,
        rejectedCount,
        suppressedCount,
        validationErrorCount,
      });

      return data;
    } catch (error) {
      logger.error('[NZC] Error fetching rates', error);
      throw error;
    }
  }

  private _normalizeAvailableRate(rate: unknown): NZCQuote {
    const raw = rate && typeof rate === 'object' ? (rate as Record<string, unknown>) : {};
    const quoteId =
      this._stringOrEmpty(raw.QuoteId) ||
      this._stringOrEmpty(raw.quoteId) ||
      this._stringOrEmpty(raw.id);
    const carrier =
      this._stringOrEmpty(raw.Carrier) ||
      this._stringOrEmpty(raw.CarrierName) ||
      this._stringOrEmpty(raw.carriername) ||
      this._stringOrEmpty(raw.carrier) ||
      'NZC';
    const deliveryType =
      this._stringOrEmpty(raw.Service) ||
      this._stringOrEmpty(raw.DeliveryType) ||
      this._stringOrEmpty(raw.deliverytype) ||
      this._stringOrEmpty(raw.CarrierServiceType) ||
      this._stringOrEmpty(raw.carrierservicetype);
    const carrierServiceType =
      this._stringOrEmpty(raw.CarrierServiceType) ||
      this._stringOrEmpty(raw.carrierservicetype) ||
      undefined;
    const serviceStandard =
      this._stringOrEmpty(raw.ServiceStandard) ||
      this._stringOrEmpty(raw.servicestandard) ||
      this._stringOrEmpty(raw.Description);
    const totalPrice = this._numberOrZero(
      raw.TotalPrice ?? raw.Charge ?? raw.Cost ?? raw.charge ?? raw.cost
    );
    const transitDays = this._numberOrUndefined(
      raw.TransitDays ?? raw.Transitdays ?? raw.transitdays
    );
    const description =
      this._stringOrEmpty(raw.Comments) || this._stringOrEmpty(raw.comments) || serviceStandard;

    return {
      QuoteId: quoteId,
      Carrier: carrier,
      Service: [carrier, deliveryType].filter(Boolean).join(' - ') || serviceStandard || carrier,
      TotalPrice: totalPrice,
      DeliveryType: deliveryType || undefined,
      CarrierServiceType: carrierServiceType,
      IsResidentialDelivery: this._booleanOrUndefined(
        raw.IsResidentialDelivery ?? raw.isResidentialDelivery
      ),
      IsRuralDelivery: this._booleanOrUndefined(raw.IsRuralDelivery ?? raw.isRuralDelivery),
      IsSaturdayDelivery: this._booleanOrUndefined(
        raw.IsSaturdayDelivery ?? raw.isSaturdayDelivery
      ),
      TransitDays: transitDays,
      Description: description || undefined,
    };
  }

  private _stringOrEmpty(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private _numberOrZero(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private _numberOrUndefined(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private _booleanOrUndefined(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    return undefined;
  }

  /**
   * Create a shipment with NZC
   */
  async createShipment(
    destination: NZCDestination,
    packages: NZCPackage[],
    quoteId: string,
    senderReference?: string,
    printToPrinter: boolean = true
  ): Promise<NZCShipmentResponse> {
    try {
      const requestBody: NZCShipmentRequest = {
        Destination: destination,
        Packages: packages,
        QuoteId: quoteId,
        DeliveryReference: senderReference || undefined,
        PrintToPrinter: printToPrinter,
      };

      logger.info('[NZC] Creating shipment', {
        destination: destination.Name,
        quoteId,
        senderReference,
        printToPrinter,
        packageCount: packages.length,
      });

      const response = await fetch(`${this.baseUrl}/api/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[NZC] Shipment creation failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`NZC API error: ${response.status} ${response.statusText}`);
      }

      const rawData = (await response.json()) as unknown;
      const data = this._normalizeShipmentResponse(rawData);

      if (data.Errors && data.Errors.length > 0) {
        logger.error('[NZC] Shipment creation returned errors', {
          errors: data.Errors,
        });
        throw new Error(
          data.Errors.map(error => error.Message || error.Property || 'NZC shipment error')
            .filter(Boolean)
            .join(', ')
        );
      }

      if (!data.ConsignmentNo) {
        logger.error('[NZC] Shipment creation returned no consignment number', {
          response: rawData,
        });
        throw new Error('NZC shipment creation did not return a consignment number');
      }

      logger.info('[NZC] Shipment created successfully', {
        consignmentNo: data.ConsignmentNo,
        consignmentId: data.ConsignmentId,
      });

      return data;
    } catch (error) {
      logger.error('[NZC] Error creating shipment', error);
      throw error;
    }
  }

  /**
   * Get shipping label as base64 data
   */
  async getLabel(
    connote: string,
    format: NZCLabelFormat = NZCLabelFormat.PNG_100X175
  ): Promise<{ data: string; contentType: string; format: string }> {
    try {
      logger.info('[NZC] Fetching label', { connote, format });

      const response = await fetch(
        `${this.baseUrl}/api/labels?format=${format}&connote=${encodeURIComponent(connote)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[NZC] Label fetch failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`NZC API error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      logger.info('[NZC] Label fetched successfully', {
        connote,
        contentType,
        size: buffer.byteLength,
      });

      return {
        data: base64,
        contentType,
        format,
      };
    } catch (error) {
      logger.error('[NZC] Error fetching label', error);
      throw error;
    }
  }

  private _normalizeShipmentResponse(rawData: unknown): NZCShipmentResponse {
    const raw = rawData && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {};
    const consignments = Array.isArray(raw.Consignments)
      ? (raw.Consignments as Array<Record<string, unknown>>)
      : [];
    const firstConsignment = consignments[0] || {};
    const errors = Array.isArray(raw.Errors)
      ? (raw.Errors as Array<Record<string, unknown>>).map(error => ({
          Message: this._stringOrEmpty(error.Message),
          Property: this._stringOrEmpty(error.Property),
        }))
      : [];

    return {
      ConsignmentNo:
        this._stringOrEmpty(raw.ConsignmentNo) ||
        this._stringOrEmpty(firstConsignment.ConsignmentNo) ||
        this._stringOrEmpty(firstConsignment.ConsignmentNumber),
      ConsignmentId:
        this._stringOrEmpty(raw.ConsignmentId) ||
        this._stringOrEmpty(firstConsignment.ConsignmentId) ||
        this._stringOrEmpty(firstConsignment.Id),
      Packages: consignments.map(consignment => ({
        ConsignmentNo:
          this._stringOrEmpty(consignment.ConsignmentNo) ||
          this._stringOrEmpty(consignment.ConsignmentNumber),
        ConsignmentId:
          this._stringOrEmpty(consignment.ConsignmentId) ||
          this._stringOrEmpty(consignment.Id),
      })),
      Errors: errors,
    };
  }

  /**
   * Requeue shipment for printing (simpler print method)
   */
  async reprintLabel(connote: string, copies: number = 1, printerName?: string): Promise<void> {
    try {
      logger.info('[NZC] Reprinting label', { connote, copies, printerName });

      const requestBody = printerName ? { copies, printtoprinter: printerName } : { copies };

      const response = await fetch(
        `${this.baseUrl}/api/labels?connote=${encodeURIComponent(connote)}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[NZC] Label reprint failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`NZC API error: ${response.status} ${response.statusText}`);
      }

      logger.info('[NZC] Label reprinted successfully', { connote, copies });
    } catch (error) {
      logger.error('[NZC] Error reprinting label', error);
      throw error;
    }
  }

  /**
   * Get available printers from NZC
   */
  async getPrinters(): Promise<any[]> {
    try {
      logger.info('[NZC] Fetching available printers');

      const response = await fetch(`${this.baseUrl}/api/printers`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[NZC] Printers fetch failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`NZC API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any[];
      logger.info('[NZC] Printers fetched successfully', { count: data.length });
      return data;
    } catch (error) {
      logger.error('[NZC] Error fetching printers', error);
      throw error;
    }
  }

  /**
   * Get available stock sizes from NZC
   */
  async getStockSizes(): Promise<any[]> {
    try {
      logger.info('[NZC] Fetching stock sizes');

      const response = await fetch(`${this.baseUrl}/api/stocksizes`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[NZC] Stock sizes fetch failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`NZC API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any[];
      logger.info('[NZC] Stock sizes fetched successfully', { count: data.length });
      return data;
    } catch (error) {
      logger.error('[NZC] Error fetching stock sizes', error);
      throw error;
    }
  }
}

// Export singleton instance
export const nzcService = new NZCService();
