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
    Postcode: string;
    Country: string;
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
  TransitDays?: number;
  Description?: string;
}

/**
 * NZC Rate Response
 */
export interface NZCRateResponse {
  Quotes: NZCQuote[];
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

class NZCService {
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
   */
  private addressToNZCDestination(address: any): NZCDestination {
    return {
      Name: address.company || address.name || 'Customer',
      NameDisplay: address.company
        ? `${address.company} - ${address.city}`
        : `${address.name} - ${address.city}`,
      Address: {
        StreetAddress: address.addressLine1,
        Suburb: address.city,
        Postcode: address.postalCode,
        Country: address.country === 'NZ' ? 'NEW ZEALAND' : address.country,
        State: address.state || '',
      },
      ContactPerson: address.name,
      PhoneNumber: address.phone || '',
      Email: address.email || '',
    };
  }

  /**
   * Convert weight from lbs to kg (NZC uses kg)
   */
  private lbsToKg(lbs: number): number {
    return Math.round(lbs * 0.453592 * 100) / 100;
  }

  /**
   * Convert dimensions from inches to cm (NZC uses cm)
   */
  private inchesToCm(inches: number): number {
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

      const data = (await response.json()) as NZCRateResponse;

      // Log validation errors if any
      if (data.ValidationErrors && Object.keys(data.ValidationErrors).length > 0) {
        logger.warn('[NZC] Rate validation errors', data.ValidationErrors);
      }

      // Log rejected quotes if any
      if (data.Rejected && data.Rejected.length > 0) {
        logger.warn('[NZC] Rejected quotes', data.Rejected);
      }

      logger.info('[NZC] Rates fetched successfully', {
        quoteCount: data.Quotes.length,
        rejectedCount: data.Rejected.length,
      });

      return data;
    } catch (error) {
      logger.error('[NZC] Error fetching rates', error);
      throw error;
    }
  }

  /**
   * Create a shipment with NZC
   */
  async createShipment(
    destination: NZCDestination,
    packages: NZCPackage[],
    quoteId: string
  ): Promise<NZCShipmentResponse> {
    try {
      const requestBody: NZCShipmentRequest = {
        Destination: destination,
        Packages: packages,
        QuoteId: quoteId,
      };

      logger.info('[NZC] Creating shipment', {
        destination: destination.Name,
        quoteId,
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

      const data = (await response.json()) as NZCShipmentResponse;

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
