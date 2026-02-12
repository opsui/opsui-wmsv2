/**
 * Production Management Module Types
 *
 * Basic manufacturing and production workflow functionality
 */
export declare enum ProductionOrderStatus {
    DRAFT = "DRAFT",
    PLANNED = "PLANNED",
    RELEASED = "RELEASED",
    IN_PROGRESS = "IN_PROGRESS",
    ON_HOLD = "ON_HOLD",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum ProductionOrderPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum BillOfMaterialStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED"
}
/**
 * Bill of Materials (BOM) - Defines what goes into making a product
 */
export interface BillOfMaterial {
    bomId: string;
    name: string;
    description?: string;
    productId: string;
    version: string;
    status: BillOfMaterialStatus;
    components: BOMComponent[];
    totalQuantity: number;
    unitOfMeasure: string;
    estimatedCost?: number;
    createdBy: string;
    createdAt: Date;
    updatedBy?: string;
    updatedAt?: Date;
    effectiveDate?: Date;
    expiryDate?: Date;
}
/**
 * Individual component in a BOM
 */
export interface BOMComponent {
    componentId: string;
    bomId: string;
    sku: string;
    quantity: number;
    unitOfMeasure: string;
    isOptional: boolean;
    substituteSkus?: string[];
    notes?: string;
}
/**
 * Production Order - Manufacturing job to produce a product
 */
export interface ProductionOrder {
    orderId: string;
    orderNumber: string;
    productId: string;
    productName: string;
    bomId: string;
    status: ProductionOrderStatus;
    priority: ProductionOrderPriority;
    quantityToProduce: number;
    quantityCompleted: number;
    quantityRejected: number;
    unitOfMeasure: string;
    scheduledStartDate: Date;
    scheduledEndDate: Date;
    actualStartDate?: Date;
    actualEndDate?: Date;
    assignedTo?: string;
    workCenter?: string;
    notes?: string;
    materialsReserved: boolean;
    components: ProductionOrderComponent[];
    createdAt: Date;
    createdBy: string;
    updatedAt?: Date;
    updatedBy?: string;
}
/**
 * Component usage in a production order
 */
export interface ProductionOrderComponent {
    componentId: string;
    orderId: string;
    sku: string;
    description?: string;
    quantityRequired: number;
    quantityIssued: number;
    quantityReturned: number;
    unitOfMeasure: string;
    binLocation?: string;
    lotNumber?: string;
}
/**
 * Production output tracking
 */
export interface ProductionOutput {
    outputId: string;
    orderId: string;
    productId: string;
    quantity: number;
    quantityRejected: number;
    lotNumber?: string;
    producedAt: Date;
    producedBy: string;
    inspectedBy?: string;
    inspectionDate?: Date;
    notes?: string;
    binLocation?: string;
}
/**
 * Production journal entry for tracking time and progress
 */
export interface ProductionJournal {
    journalId: string;
    orderId: string;
    entryType: 'START' | 'PROGRESS' | 'COMPLETE' | 'ISSUE' | 'NOTE';
    enteredAt: Date;
    enteredBy: string;
    quantity?: number;
    notes?: string;
    durationMinutes?: number;
}
export interface CreateProductionOrderDTO {
    productId: string;
    bomId: string;
    quantityToProduce: number;
    scheduledStartDate: Date;
    scheduledEndDate: Date;
    priority?: ProductionOrderPriority;
    assignedTo?: string;
    workCenter?: string;
    notes?: string;
}
export interface UpdateProductionOrderDTO {
    status?: ProductionOrderStatus;
    priority?: ProductionOrderPriority;
    quantityToProduce?: number;
    scheduledStartDate?: Date;
    scheduledEndDate?: Date;
    assignedTo?: string;
    workCenter?: string;
    notes?: string;
}
export interface RecordProductionOutputDTO {
    orderId: string;
    quantity: number;
    quantityRejected: number;
    lotNumber?: string;
    binLocation?: string;
    notes?: string;
}
export interface IssueMaterialDTO {
    orderId: string;
    componentId: string;
    quantity: number;
    binLocation?: string;
    lotNumber?: string;
}
export interface CreateBOMDTO {
    name: string;
    description?: string;
    productId: string;
    components: Omit<BOMComponent, 'componentId' | 'bomId'>[];
    totalQuantity: number;
    unitOfMeasure: string;
    effectiveDate?: Date;
}
export interface UpdateBOMDTO {
    name?: string;
    description?: string;
    status?: BillOfMaterialStatus;
    totalQuantity?: number;
    unitOfMeasure?: string;
    estimatedCost?: number;
    effectiveDate?: Date;
    expiryDate?: Date;
    components?: Omit<BOMComponent, 'componentId' | 'bomId'>[];
}
export interface ReturnMaterialDTO {
    orderId: string;
    componentId: string;
    quantity: number;
    binLocation?: string;
    notes?: string;
}
//# sourceMappingURL=production.d.ts.map