/**
 * @opsui/shared
 *
 * Module definitions for OpsUI modular ERP pricing system
 * Each module can be independently enabled/disabled per tenant
 */

// ============================================================================
// MODULE CATEGORIES
// ============================================================================

export type ModuleCategory =
  | 'core-warehouse'
  | 'advanced-warehouse'
  | 'logistics'
  | 'quality-compliance'
  | 'business-automation'
  | 'analytics-intelligence'
  | 'enterprise-management';

// ============================================================================
// MODULE IDENTIFIERS
// ============================================================================

export type ModuleId =
  // Core Warehouse Operations
  | 'order-management'
  | 'inventory-management'
  | 'receiving-inbound'
  | 'shipping-outbound'
  // Advanced Warehouse Features
  | 'cycle-counting'
  | 'wave-picking'
  | 'zone-picking'
  | 'slotting-optimization'
  // Logistics & Route Optimization
  | 'route-optimization'
  // Quality & Compliance
  | 'quality-control'
  | 'exceptions-management'
  // Business Automation
  | 'business-rules-engine'
  // Analytics & Intelligence
  | 'dashboards-reporting'
  | 'ml-ai-predictions'
  // Enterprise Management
  | 'finance-accounting'
  | 'human-resources'
  | 'production-manufacturing'
  | 'procurement'
  | 'maintenance-management'
  | 'returns-management';

// ============================================================================
// USER TIERS
// ============================================================================

export type UserTierId = 'tier-1-5' | 'tier-6-15' | 'tier-16-50' | 'tier-51-100' | 'tier-unlimited';

export interface UserTier {
  id: UserTierId;
  name: string;
  minUsers: number;
  maxUsers: number | null; // null = unlimited
  monthlyFee: number;
  description: string;
}

export const USER_TIERS: Record<UserTierId, UserTier> = {
  'tier-1-5': {
    id: 'tier-1-5',
    name: '1-5 Users',
    minUsers: 1,
    maxUsers: 5,
    monthlyFee: 0,
    description: 'Small team included free',
  },
  'tier-6-15': {
    id: 'tier-6-15',
    name: '6-15 Users',
    minUsers: 6,
    maxUsers: 15,
    monthlyFee: 149,
    description: 'Growing teams',
  },
  'tier-16-50': {
    id: 'tier-16-50',
    name: '16-50 Users',
    minUsers: 16,
    maxUsers: 50,
    monthlyFee: 299,
    description: 'Medium organizations',
  },
  'tier-51-100': {
    id: 'tier-51-100',
    name: '51-100 Users',
    minUsers: 51,
    maxUsers: 100,
    monthlyFee: 499,
    description: 'Large organizations',
  },
  'tier-unlimited': {
    id: 'tier-unlimited',
    name: 'Unlimited Users',
    minUsers: 101,
    maxUsers: null,
    monthlyFee: 799,
    description: 'Enterprise scale',
  },
};

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  category: ModuleCategory;
  pricing: {
    monthly: number;
    annual: number; // ~17% discount (2 months free)
  };
  features: string[];
  dependencies?: ModuleId[]; // Modules that must be enabled first
  routes?: string[]; // Frontend routes this module enables
  apiEndpoints?: string[]; // Backend API endpoints this module enables
  requiredRoles?: string[]; // Roles that make sense for this module
  icon?: string; // Icon name for UI
}

// ============================================================================
// ALL MODULE DEFINITIONS
// ============================================================================

