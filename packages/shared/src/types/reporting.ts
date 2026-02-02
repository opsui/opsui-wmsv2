/**
 * Advanced Reporting Types
 *
 * Defines the domain model for custom reports,
 * scheduled reports, and data exports.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ReportType {
  INVENTORY = 'INVENTORY',
  ORDERS = 'ORDERS',
  SHIPPING = 'SHIPPING',
  RECEIVING = 'RECEIVING',
  PICKING_PERFORMANCE = 'PICKING_PERFORMANCE',
  PACKING_PERFORMANCE = 'PACKING_PERFORMANCE',
  CYCLE_COUNTS = 'CYCLE_COUNTS',
  LOCATION_UTILIZATION = 'LOCATION_UTILIZATION',
  USER_PERFORMANCE = 'USER_PERFORMANCE',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  HTML = 'HTML',
  JSON = 'JSON',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ScheduleFrequency {
  ON_DEMAND = 'ON_DEMAND',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum ChartType {
  TABLE = 'TABLE',
  BAR = 'BAR',
  LINE = 'LINE',
  PIE = 'PIE',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  GAUGE = 'GAUGE',
  HEATMAP = 'HEATMAP',
}

export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  DISTINCT_COUNT = 'DISTINCT_COUNT',
  MEDIAN = 'MEDIAN',
  PERCENTILE = 'PERCENTILE',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a field in a report
 */
export interface ReportField {
  fieldId: string;
  name: string;
  source: string; // Table or data source
  field: string; // Actual field name
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  aggregatable: boolean;
  filterable: boolean;
  displayName: string;
  format?: string; // Number format, date format, etc.
}

/**
 * Represents a filter in a report
 */
export interface ReportFilter {
  filterId: string;
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than'
    | 'between'
    | 'in';
  value: unknown;
  value2?: unknown; // For between operations
  displayName?: string;
}

/**
 * Represents a grouping/sort in a report
 */
export interface ReportGroup {
  groupId: string;
  field: string;
  aggregation?: AggregationType;
  sortDirection: 'asc' | 'desc';
  displayName?: string;
}

/**
 * Defines a custom report
 */
export interface Report {
  reportId: string;
  name: string;
  description: string;
  reportType: ReportType;
  status: ReportStatus;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  // Report definition
  fields: ReportField[];
  filters: ReportFilter[];
  groups: ReportGroup[];
  chartConfig: ChartConfig;
  // Output settings
  defaultFormat: ReportFormat;
  allowExport: boolean;
  allowSchedule: boolean;
  isPublic: boolean; // Can other users see this report
  tags: string[];
  category: string;
}

/**
 * Chart configuration for visual reports
 */
export interface ChartConfig {
  enabled: boolean;
  chartType: ChartType;
  xAxis?: string; // Field for x-axis
  yAxis?: string; // Field for y-axis
  series?: SeriesConfig[];
  title?: string;
  showLegend: boolean;
  showDataLabels: boolean;
  colorScheme?: string;
}

export interface SeriesConfig {
  name: string;
  field: string;
  aggregation?: AggregationType;
  color?: string;
}

/**
 * Report execution instance
 */
export interface ReportExecution {
  executionId: string;
  reportId: string;
  executedAt: Date;
  executedBy: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: Record<string, unknown>;
  fileUrl?: string;
  fileSizeBytes?: number;
  rowCount?: number;
  executionTimeMs: number;
  errorMessage?: string;
}

/**
 * Report schedule configuration
 */
export interface ReportSchedule {
  scheduleId: string;
  reportId: string;
  name: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  scheduleConfig: ScheduleConfig;
  recipients: string[]; // Email addresses
  format: ReportFormat;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  nextRunAt?: Date;
  lastRunAt?: Date;
}

/**
 * Schedule configuration based on frequency
 */
export interface ScheduleConfig {
  // For daily/weekly/monthly
  hour?: number;
  minute?: number;
  // For weekly
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  // For monthly
  dayOfMonth?: number; // 1-31
  // For quarterly/yearly
  month?: number; // 1-12
  timezone?: string;
}

/**
 * Report dashboard for organizing multiple reports
 */
export interface Dashboard {
  dashboardId: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  owner: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
}

export interface DashboardWidget {
  widgetId: string;
  reportId: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  title?: string;
  refreshInterval?: number; // Seconds
}

/**
 * Predefined report templates
 */
export interface ReportTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  reportType: ReportType;
  thumbnail?: string;
  fields: Omit<ReportField, 'fieldId'>[];
  filters: Omit<ReportFilter, 'filterId'>[];
  groups: Omit<ReportGroup, 'groupId'>[];
  chartConfig: ChartConfig;
  isSystemTemplate: boolean;
  createdAt: Date;
}

/**
 * Export job for large data exports
 */
export interface ExportJob {
  jobId: string;
  name: string;
  entityType: string; // 'orders', 'inventory', etc.
  format: ReportFormat;
  filters: ReportFilter[];
  fields: string[];
  status: ReportStatus;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  fileUrl?: string;
  fileSizeBytes?: number;
  recordCount?: number;
  errorMessage?: string;
}
