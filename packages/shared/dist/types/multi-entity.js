/**
 * Multi-Entity Types
 *
 * Types for multi-company, multi-subsidiary ERP functionality.
 * Supports entity hierarchy, inter-company transactions, and consolidation.
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Entity types in the hierarchy
 */
export var EntityType;
(function (EntityType) {
    EntityType["HEAD_OFFICE"] = "HEAD_OFFICE";
    EntityType["SUBSIDIARY"] = "SUBSIDIARY";
    EntityType["BRANCH"] = "BRANCH";
    EntityType["DIVISION"] = "DIVISION";
})(EntityType || (EntityType = {}));
/**
 * Entity status
 */
export var EntityStatus;
(function (EntityStatus) {
    EntityStatus["ACTIVE"] = "ACTIVE";
    EntityStatus["INACTIVE"] = "INACTIVE";
    EntityStatus["PENDING_SETUP"] = "PENDING_SETUP";
    EntityStatus["CLOSED"] = "CLOSED";
})(EntityStatus || (EntityStatus = {}));
/**
 * Inter-company transaction types
 */
export var IntercompanyTransactionType;
(function (IntercompanyTransactionType) {
    IntercompanyTransactionType["TRANSFER_OF_GOODS"] = "TRANSFER_OF_GOODS";
    IntercompanyTransactionType["TRANSFER_OF_FUNDS"] = "TRANSFER_OF_FUNDS";
    IntercompanyTransactionType["INTERCOMPANY_LOAN"] = "INTERCOMPANY_LOAN";
    IntercompanyTransactionType["COST_ALLOCATION"] = "COST_ALLOCATION";
    IntercompanyTransactionType["REVENUE_ALLOCATION"] = "REVENUE_ALLOCATION";
    IntercompanyTransactionType["MANAGEMENT_FEE"] = "MANAGEMENT_FEE";
    IntercompanyTransactionType["ROYALTY_PAYMENT"] = "ROYALTY_PAYMENT";
    IntercompanyTransactionType["DIVIDEND_PAYMENT"] = "DIVIDEND_PAYMENT";
})(IntercompanyTransactionType || (IntercompanyTransactionType = {}));
/**
 * Inter-company transaction status
 */
export var IntercompanyTransactionStatus;
(function (IntercompanyTransactionStatus) {
    IntercompanyTransactionStatus["PENDING"] = "PENDING";
    IntercompanyTransactionStatus["POSTED"] = "POSTED";
    IntercompanyTransactionStatus["ELIMINATED"] = "ELIMINATED";
    IntercompanyTransactionStatus["REVERSED"] = "REVERSED";
})(IntercompanyTransactionStatus || (IntercompanyTransactionStatus = {}));
/**
 * Entity relationship types
 */
export var EntityRelationshipType;
(function (EntityRelationshipType) {
    EntityRelationshipType["PARENT_SUBSIDIARY"] = "PARENT_SUBSIDIARY";
    EntityRelationshipType["JOINT_VENTURE"] = "JOINT_VENTURE";
    EntityRelationshipType["AFFILIATE"] = "AFFILIATE";
    EntityRelationshipType["PARTNERSHIP"] = "PARTNERSHIP";
    EntityRelationshipType["STRATEGIC_ALLIANCE"] = "STRATEGIC_ALLIANCE";
})(EntityRelationshipType || (EntityRelationshipType = {}));
/**
 * Entity user roles
 */
export var EntityUserRole;
(function (EntityUserRole) {
    EntityUserRole["ENTITY_ADMIN"] = "ENTITY_ADMIN";
    EntityUserRole["ENTITY_USER"] = "ENTITY_USER";
    EntityUserRole["ENTITY_VIEWER"] = "ENTITY_VIEWER";
    EntityUserRole["ENTITY_ACCOUNTANT"] = "ENTITY_ACCOUNTANT";
    EntityUserRole["ENTITY_MANAGER"] = "ENTITY_MANAGER";
})(EntityUserRole || (EntityUserRole = {}));
/**
 * Consolidation methods for subsidiary financials
 */
export var ConsolidationMethod;
(function (ConsolidationMethod) {
    ConsolidationMethod["FULL_CONSOLIDATION"] = "FULL_CONSOLIDATION";
    ConsolidationMethod["PROPORTIONAL_CONSOLIDATION"] = "PROPORTIONAL_CONSOLIDATION";
    ConsolidationMethod["EQUITY_METHOD"] = "EQUITY_METHOD";
    ConsolidationMethod["COST_METHOD"] = "COST_METHOD";
})(ConsolidationMethod || (ConsolidationMethod = {}));
/**
 * Entity audit actions
 */
export var EntityAuditAction;
(function (EntityAuditAction) {
    EntityAuditAction["ENTITY_CREATED"] = "ENTITY_CREATED";
    EntityAuditAction["ENTITY_UPDATED"] = "ENTITY_UPDATED";
    EntityAuditAction["ENTITY_DELETED"] = "ENTITY_DELETED";
    EntityAuditAction["ENTITY_MERGED"] = "ENTITY_MERGED";
    EntityAuditAction["RELATIONSHIP_ADDED"] = "RELATIONSHIP_ADDED";
    EntityAuditAction["RELATIONSHIP_REMOVED"] = "RELATIONSHIP_REMOVED";
    EntityAuditAction["USER_ASSIGNED"] = "USER_ASSIGNED";
    EntityAuditAction["USER_REMOVED"] = "USER_REMOVED";
    EntityAuditAction["CONSOLIDATION_RULE_CHANGED"] = "CONSOLIDATION_RULE_CHANGED";
    EntityAuditAction["SETTINGS_CHANGED"] = "SETTINGS_CHANGED";
})(EntityAuditAction || (EntityAuditAction = {}));