export const MODULE_DEFINITIONS: Record<ModuleId, ModuleDefinition> = {
  // ==========================================================================
  // CORE WAREHOUSE OPERATIONS
  // ==========================================================================
  'order-management': {
    id: 'order-management',
    name: 'Order Management',
    description: 'Complete order lifecycle management from creation to fulfillment',
    category: 'core-warehouse',
    pricing: { monthly: 99, annual: 990 },
    features: [
      'Order creation and editing',
      'Status tracking',
      'Priority management',
      'Customer management',
      'Pick task generation',
      'Bulk operations',
      'Templates',
      'Backorder management',
    ],
    routes: ['/orders', '/orders/*'],
    apiEndpoints: ['/api/orders', '/api/customers'],
    requiredRoles: ['SALES', 'SUPERVISOR', 'ADMIN'],
    icon: 'ClipboardList',
  },

  'inventory-management': {
    id: 'inventory-management',
    name: 'Inventory Management',
    description: 'Real-time inventory tracking and control across all locations',
    category: 'core-warehouse',
    pricing: { monthly: 99, annual: 990 },
    features: [
      'SKU management',
      'Bin locations',
      'Inventory transactions',
      'Multi-location support',
      'Stock levels',
      'Low stock alerts',
      'Serial/batch tracking',
      'Inventory valuation',
    ],
    routes: ['/inventory', '/inventory/*', '/skus', '/bins'],
    apiEndpoints: ['/api/inventory', '/api/skus', '/api/bins'],
    requiredRoles: ['STOCK_CONTROLLER', 'SUPERVISOR', 'ADMIN'],
    icon: 'Package',
  },

  'receiving-inbound': {
    id: 'receiving-inbound',
    name: 'Receiving/Inbound',
    description: 'Streamlined inbound logistics and putaway operations',
    category: 'core-warehouse',
    pricing: { monthly: 79, annual: 790 },
    features: [
      'ASN management',
      'Putaway optimization',
      'Supplier management',
      'Quality inspection',
      'Receipt processing',
      'Discrepancy handling',
      'Dock scheduling',
      'Cross-docking',
    ],
    routes: ['/receiving', '/receiving/*', '/asn'],
    apiEndpoints: ['/api/receiving', '/api/asn', '/api/suppliers'],
    requiredRoles: ['INWARDS', 'SUPERVISOR', 'ADMIN'],
    icon: 'Truck',
  },

  'shipping-outbound': {
    id: 'shipping-outbound',
    name: 'Shipping/Outbound',
    description: 'Complete shipping and carrier integration solution',
    category: 'core-warehouse',
    pricing: { monthly: 79, annual: 790 },
    features: [
      'Packing queue',
      'Label generation',
      'Carrier integration (NZ Post, DHL, FedEx, etc.)',
      'Tracking numbers',
      'Manifest management',
      'Rate shopping',
      'Multi-parcel support',
      'Return labels',
    ],
    routes: ['/shipping', '/shipping/*', '/packing'],
    apiEndpoints: ['/api/shipping', '/api/packing', '/api/carriers'],
    requiredRoles: ['DISPATCH', 'PACKER', 'SUPERVISOR', 'ADMIN'],
    icon: 'Send',
  },

  // ==========================================================================
  // ADVANCED WAREHOUSE FEATURES
  // ==========================================================================
  'cycle-counting': {
    id: 'cycle-counting',
    name: 'Cycle Counting',
    description: 'Automated inventory accuracy verification system',
    category: 'advanced-warehouse',
    pricing: { monthly: 89, annual: 890 },
    features: [
      'Automated count plans',
      'Variance tracking',
      'Mobile scanning',
      'KPI reporting',
      'Root cause analysis',
      'Blind counting',
      'Adjustment workflow',
      'Recount triggers',
    ],
    dependencies: ['inventory-management'],
    routes: ['/cycle-counting', '/cycle-counting/*'],
    apiEndpoints: ['/api/cycle-counts'],
    requiredRoles: ['STOCK_CONTROLLER', 'SUPERVISOR', 'ADMIN'],
    icon: 'CheckCircle',
  },

  'wave-picking': {
    id: 'wave-picking',
    name: 'Wave Picking',
    description: 'Efficient batch picking with wave planning and execution',
    category: 'advanced-warehouse',
    pricing: { monthly: 89, annual: 890 },
    features: [
      'Wave creation',
      'Order grouping',
      'Progress tracking',
      'Templates',
      'Release scheduling',
      'Workload balancing',
      'Analytics',
      'Dynamic adjustment',
    ],
    dependencies: ['order-management'],
    routes: ['/wave-picking', '/waves'],
    apiEndpoints: ['/api/waves', '/api/pick-tasks'],
    requiredRoles: ['PICKER', 'SUPERVISOR', 'ADMIN'],
    icon: 'Waves',
  },

  'zone-picking': {
    id: 'zone-picking',
    name: 'Zone Picking',
    description: 'Zone-based picking with performance optimization',
    category: 'advanced-warehouse',
    pricing: { monthly: 89, annual: 890 },
    features: [
      'Zone assignment',
      'Performance metrics',
      'Cross-zone tracking',
      'Configuration',
      'Pick pass optimization',
      'Balancing',
      'Pass-off management',
      'Reports',
    ],
    dependencies: ['order-management', 'inventory-management'],
    routes: ['/zone-picking', '/zones'],
    apiEndpoints: ['/api/zones', '/api/zone-picking'],
    requiredRoles: ['PICKER', 'SUPERVISOR', 'ADMIN'],
    icon: 'Grid3X3',
  },

  'slotting-optimization': {
    id: 'slotting-optimization',
    name: 'Slotting Optimization',
    description: 'AI-powered warehouse slotting and product placement optimization',
    category: 'advanced-warehouse',
    pricing: { monthly: 99, annual: 990 },
    features: [
      'ABC analysis',
      'AI recommendations',
      'Rules engine',
      'Velocity tracking',
      'Reslotting suggestions',
      'Ergonomic considerations',
      'Family grouping',
      'What-if scenarios',
    ],
    dependencies: ['inventory-management'],
    routes: ['/slotting', '/slotting/*'],
    apiEndpoints: ['/api/slotting'],
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    icon: 'LayoutGrid',
  },

  // ==========================================================================
  // LOGISTICS & ROUTE OPTIMIZATION
  // ==========================================================================
  'route-optimization': {
    id: 'route-optimization',
    name: 'Route Optimization',
    description: 'AI-powered pick path and route optimization',
    category: 'logistics',
    pricing: { monthly: 129, annual: 1290 },
    features: [
      'AI-powered pick paths',
      'Travel distance minimization (up to 40%)',
      'Workload balancing',
      'Real-time adjustment',
      'Multi-order optimization',
      'Congestion avoidance',
      'Analytics',
      'Custom maps',
    ],
    dependencies: ['order-management', 'inventory-management'],
    routes: ['/route-optimization'],
    apiEndpoints: ['/api/routes', '/api/optimization'],
    requiredRoles: ['PICKER', 'SUPERVISOR', 'ADMIN'],
    icon: 'Route',
  },

  // ==========================================================================
  // QUALITY & COMPLIANCE
  // ==========================================================================
  'quality-control': {
    id: 'quality-control',
    name: 'Quality Control',
    description: 'Comprehensive quality management and compliance system',
    category: 'quality-compliance',
    pricing: { monthly: 99, annual: 990 },
    features: [
      'Inspection workflows',
      'Defect tracking',
      'CAPA management',
      'Supplier quality ratings',
      'Hold management',
      'Inspection sampling',
      'Non-conformance reports',
      'Certifications',
    ],
    routes: ['/quality', '/quality/*'],
    apiEndpoints: ['/api/quality', '/api/inspections'],
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    icon: 'ShieldCheck',
  },

  'exceptions-management': {
    id: 'exceptions-management',
    name: 'Exceptions Management',
    description: 'Intelligent exception detection and resolution workflow',
    category: 'quality-compliance',
    pricing: { monthly: 79, annual: 790 },
    features: [
      'Exception detection',
      'Intelligent routing',
      'Escalation workflows',
      'Analytics',
      'Resolution tracking',
      'Priority scoring',
      'Notifications',
      'Categories',
    ],
    routes: ['/exceptions', '/exceptions/*'],
    apiEndpoints: ['/api/exceptions'],
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    icon: 'AlertTriangle',
  },

  // ==========================================================================
  // BUSINESS AUTOMATION
  // ==========================================================================
  'business-rules-engine': {
    id: 'business-rules-engine',
    name: 'Business Rules Engine',
    description: 'Visual rule builder for workflow automation',
    category: 'business-automation',
    pricing: { monthly: 129, annual: 1290 },
    features: [
      'Event-triggered rules',
      'Visual rule builder',
      'Testing',
      'Versioning',
      'Audit trail',
      'Conditional logic',
      'Scheduled rules',
      'Templates',
    ],
    routes: ['/business-rules', '/rules'],
    apiEndpoints: ['/api/business-rules'],
    requiredRoles: ['ADMIN'],
    icon: 'Cog',
  },

  // ==========================================================================
  // ANALYTICS & INTELLIGENCE
  // ==========================================================================
  'dashboards-reporting': {
    id: 'dashboards-reporting',
    name: 'Dashboards & Reporting',
    description: 'Real-time KPIs and custom reporting',
    category: 'analytics-intelligence',
    pricing: { monthly: 99, annual: 990 },
    features: [
      'Real-time KPIs',
      'Custom report builder',
      'Scheduled exports',
      'PDF/Excel/CSV export',
      'Drill-down analysis',
      'Benchmarks',
      'Customizable dashboards',
      'Mobile access',
    ],
    routes: ['/dashboard', '/reports', '/analytics'],
    apiEndpoints: ['/api/reports', '/api/analytics'],
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    icon: 'BarChart3',
  },

  'ml-ai-predictions': {
    id: 'ml-ai-predictions',
    name: 'ML/AI Predictions',
    description: 'Machine learning powered forecasting and predictions',
    category: 'analytics-intelligence',
    pricing: { monthly: 149, annual: 1490 },
    features: [
      'Demand forecasting',
      'Order duration prediction',
      'Anomaly detection',
      'Resource optimization',
      'Seasonality analysis',
      'Trend prediction',
      'ML model training',
      'Confidence intervals',
    ],
    dependencies: ['dashboards-reporting'],
    routes: ['/ml', '/predictions', '/forecasting'],
    apiEndpoints: ['/api/ml', '/api/predictions'],
    requiredRoles: ['ADMIN'],
    icon: 'Brain',
  },

  // ==========================================================================
  // ENTERPRISE MANAGEMENT
  // ==========================================================================
  'finance-accounting': {
    id: 'finance-accounting',
    name: 'Finance & Accounting',
    description: 'Complete financial management and accounting',
    category: 'enterprise-management',
    pricing: { monthly: 199, annual: 1990 },
    features: [
      'Chart of accounts',
      'Journal entries',
      'AR/AP aging',
      'Bank reconciliation',
      'Fixed assets',
      'Budgeting',
      'Financial statements',
      'Multi-currency',
    ],
    routes: ['/accounting', '/finance', '/accounting/*'],
    apiEndpoints: ['/api/accounting', '/api/finance', '/api/journals'],
    requiredRoles: ['ACCOUNTING', 'ADMIN'],
    icon: 'DollarSign',
  },

  'human-resources': {
    id: 'human-resources',
    name: 'Human Resources',
    description: 'Complete HR management and payroll integration',
    category: 'enterprise-management',
    pricing: { monthly: 129, annual: 1290 },
    features: [
      'Employee records',
      'Time tracking',
      'Payroll integration',
      'Leave management',
      'Performance tracking',
      'Onboarding',
      'Document management',
      'Compliance',
    ],
    routes: ['/hr', '/employees', '/hr/*'],
    apiEndpoints: ['/api/hr', '/api/employees'],
    requiredRoles: ['HR_MANAGER', 'HR_ADMIN', 'ADMIN'],
    icon: 'Users',
  },

  'production-manufacturing': {
    id: 'production-manufacturing',
    name: 'Production/Manufacturing',
    description: 'Complete manufacturing operations management',
    category: 'enterprise-management',
    pricing: { monthly: 149, annual: 1490 },
    features: [
      'BOM management',
      'Production orders',
      'Work centers',
      'MRP',
      'Shop floor control',
      'Routing',
      'Costing',
      'Quality integration',
    ],
    dependencies: ['inventory-management'],
    routes: ['/manufacturing', '/production', '/bom'],
    apiEndpoints: ['/api/manufacturing', '/api/production', '/api/bom'],
    requiredRoles: ['PRODUCTION', 'SUPERVISOR', 'ADMIN'],
    icon: 'Factory',
  },

  procurement: {
    id: 'procurement',
    name: 'Procurement',
    description: 'Complete procurement and vendor management',
    category: 'enterprise-management',
    pricing: { monthly: 129, annual: 1290 },
    features: [
      'PO management',
      'Vendor management',
      'Requisitions',
      'Approval workflows',
      'Spend analytics',
      'Contract management',
      'Three-way match',
      'Supplier portal',
    ],
    dependencies: ['inventory-management'],
    routes: ['/procurement', '/purchase-orders', '/vendors'],
    apiEndpoints: ['/api/procurement', '/api/purchase-orders', '/api/vendors'],
    requiredRoles: ['SALES', 'SUPERVISOR', 'ADMIN'],
    icon: 'ShoppingCart',
  },

  'maintenance-management': {
    id: 'maintenance-management',
    name: 'Maintenance Management',
    description: 'Preventive maintenance and asset management',
    category: 'enterprise-management',
    pricing: { monthly: 99, annual: 990 },
    features: [
      'Preventive maintenance',
      'Work orders',
      'Asset management',
      'Calendar',
      'Spare parts inventory',
      'Analytics',
      'Checklists',
      'Mobile access',
    ],
    routes: ['/maintenance', '/assets', '/work-orders'],
    apiEndpoints: ['/api/maintenance', '/api/assets'],
    requiredRoles: ['MAINTENANCE', 'SUPERVISOR', 'ADMIN'],
    icon: 'Wrench',
  },

  'returns-management': {
    id: 'returns-management',
    name: 'Returns Management (RMA)',
    description: 'Complete return merchandise authorization system',
    category: 'enterprise-management',
    pricing: { monthly: 89, annual: 890 },
    features: [
      'RMA authorization',
      'Return reason tracking',
      'Credit processing',
      'Restocking workflows',
      'Return labels',
      'Inspection & grading',
      'Analytics',
      'Customer portal',
    ],
    dependencies: ['order-management'],
    routes: ['/rma', '/returns'],
    apiEndpoints: ['/api/rma', '/api/returns'],
    requiredRoles: ['RMA', 'SUPERVISOR', 'ADMIN'],
    icon: 'RotateCcw',
  },
};

