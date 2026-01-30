/**
 * Reports Repository
 *
 * Handles database operations for reports, executions,
 * schedules, and dashboards.
 */

import { getPool } from '../db/client';

const pool = getPool();
import {
  Report,
  ReportExecution,
  ReportSchedule,
  Dashboard,
  ReportTemplate,
  ExportJob,
  ReportType,
  ReportStatus,
  ReportFormat,
} from '@opsui/shared';

// ============================================================================
// REPORTS
// ============================================================================

export class ReportsRepository {
  /**
   * Get all reports with optional filtering
   */
  async findAll(filters?: {
    reportType?: ReportType;
    status?: ReportStatus;
    isPublic?: boolean;
    createdBy?: string;
    includeAll?: boolean;
  }): Promise<Report[]> {
    let query = `
      SELECT
        report_id,
        name,
        description,
        report_type,
        status,
        created_by,
        created_at,
        updated_by,
        updated_at,
        fields,
        filters,
        groups,
        chart_config,
        default_format,
        allow_export,
        allow_schedule,
        is_public,
        tags,
        category
      FROM reports
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.reportType) {
      query += ` AND report_type = $${paramIndex++}`;
      params.push(filters.reportType);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.isPublic !== undefined) {
      query += ` AND is_public = $${paramIndex++}`;
      params.push(filters.isPublic);
    }

    if (filters?.createdBy) {
      query += ` AND created_by = $${paramIndex++}`;
      params.push(filters.createdBy);
    }

    if (!filters?.includeAll) {
      query += ` AND status != 'ARCHIVED'`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      reportId: row.report_id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      fields: JSON.parse(row.fields || '[]'),
      filters: JSON.parse(row.filters || '[]'),
      groups: JSON.parse(row.groups || '[]'),
      chartConfig: JSON.parse(row.chart_config || '{"enabled": false}'),
      defaultFormat: row.default_format,
      allowExport: row.allow_export,
      allowSchedule: row.allow_schedule,
      isPublic: row.is_public,
      tags: row.tags || [],
      category: row.category,
    }));
  }

  /**
   * Find a report by ID
   */
  async findById(reportId: string): Promise<Report | null> {
    const query = `
      SELECT
        report_id, name, description, report_type, status,
        created_by, created_at, updated_by, updated_at,
        fields, filters, groups, chart_config, default_format,
        allow_export, allow_schedule, is_public, tags, category
      FROM reports
      WHERE report_id = $1
    `;

    const result = await pool.query(query, [reportId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      reportId: row.report_id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      fields: JSON.parse(row.fields || '[]'),
      filters: JSON.parse(row.filters || '[]'),
      groups: JSON.parse(row.groups || '[]'),
      chartConfig: JSON.parse(row.chart_config || '{"enabled": false}'),
      defaultFormat: row.default_format,
      allowExport: row.allow_export,
      allowSchedule: row.allow_schedule,
      isPublic: row.is_public,
      tags: row.tags || [],
      category: row.category,
    };
  }

  /**
   * Create a new report
   */
  async create(report: Omit<Report, 'reportId' | 'createdAt'>): Promise<Report> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const reportId = `REPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const query = `
        INSERT INTO reports (
          report_id, name, description, report_type, status,
          created_by, created_at, fields, filters, groups,
          chart_config, default_format, allow_export, allow_schedule,
          is_public, tags, category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const result = await client.query(query, [
        reportId,
        report.name,
        report.description || null,
        report.reportType,
        report.status || ReportStatus.DRAFT,
        report.createdBy,
        now,
        JSON.stringify(report.fields),
        JSON.stringify(report.filters),
        JSON.stringify(report.groups),
        JSON.stringify(report.chartConfig),
        report.defaultFormat,
        report.allowExport,
        report.allowSchedule,
        report.isPublic,
        report.tags || [],
        report.category || null,
      ]);

      await client.query('COMMIT');

      return this.findById(reportId) as Promise<Report>;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing report
   */
  async update(reportId: string, updates: Partial<Report>): Promise<Report | null> {
    const existing = await this.findById(reportId);
    if (!existing) return null;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.fields !== undefined) {
        setClauses.push(`fields = $${paramIndex++}`);
        values.push(JSON.stringify(updates.fields));
      }
      if (updates.filters !== undefined) {
        setClauses.push(`filters = $${paramIndex++}`);
        values.push(JSON.stringify(updates.filters));
      }
      if (updates.groups !== undefined) {
        setClauses.push(`groups = $${paramIndex++}`);
        values.push(JSON.stringify(updates.groups));
      }
      if (updates.chartConfig !== undefined) {
        setClauses.push(`chart_config = $${paramIndex++}`);
        values.push(JSON.stringify(updates.chartConfig));
      }
      if (updates.defaultFormat !== undefined) {
        setClauses.push(`default_format = $${paramIndex++}`);
        values.push(updates.defaultFormat);
      }
      if (updates.allowExport !== undefined) {
        setClauses.push(`allow_export = $${paramIndex++}`);
        values.push(updates.allowExport);
      }
      if (updates.allowSchedule !== undefined) {
        setClauses.push(`allow_schedule = $${paramIndex++}`);
        values.push(updates.allowSchedule);
      }
      if (updates.isPublic !== undefined) {
        setClauses.push(`is_public = $${paramIndex++}`);
        values.push(updates.isPublic);
      }
      if (updates.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        values.push(updates.tags);
      }
      if (updates.category !== undefined) {
        setClauses.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }
      if (updates.updatedBy !== undefined) {
        setClauses.push(`updated_by = $${paramIndex++}`);
        values.push(updates.updatedBy);
      }

      setClauses.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(reportId);

      if (setClauses.length > 0) {
        const query = `
          UPDATE reports
          SET ${setClauses.join(', ')}
          WHERE report_id = $${paramIndex}
        `;
        await client.query(query, values);
      }

      await client.query('COMMIT');

      return this.findById(reportId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a report
   */
  async delete(reportId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM reports WHERE report_id = $1', [reportId]);
    return (result.rowCount ?? 0) > 0;
  }

  // =========================================================================
  // REPORT EXECUTIONS
  // =========================================================================

  /**
   * Create a report execution
   */
  async createExecution(execution: Omit<ReportExecution, 'executionId'>): Promise<ReportExecution> {
    const executionId = `EXEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO report_executions (
        execution_id, report_id, executed_at, executed_by,
        status, format, parameters, file_url, file_size_bytes,
        row_count, execution_time_ms, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await pool.query(query, [
      executionId,
      execution.reportId,
      execution.executedAt,
      execution.executedBy,
      execution.status,
      execution.format,
      JSON.stringify(execution.parameters),
      execution.fileUrl || null,
      execution.fileSizeBytes || null,
      execution.rowCount || null,
      execution.executionTimeMs,
      execution.errorMessage || null,
    ]);

    const row = result.rows[0];
    return {
      executionId: row.execution_id,
      reportId: row.report_id,
      executedAt: row.executed_at,
      executedBy: row.executed_by,
      status: row.status,
      format: row.format,
      parameters: JSON.parse(row.parameters || '{}'),
      fileUrl: row.file_url,
      fileSizeBytes: row.file_size_bytes,
      rowCount: row.row_count,
      executionTimeMs: row.execution_time_ms,
      errorMessage: row.error_message,
    };
  }

  /**
   * Get execution history for a report
   */
  async findExecutionsByReportId(reportId: string, limit = 50): Promise<ReportExecution[]> {
    const query = `
      SELECT
        execution_id, report_id, executed_at, executed_by,
        status, format, parameters, file_url, file_size_bytes,
        row_count, execution_time_ms, error_message
      FROM report_executions
      WHERE report_id = $1
      ORDER BY executed_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [reportId, limit]);

    return result.rows.map((row: any) => ({
      executionId: row.execution_id,
      reportId: row.report_id,
      executedAt: row.executed_at,
      executedBy: row.executed_by,
      status: row.status,
      format: row.format,
      parameters: JSON.parse(row.parameters || '{}'),
      fileUrl: row.file_url,
      fileSizeBytes: row.file_size_bytes,
      rowCount: row.row_count,
      executionTimeMs: row.execution_time_ms,
      errorMessage: row.error_message,
    }));
  }

  // =========================================================================
  // DASHBOARDS
  // =========================================================================

  /**
   * Get all dashboards
   */
  async findDashboards(filters?: { owner?: string; isPublic?: boolean }): Promise<Dashboard[]> {
    let query = `
      SELECT
        dashboard_id, name, description, layout, widgets,
        owner, is_public, created_by, created_at, updated_by, updated_at
      FROM dashboards
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.owner) {
      query += ` AND owner = $${paramIndex++}`;
      params.push(filters.owner);
    }

    if (filters?.isPublic !== undefined) {
      query += ` AND is_public = $${paramIndex++}`;
      params.push(filters.isPublic);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      dashboardId: row.dashboard_id,
      name: row.name,
      description: row.description,
      layout: JSON.parse(row.layout || '{"columns": 3, "rows": 3}'),
      widgets: JSON.parse(row.widgets || '[]'),
      owner: row.owner,
      isPublic: row.is_public,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Find a dashboard by ID
   */
  async findDashboardById(dashboardId: string): Promise<Dashboard | null> {
    const query = `
      SELECT
        dashboard_id, name, description, layout, widgets,
        owner, is_public, created_by, created_at, updated_by, updated_at
      FROM dashboards
      WHERE dashboard_id = $1
    `;

    const result = await pool.query(query, [dashboardId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      dashboardId: row.dashboard_id,
      name: row.name,
      description: row.description,
      layout: JSON.parse(row.layout || '{"columns": 3, "rows": 3}'),
      widgets: JSON.parse(row.widgets || '[]'),
      owner: row.owner,
      isPublic: row.is_public,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a dashboard
   */
  async createDashboard(
    dashboard: Omit<Dashboard, 'dashboardId' | 'createdAt'>
  ): Promise<Dashboard> {
    const dashboardId = `DASH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO dashboards (
        dashboard_id, name, description, layout, widgets,
        owner, is_public, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      dashboardId,
      dashboard.name,
      dashboard.description || null,
      JSON.stringify(dashboard.layout),
      JSON.stringify(dashboard.widgets),
      dashboard.owner,
      dashboard.isPublic,
      dashboard.createdBy,
      new Date(),
    ]);

    return this.findDashboardById(dashboardId) as Promise<Dashboard>;
  }

  // =========================================================================
  // EXPORT JOBS
  // =========================================================================

  /**
   * Create an export job
   */
  async createExportJob(job: Omit<ExportJob, 'jobId' | 'createdAt'>): Promise<ExportJob> {
    const jobId = `EXPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO export_jobs (
        job_id, name, entity_type, format, filters, fields,
        status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    await pool.query(query, [
      jobId,
      job.name,
      job.entityType,
      job.format,
      JSON.stringify(job.filters),
      job.fields,
      job.status,
      job.createdBy,
      new Date(),
    ]);

    return {
      jobId,
      ...job,
      createdAt: new Date(),
    };
  }

  /**
   * Update export job
   */
  async updateExportJob(jobId: string, updates: Partial<ExportJob>): Promise<ExportJob | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.fileUrl !== undefined) {
      setClauses.push(`file_url = $${paramIndex++}`);
      values.push(updates.fileUrl);
    }
    if (updates.fileSizeBytes !== undefined) {
      setClauses.push(`file_size_bytes = $${paramIndex++}`);
      values.push(updates.fileSizeBytes);
    }
    if (updates.recordCount !== undefined) {
      setClauses.push(`record_count = $${paramIndex++}`);
      values.push(updates.recordCount);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    values.push(jobId);

    if (setClauses.length > 0) {
      const query = `
        UPDATE export_jobs
        SET ${setClauses.join(', ')}
        WHERE job_id = $${paramIndex}
        RETURNING *
      `;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        jobId: row.job_id,
        name: row.name,
        entityType: row.entity_type,
        format: row.format,
        filters: JSON.parse(row.filters || '[]'),
        fields: row.fields,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        fileUrl: row.file_url,
        fileSizeBytes: row.file_size_bytes,
        recordCount: row.record_count,
        errorMessage: row.error_message,
      };
    }

    return null;
  }

  /**
   * Get an export job by ID
   */
  async getExportJob(jobId: string): Promise<ExportJob | null> {
    const query = `
      SELECT
        job_id, name, entity_type, format, filters, fields,
        status, created_by, created_at, completed_at,
        file_url, file_size_bytes, record_count, error_message
      FROM export_jobs
      WHERE job_id = $1
    `;

    const result = await pool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      jobId: row.job_id,
      name: row.name,
      entityType: row.entity_type,
      format: row.format,
      filters: JSON.parse(row.filters || '[]'),
      fields: row.fields,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      fileUrl: row.file_url,
      fileSizeBytes: row.file_size_bytes,
      recordCount: row.record_count,
      errorMessage: row.error_message,
    };
  }

  /**
   * Get all export jobs with optional filtering
   */
  async findExportJobs(filters?: {
    status?: ReportStatus;
    entityType?: string;
    createdBy?: string;
  }): Promise<ExportJob[]> {
    let query = `
      SELECT
        job_id, name, entity_type, format, filters, fields,
        status, created_by, created_at, completed_at,
        file_url, file_size_bytes, record_count, error_message
      FROM export_jobs
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.entityType) {
      query += ` AND entity_type = $${paramIndex++}`;
      params.push(filters.entityType);
    }

    if (filters?.createdBy) {
      query += ` AND created_by = $${paramIndex++}`;
      params.push(filters.createdBy);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      jobId: row.job_id,
      name: row.name,
      entityType: row.entity_type,
      format: row.format,
      filters: JSON.parse(row.filters || '[]'),
      fields: row.fields,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      fileUrl: row.file_url,
      fileSizeBytes: row.file_size_bytes,
      recordCount: row.record_count,
      errorMessage: row.error_message,
    }));
  }
}

export const reportsRepository = new ReportsRepository();
