/**
 * Validation utilities for WMS
 *
 * These validators are shared between frontend and backend
 */
export declare function validateSKU(sku: string): void;
export declare function validateBinLocation(binLocation: string): void;
export declare function validateOrderItems(items: Array<{
    sku: string;
    quantity: number;
}>): void;
export declare function validatePickQuantity(quantity: number, orderQuantity: number, alreadyPicked: number): void;
export declare function validatePickSKU(scannedSKU: string, expectedSKU: string): void;
export declare function validateEmail(email: string): void;
export declare function validateUserName(name: string): void;
export declare function validateQuantity(quantity: number, fieldName?: string): void;
export declare function validateId(id: string, fieldName?: string): void;
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateBatch(items: Array<{
    sku: string;
    quantity: number;
    binLocation?: string;
}>): ValidationResult;
//# sourceMappingURL=validators.d.ts.map