// ============================================================================
// BUNDLES
// ============================================================================

export interface BundleDefinition {
  id: string;
  name: string;
  description: string;
  modules: ModuleId[];
  pricing: {
    monthly: number;
    annual: number;
  };
  targetUseCase: string;
  savings: number; // Percentage saved vs buying separately
}

export const BUNDLE_DEFINITIONS: BundleDefinition[] = [
  {
    id: 'basic-ecommerce',
    name: 'Basic E-commerce',
    description: 'Essential modules for small online stores',
    modules: ['order-management', 'inventory-management'],
    pricing: { monthly: 179, annual: 1790 },
    targetUseCase: 'Small online stores',
    savings: 10,
  },
  {
    id: 'order-fulfillment',
    name: 'Order Fulfillment',
    description: 'Complete order-to-delivery solution',
    modules: ['order-management', 'inventory-management', 'shipping-outbound'],
    pricing: { monthly: 239, annual: 2390 },
    targetUseCase: 'E-commerce & Retail',
    savings: 15,
  },
  {
    id: 'full-warehouse',
    name: 'Full Warehouse',
    description: 'Complete warehouse management solution',
    modules: [
      'order-management',
      'inventory-management',
      'receiving-inbound',
      'shipping-outbound',
      'cycle-counting',
      'wave-picking',
      'zone-picking',
      'slotting-optimization',
      'route-optimization',
    ],
    pricing: { monthly: 799, annual: 7990 },
    targetUseCase: '3PL & Distribution',
    savings: 25,
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Complete manufacturing operations',
    modules: ['production-manufacturing', 'quality-control', 'procurement'],
    pricing: { monthly: 319, annual: 3190 },
    targetUseCase: 'Manufacturing',
    savings: 20,
  },
];

