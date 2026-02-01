/**
 * Maintenance & Assets Module Types
 *
 * Basic equipment maintenance scheduling and asset tracking functionality
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED',
}

export enum AssetType {
  MACHINERY = 'MACHINERY',
  VEHICLE = 'VEHICLE',
  EQUIPMENT = 'EQUIPMENT',
  FACILITY = 'FACILITY',
  TOOL = 'TOOL',
  OTHER = 'OTHER',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  PREDICTIVE = 'PREDICTIVE',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Asset record
 */
export interface Asset {
  assetId: string;
  assetNumber: string; // Human-readable AST-XXXXX
  name: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  purchaseDate?: Date;
  purchasePrice?: number;
  location?: string; // Bin location or facility location
  assignedTo?: string; // User ID or department
  parentId?: string; // For asset hierarchies (e.g., equipment in a facility)
  warrantyExpiry?: Date;
  expectedLifespanYears?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Maintenance schedule
 */
export interface MaintenanceSchedule {
  scheduleId: string;
  assetId: string;
  name: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  intervalDays?: number;
  estimatedDurationHours: number;
  assignedTo?: string; // User ID or team
  partsRequired?: MaintenancePart[];
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastPerformedDate?: Date;
  nextDueDate: Date;
}

/**
 * Maintenance work order
 */
export interface MaintenanceWorkOrder {
  workOrderId: string;
  workOrderNumber: string; // WO-XXXXX
  assetId: string;
  scheduleId?: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledDate: Date;
  scheduledStartTime?: string; // HH:mm format
  estimatedDurationHours: number;
  assignedTo?: string; // User ID or team
  partsRequired?: MaintenancePart[];
  actualStartDate?: Date;
  actualEndDate?: Date;
  actualDurationHours?: number;
  workPerformed?: string;
  partsUsed?: MaintenancePart[];
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  performedBy?: string; // User ID
  completedAt?: Date;
  completedBy?: string; // User ID
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Part required for maintenance
 */
export interface MaintenancePart {
  partId: string;
  sku: string;
  description: string;
  quantityRequired: number;
  quantityUsed?: number;
  binLocation?: string;
  unitCost?: number;
}

/**
 * Service log for asset history
 */
export interface ServiceLog {
  logId: string;
  assetId: string;
  workOrderId?: string;
  serviceDate: Date;
  serviceType: string;
  description: string;
  performedBy: string; // User ID
  cost?: number;
  notes?: string;
  attachments?: string[]; // URLs to documents/photos
  createdAt: Date;
  createdBy: string;
}

/**
 * Meter reading for predictive maintenance
 */
export interface MeterReading {
  readingId: string;
  assetId: string;
  meterType: string; // e.g., "Hours", "Miles", "Cycles"
  value: number;
  unit: string;
  readingDate: Date;
  readBy: string; // User ID
  notes?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateAssetDTO {
  name: string;
  description?: string;
  type: AssetType;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  location?: string;
  assignedTo?: string;
  parentId?: string;
  warrantyExpiry?: string;
  expectedLifespanYears?: number;
  notes?: string;
}

export interface CreateMaintenanceScheduleDTO {
  assetId: string;
  name: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  intervalDays?: number;
  estimatedDurationHours: number;
  assignedTo?: string;
  partsRequired?: Omit<MaintenancePart, 'partId'>[];
  instructions?: string;
  nextDueDate: string;
}

export interface CreateWorkOrderDTO {
  assetId: string;
  scheduleId?: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  scheduledDate: string;
  scheduledStartTime?: string;
  estimatedDurationHours: number;
  assignedTo?: string;
  partsRequired?: Omit<MaintenancePart, 'partId'>[];
}

export interface CompleteWorkOrderDTO {
  workPerformed: string;
  partsUsed?: Omit<MaintenancePart, 'partId'>[];
  actualDurationHours?: number;
  laborCost?: number;
  partsCost?: number;
  notes?: string;
}

export interface AddMeterReadingDTO {
  assetId: string;
  meterType: string;
  value: number;
  unit: string;
  readingDate: string;
  notes?: string;
}
