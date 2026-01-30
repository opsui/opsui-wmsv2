/**
 * Reports Service
 *
 * Business logic for generating reports, executing queries,
 * and formatting data for export.
 */

import { reportsRepository } from '../repositories/ReportsRepository';
import { getPool } from '../db/client';
import {
  Report,
  ReportExecution,
  ReportType,
  ReportStatus,
  ReportFormat,
  AggregationType,
  ExportJob,
} from '@opsui/shared';

// ============================================================================
// SERVICE
// ============================================================================

export class ReportsService {
  /**
   * Execute a report and return the results
   */
  async executeReport(
    reportId: string,
    format: ReportFormat,
    parameters: Record<string, any>,
    executedBy: string
  ): Promise<{ execution: ReportExecution; data: any[] }> {
    const report = await reportsRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const startTime = Date.now();

    // Create execution record
    const execution: Omit<ReportExecution, 'executionId'> = {
      reportId,
      executedAt: new Date(),
      executedBy,
      status: ReportStatus.RUNNING,
      format,
      parameters,
      executionTimeMs: 0,
    };

    try {
      // Build and execute the query
      const query = this.buildReportQuery(report, parameters);
      const poolClient = getPool();
      const result = await poolClient.query(query.sql, query.params);

      // Process and format results
      const data = this.processResults(result.rows, report, parameters);

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Update execution record
      const completedExecution = await reportsRepository.createExecution({
        ...execution,
        status: ReportStatus.COMPLETED,
        rowCount: result.rowCount,
        executionTimeMs,
        fileUrl: this.generateFileUrl(reportId, format),
      });

      return { execution: completedExecution, data };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      // Log failed execution
      await reportsRepository.createExecution({
        ...execution,
        status: ReportStatus.FAILED,
        executionTimeMs,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Build SQL query from report definition
   */
  private buildReportQuery(
    report: Report,
    parameters: Record<string, any>
  ): { sql: string; params: any[] } {
    const { fields, filters, groups } = report;

    // Build SELECT clause
    const selectFields = fields.map((field: any) => {
      if (field.aggregation) {
        return `${field.aggregation}(${field.field}) as ${field.name}`;
      }
      return `${field.field} as ${field.name}`;
    });

    let sql = `SELECT ${selectFields.join(', ')} FROM ${this.getDataSource(report.reportType)}`;

    // Build WHERE clause from filters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const clause = this.applyFilter(filter, parameters, paramIndex);
        if (clause) {
          whereClauses.push(clause.sql);
          queryParams.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Build GROUP BY clause
    if (groups && groups.length > 0) {
      const groupFields = groups.map((g: any) => g.field);
      sql += ` GROUP BY ${groupFields.join(', ')}`;
    }

    // Build ORDER BY clause
    if (groups && groups.length > 0) {
      const orderFields = groups
        .filter((g: any) => g.sortDirection)
        .map((g: any) => `${g.field} ${g.sortDirection}`);
      sql += ` ORDER BY ${orderFields.join(', ')}`;
    }

    return { sql, params: queryParams };
  }

  /**
   * Get data source table for report type
   */
  private getDataSource(reportType: ReportType): string {
    const sources: Record<ReportType, string> = {
      [ReportType.INVENTORY]: 'inventory',
      [ReportType.ORDERS]: 'orders',
      [ReportType.SHIPPING]: 'shipments',
      [ReportType.RECEIVING]: 'inbound_shipments',
      [ReportType.PICKING_PERFORMANCE]: 'pick_tasks',
      [ReportType.PACKING_PERFORMANCE]: 'packing_tasks',
      [ReportType.CYCLE_COUNTS]: 'cycle_counts',
      [ReportType.LOCATION_UTILIZATION]: 'locations',
      [ReportType.USER_PERFORMANCE]: 'users',
      [ReportType.CUSTOM]: 'custom_data',
    };

    return sources[reportType] || 'data';
  }

  /**
   * Apply filter to query
   */
  private applyFilter(
    filter: any,
    parameters: Record<string, any>,
    startIndex: number
  ): { sql: string; params: any[] } | null {
    const paramValue = parameters[filter.field];

    if (paramValue === undefined || paramValue === null) {
      return null;
    }

    const params: any[] = [];

    switch (filter.operator) {
      case 'equals':
        params.push(paramValue);
        return { sql: `${filter.field} = $${startIndex++}`, params };

      case 'not_equals':
        params.push(paramValue);
        return { sql: `${filter.field} != $${startIndex++}`, params };

      case 'contains':
        params.push(`%${paramValue}%`);
        return { sql: `${filter.field} LIKE $${startIndex++}`, params };

      case 'greater_than':
        params.push(paramValue);
        return { sql: `${filter.field} > $${startIndex++}`, params };

      case 'less_than':
        params.push(paramValue);
        return { sql: `${filter.field} < $${startIndex++}`, params };

      case 'between':
        params.push(paramValue[0], paramValue[1]);
        return { sql: `${filter.field} BETWEEN $${startIndex++} AND $${startIndex++}`, params };

      case 'in':
        params.push(paramValue);
        return { sql: `${filter.field} = ANY($${startIndex++})`, params };

      default:
        return null;
    }
  }

  /**
   * Process query results
   */
  private processResults(rows: any[], report: Report, _parameters: Record<string, any>): any[] {
    return rows.map((row, index) => {
      const processed: any = {};

      report.fields.forEach((field: any) => {
        processed[field.name] = row[field.name];
      });

      // Add row number for exports
      processed._rowNumber = index + 1;

      return processed;
    });
  }

  /**
   * Generate file URL for report output
   */
  private generateFileUrl(reportId: string, format: ReportFormat): string {
    const timestamp = new Date().getTime();
    return `/reports/${reportId}/${timestamp}.${format.toLowerCase()}`;
  }

  /**
   * Create an export job
   */
  async createExportJob(
    entityType: string,
    format: ReportFormat,
    fields: string[],
    filters: any[],
    createdBy: string
  ): Promise<ExportJob> {
    const job = await reportsRepository.createExportJob({
      name: `${entityType} Export`,
      entityType,
      format,
      filters,
      fields,
      status: ReportStatus.DRAFT,
      createdBy,
    });

    // Start async export (in production, this would be a background job)
    this.processExportJob(job.jobId).catch(console.error);

    return job;
  }

  /**
   * Process export job (async)
   */
  private async processExportJob(jobId: string): Promise<void> {
    try {
      // Get the export job details
      const job = await reportsRepository.getExportJob(jobId);
      if (!job) {
        throw new Error(`Export job ${jobId} not found`);
      }

      // Update status to PROCESSING
      await reportsRepository.updateExportJob(jobId, {
        status: ReportStatus.RUNNING,
      });

      // Fetch data based on entity type
      const data = await this.fetchExportData(job);

      if (!data || data.length === 0) {
        await reportsRepository.updateExportJob(jobId, {
          status: ReportStatus.COMPLETED,
          fileUrl: undefined, // No file generated for empty data
          completedAt: new Date(),
        });
        return;
      }

      // Generate export file based on format
      const fileUrl = await this.generateExportFile(data, job);

      // Update job as completed
      await reportsRepository.updateExportJob(jobId, {
        status: ReportStatus.COMPLETED,
        fileUrl,
        completedAt: new Date(),
        recordCount: data.length,
      });

      console.log(`Export job ${jobId} completed successfully with ${data.length} records`);
    } catch (error: any) {
      // Update job as failed
      await reportsRepository.updateExportJob(jobId, {
        status: ReportStatus.FAILED,
        completedAt: new Date(),
        errorMessage: error.message,
      });
      console.error(`Export job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Fetch data for export based on entity type
   */
  private async fetchExportData(job: ExportJob): Promise<any[]> {
    const { entityType, fields, filters } = job;
    const poolClient = getPool();

    let sql = '';
    let params: any[] = [];

    // Build SELECT clause from fields
    const selectFields = fields && fields.length > 0 ? fields.join(', ') : '*';

    // Determine table based on entity type
    const tableMap: Record<string, string> = {
      orders: 'orders o LEFT JOIN users u ON o.picker_id = u.user_id',
      inventory: 'inventory',
      users: 'users',
      exceptions: 'order_exceptions',
      cycle_counts: 'cycle_counts',
      pick_tasks: 'pick_tasks',
    };

    const tableName = tableMap[entityType] || entityType;

    sql = `SELECT ${selectFields} FROM ${tableName}`;

    // Build WHERE clause from filters
    if (filters && filters.length > 0) {
      const whereClauses: string[] = [];
      let paramIndex = 1;

      for (const filter of filters) {
        if (filter.field && filter.operator && filter.value !== undefined) {
          const clause = this.applyFilter(filter, {}, paramIndex);
          if (clause) {
            whereClauses.push(clause.sql);
            params.push(...clause.params);
            paramIndex += clause.params.length;
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    // Add order by
    if (entityType === 'orders') {
      sql += ' ORDER BY o.created_at DESC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    const result = await poolClient.query(sql, params);
    return result.rows;
  }

  /**
   * Generate export file based on format
   */
  private async generateExportFile(data: any[], job: ExportJob): Promise<string> {
    const { jobId, entityType, format } = job;
    const fs = require('fs').promises;
    const path = require('path');

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${entityType}_export_${jobId}_${timestamp}.${format.toLowerCase()}`;
    const filePath = path.join(exportsDir, filename);
    const relativeUrl = `/exports/${filename}`;

    if (format === 'CSV') {
      await this.generateCSV(data, filePath);
    } else if (format === 'EXCEL') {
      await this.generateExcel(data, filePath);
    } else if (format === 'PDF') {
      await this.generatePDF(data, filePath, entityType);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    return relativeUrl;
  }

  /**
   * Generate CSV file
   */
  private async generateCSV(data: any[], filePath: string): Promise<void> {
    const fs = require('fs').promises;

    if (data.length === 0) {
      await fs.writeFile(filePath, '');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header];
            // Handle values that contain commas or quotes
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (
              stringValue.includes(',') ||
              stringValue.includes('"') ||
              stringValue.includes('\n')
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(',')
      ),
    ];

    await fs.writeFile(filePath, csvRows.join('\n'));
  }

  /**
   * Generate Excel file
   */
  private async generateExcel(data: any[], filePath: string): Promise<void> {
    // For now, use CSV as a simple implementation
    // In production, you would use a library like 'exceljs'
    await this.generateCSV(data, filePath.replace('.xlsx', '.csv'));
  }

  /**
   * Generate PDF file
   */
  private async generatePDF(data: any[], filePath: string, _entityType: string): Promise<void> {
    // For now, use CSV as a simple implementation
    // In production, you would use a library like 'pdfkit'
    await this.generateCSV(data, filePath.replace('.pdf', '.csv'));
  }
}

export const reportsService = new ReportsService();