export const FULL_ERP_BUNDLE = {
  id: 'full-erp',
  name: 'Full ERP Bundle',
  description: 'All 20 modules with unlimited users and premium support',
  pricing: {
    monthly: 1999,
    annual: 19990,
  },
  includes: [
    'All 20 modules',
    'Unlimited users',
    'Priority support',
    'Future releases',
    'Integration assistance',
    'Dedicated account manager',
    'Custom training',
  ],
  savings: 35, // vs buying all modules + unlimited users separately
};

// ============================================================================
// ADD-ON SERVICES
// ============================================================================

export interface AddOnService {
  id: string;
  name: string;
  description: string;
  oneTimeFee: number;
  monthlyFee: number;
}

export const ADD_ON_SERVICES: AddOnService[] = [
  {
    id: 'integration-setup',
    name: 'Integration Setup',
    description: 'Professional integration setup and configuration',
    oneTimeFee: 1500,
    monthlyFee: 0,
  },
  {
    id: 'custom-api-development',
    name: 'Custom API Development',
    description: 'Custom API endpoints and integrations',
    oneTimeFee: 5000,
    monthlyFee: 0,
  },
  {
    id: 'data-migration',
    name: 'Data Migration',
    description: 'Professional data migration from legacy systems',
    oneTimeFee: 3000,
    monthlyFee: 0,
  },
  {
    id: 'premium-support',
    name: 'Premium Support (24/7)',
    description: '24/7 priority support with guaranteed response times',
    oneTimeFee: 0,
    monthlyFee: 299,
  },
  {
    id: 'training-session',
    name: 'Training Session',
    description: 'On-site or virtual training session for your team',
    oneTimeFee: 750,
    monthlyFee: 0,
  },
  {
    id: 'white-label',
    name: 'White-Label/Custom Branding',
    description: 'Remove OpsUI branding and add your own',
    oneTimeFee: 5000,
    monthlyFee: 199,
  },
];

// ============================================================================
// USER ROLES (Included with any module purchase)
// ============================================================================

export const USER_ROLES = [
  { id: 'PICKER', name: 'Picker', description: 'Warehouse picking operations' },
  { id: 'PACKER', name: 'Packer', description: 'Packing and shipping preparation' },
  { id: 'STOCK_CONTROLLER', name: 'Stock Controller', description: 'Inventory management' },
  { id: 'INWARDS', name: 'Inwards', description: 'Receiving and putaway' },
  { id: 'DISPATCH', name: 'Dispatch', description: 'Shipping and dispatch' },
  { id: 'PRODUCTION', name: 'Production', description: 'Manufacturing operations' },
  { id: 'SALES', name: 'Sales', description: 'Sales and customer management' },
  { id: 'MAINTENANCE', name: 'Maintenance', description: 'Equipment and facility maintenance' },
  { id: 'RMA', name: 'RMA', description: 'Returns management' },
  { id: 'ACCOUNTING', name: 'Accounting', description: 'Financial operations' },
  { id: 'SUPERVISOR', name: 'Supervisor', description: 'Team supervision and reporting' },
  { id: 'ADMIN', name: 'Admin', description: 'System administration' },
  { id: 'HR_MANAGER', name: 'HR Manager', description: 'Human resources management' },
  { id: 'HR_ADMIN', name: 'HR Admin', description: 'HR administration' },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all modules in a category
 */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return Object.values(MODULE_DEFINITIONS).filter(m => m.category === category);
}

/**
 * Get all module categories with their modules
 */
export function getModulesGroupedByCategory(): Record<ModuleCategory, ModuleDefinition[]> {
  const categories: ModuleCategory[] = [
    'core-warehouse',
    'advanced-warehouse',
    'logistics',
    'quality-compliance',
    'business-automation',
    'analytics-intelligence',
    'enterprise-management',
  ];

  return categories.reduce(
    (acc, category) => {
      acc[category] = getModulesByCategory(category);
      return acc;
    },
    {} as Record<ModuleCategory, ModuleDefinition[]>
  );
}

/**
 * Calculate monthly price for selected modules and user tier
 */
export function calculateMonthlyPrice(moduleIds: ModuleId[], userTierId: UserTierId): number {
  const modulesPrice = moduleIds.reduce((sum, id) => {
    const module = MODULE_DEFINITIONS[id];
    return sum + (module?.pricing.monthly ?? 0);
  }, 0);

  const tierPrice = USER_TIERS[userTierId]?.monthlyFee ?? 0;
  return modulesPrice + tierPrice;
}

/**
 * Calculate annual price for selected modules and user tier
 * Note: User tier stays monthly even on annual plans
 */
export function calculateAnnualPrice(moduleIds: ModuleId[], userTierId: UserTierId): number {
  const modulesAnnualPrice = moduleIds.reduce((sum, id) => {
    const module = MODULE_DEFINITIONS[id];
    return sum + (module?.pricing.annual ?? 0);
  }, 0);

  // User tier fee is multiplied by 12 for annual
  const tierAnnualPrice = (USER_TIERS[userTierId]?.monthlyFee ?? 0) * 12;
  return modulesAnnualPrice + tierAnnualPrice;
}

/**
 * Get the appropriate user tier for a given number of users
 */
export function getUserTierForUserCount(userCount: number): UserTier {
  if (userCount <= 5) return USER_TIERS['tier-1-5'];
  if (userCount <= 15) return USER_TIERS['tier-6-15'];
  if (userCount <= 50) return USER_TIERS['tier-16-50'];
  if (userCount <= 100) return USER_TIERS['tier-51-100'];
  return USER_TIERS['tier-unlimited'];
}

/**
 * Check if a module's dependencies are satisfied
 */
export function areDependenciesSatisfied(moduleId: ModuleId, enabledModules: ModuleId[]): boolean {
  const module = MODULE_DEFINITIONS[moduleId];
  if (!module?.dependencies) return true;

  return module.dependencies.every(dep => enabledModules.includes(dep));
}

/**
 * Get unsatisfied dependencies for a module
 */
export function getUnsatisfiedDependencies(
  moduleId: ModuleId,
  enabledModules: ModuleId[]
): ModuleId[] {
  const module = MODULE_DEFINITIONS[moduleId];
  if (!module?.dependencies) return [];

  return module.dependencies.filter(dep => !enabledModules.includes(dep));
}

/**
 * Get all routes enabled by a set of modules
 */
export function getEnabledRoutes(enabledModules: ModuleId[]): string[] {
  const routes: string[] = [];

  for (const moduleId of enabledModules) {
    const module = MODULE_DEFINITIONS[moduleId];
    if (module?.routes) {
      routes.push(...module.routes);
    }
  }

  // Always include core routes
  routes.push('/login', '/logout', '/settings', '/profile');

  return routes;
}

/**
 * Get all API endpoints enabled by a set of modules
 */
export function getEnabledApiEndpoints(enabledModules: ModuleId[]): string[] {
  const endpoints: string[] = [];

  for (const moduleId of enabledModules) {
    const module = MODULE_DEFINITIONS[moduleId];
    if (module?.apiEndpoints) {
      endpoints.push(...module.apiEndpoints);
    }
  }

  // Always include core endpoints
  endpoints.push('/api/auth', '/api/users', '/api/modules', '/api/health');

  return endpoints;
}
