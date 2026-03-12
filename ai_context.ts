// ai_context.ts
// =============================================================================
// THIS FILE MUST BE READ BY AI BEFORE ANY CODING
// DO NOT MODIFY APP LOGIC OR DATABASES
// =============================================================================
//
// Purpose: Prevent AI context drift across development sessions
// Version: 2.0.0
// Last Updated: 2026-03-12
//
// INSTRUCTIONS FOR AI:
// 1. Read this file FIRST THING in every session
// 2. Reference constants from this file before any coding task
// 3. Use it to confirm current database, environment, service, or deployment rules
// 4. If anything here conflicts with user request, CLARIFY before proceeding
// 5. Read related documentation files listed in DOCUMENTATION section below
//
// =============================================================================

export const AI_CONTEXT = {
  // ===========================================================================
  // ENVIRONMENTS
  // ===========================================================================
  // Two distinct databases serve different purposes
  // NEVER mix data between these databases
  // NEVER perform cross-database joins

  ENVIRONMENTS: {
    TEST: 'wms_db', // Development/Testing database
    CUSTOMER: 'aap_db', // Real customer database (PRODUCTION)
  } as const,

  // ===========================================================================
  // DATABASES
  // ===========================================================================
  // Each database has a specific purpose and ownership
  // Always confirm which database you're working with before coding

  DATABASES: {
    WMS: {
      name: 'wms_db',
      type: 'test',
      purpose: 'warehouse operations',
      description: 'Development/testing database for WMS functionality',
      contents: [
        'sales_orders',
        'pick_lists',
        'picked_items',
        'inventory',
        'packing_workflows',
        'fulfillment_records',
        'courier_bag_assignments',
        'bin_locations',
        'skus',
        'order_items',
        'pick_tasks',
        'inventory_transactions',
        'order_state_changes',
      ],
      // These tables DO NOT belong in WMS:
      forbiddenContents: [
        'users (authentication)',
        'permissions',
        'integration_logs',
        'netsuite_sync_data',
      ],
    },

    AAP: {
      name: 'aap_db',
      type: 'customer',
      purpose: 'application + integrations',
      description: 'REAL CUSTOMER DATABASE - Production data',
      contents: [
        'users',
        'authentication',
        'permissions',
        'system_configuration',
        'external_integrations',
        'netsuite_synchronization',
        'integration_logs',
      ],
      // These tables DO NOT belong in AAP:
      forbiddenContents: ['orders (operational)', 'inventory', 'pick_tasks', 'packing_data'],
    },
  } as const,

  // ===========================================================================
  // BACKEND RUNTIME
  // ===========================================================================
  // Backend runs on a remote SSH server, NOT locally
  // Configuration files are in the repository, but runtime is remote

  BACKEND: {
    runtime: 'remote SSH server',
    host: '103.208.85.233',
    sshCommand: 'ssh root@103.208.85.233',
    configLocation: 'repository',
    ports: {
      api: 3001, // LOCKED - Backend API (never change)
      websocket: 3002, // LOCKED - WebSocket Server (never change)
    },
    database: {
      host: 'localhost (on remote server)',
      port: 5432,
      localTunnel: {
        port: 5433,
        command: 'ssh -f -N -L 5433:localhost:5432 root@103.208.85.233',
      },
    },
    runtimeEnvironment: 'PM2 + Node.js on remote server',
    notDocker: true,
  } as const,

  // ===========================================================================
  // FRONTEND DEPLOYMENT
  // ===========================================================================
  // Frontend is deployed separately from backend
  // It does NOT run on the backend server

  FRONTEND: {
    deploy: 'Cloudflare Pages',
    notOnBackend: true,
    buildTool: 'Vite',
    devPort: 5173,
    framework: 'React + TypeScript',
    stateManagement: 'Zustand',
    styling: 'Tailwind CSS',

    // Frontend deployment is triggered by git commits
    deploymentTrigger: 'git push to main branch',

    // API calls go to backend
    apiProxy: {
      development: 'http://localhost:3001',
      production: 'https://api.opsui.app (or similar)',
    },
  } as const,

  // ===========================================================================
  // INTEGRATIONS
  // ===========================================================================
  // Integration services have specific ownership and boundaries

  INTEGRATIONS: {
    // NetSuite integration belongs to aap_db
    ownerDb: 'aap_db',

    // Integration queue architecture (documented, not yet created)
    queueTable: 'integration_queue (documented, not created)',

    // Integration services in codebase
    services: [
      'IntegrationsService',
      'NetSuiteOrderSyncService',
      'NetSuiteClient',
      'NetSuiteAutoSync',
    ],

    // Supported integration providers
    providers: {
      erp: ['NETSUITE', 'SAP', 'ORACLE'],
      ecommerce: ['SHOPIFY', 'WOOCOMMERCE', 'MAGENTO'],
      carriers: ['FEDEX', 'UPS', 'DHL', 'USPS', 'NZC'],
    },

    // CRITICAL: WMS data access rule
    wmsDataAccess: 'API only - NO direct database queries from integration services',
  } as const,

  // ===========================================================================
  // CRITICAL RULES
  // ===========================================================================
  // These rules MUST be followed to prevent data corruption and context drift

  RULES: [
    // Database Rules
    'Never mix databases - wms_db and aap_db serve different purposes',
    'Never perform cross-database joins',
    'Always confirm environment (TEST vs CUSTOMER) before coding',
    'Do not create schemas or modify customer DB (aap_db) without explicit approval',

    // Integration Rules
    'Integration services access WMS via API, not direct DB queries',
    'NetSuite sync logs belong in aap_db, not wms_db',
    'Integration queue pattern: document first, implement with approval',

    // Deployment Rules
    'Frontend is NOT deployed to the backend server',
    'Frontend deploys via Cloudflare Pages on git push',
    'Backend runs on remote SSH server (103.208.85.233)',
    'Database runs on the same server as backend (not Docker)',

    // Development Rules
    'Local development uses SSH tunnel: localhost:5433 → remote:5432',
    'Never expose production credentials in code',
    'Never modify application logic without explicit request',
    'Reference this file (ai_context.ts) before any coding task',
  ] as const,

  // ===========================================================================
  // SERVICE BOUNDARIES
  // ===========================================================================
  // Each service area has specific database ownership

  SERVICE_BOUNDARIES: {
    warehouse: {
      database: 'wms_db',
      services: [
        'OrderService',
        'PickTaskService',
        'InventoryService',
        'PackingService',
        'ShippingService',
        'ZonePickingService',
        'WavePickingService',
      ],
    },

    application: {
      database: 'aap_db',
      services: ['AuthService', 'UserService', 'OrganizationService', 'FeatureFlagService'],
    },

    integration: {
      database: 'aap_db',
      services: [
        'IntegrationsService',
        'NetSuiteOrderSyncService',
        'NetSuiteClient',
        'EcommerceService',
      ],
      // Access WMS data via API, not direct DB
      wmsAccessMethod: 'API',
    },
  } as const,

  // ===========================================================================
  // SESSION STATE TEMPLATE
  // ===========================================================================
  // Track current context during AI sessions

  SESSION_STATE: {
    currentDatabase: 'wms_db | aap_db | UNKNOWN',
    currentEnvironment: 'test | customer | UNKNOWN',
    currentService: 'warehouse | application | integration | UNKNOWN',
    confirmedWithUser: false,
  } as const,

  // ===========================================================================
  // DOCUMENTATION REFERENCE
  // ===========================================================================
  // Related documentation files that should be read based on task type

  DOCUMENTATION: {
    // Core context files - Read at session start
    core: [
      '/ai_context.ts', // THIS FILE - Read first
      '/CURRENT_CONTEXT.md', // Session state tracking
      '/AI_STARTUP_PROMPT.md', // AI session workflow
      '/AI_RULES.md', // Development rules
    ],

    // Architecture & Infrastructure
    architecture: [
      '/PROJECT_CONTEXT.md', // Infrastructure overview
      '/SYSTEM_ARCHITECTURE.md', // Architecture patterns
      '/DATABASE_BOUNDARIES.md', // Database separation rules
    ],

    // Integration Documentation
    integrations: [
      '/INTEGRATIONS.md', // Integration boundaries
    ],

    // Standards Documentation (in /docs/)
    standards: [
      '/docs/ENVIRONMENT_STANDARDS.md', // Environment variables
      '/docs/API_STANDARDS.md', // REST API conventions
      '/docs/CI_CD_PIPELINE.md', // Deployment processes
      '/docs/LOGGING_MONITORING.md', // Logging & monitoring
      '/docs/MCP_SKILLS_SETUP.md', // MCP servers & skills config
    ],

    // Database Clients
    databaseClients: [
      '/db/index.ts', // Barrel export
      '/db/wms_db.ts', // WMS database client
      '/db/aap_db.ts', // AAP database client
    ],

    // When to read each file
    readWhen: {
      sessionStart: ['core'],
      databaseWork: ['architecture', 'databaseClients'],
      apiWork: ['standards/API_STANDARDS.md'],
      deployment: ['standards/CI_CD_PIPELINE.md'],
      integrationWork: ['integrations', 'architecture'],
      debugging: ['standards/LOGGING_MONITORING.md'],
      environmentSetup: ['standards/ENVIRONMENT_STANDARDS.md'],
    },
  } as const,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DatabaseName = typeof AI_CONTEXT.DATABASES.WMS | typeof AI_CONTEXT.DATABASES.AAP;
export type Environment =
  | typeof AI_CONTEXT.ENVIRONMENTS.TEST
  | typeof AI_CONTEXT.ENVIRONMENTS.CUSTOMER;
export type ServiceArea = 'warehouse' | 'application' | 'integration';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the database name for a given service area
 */
export function getDatabaseForService(service: ServiceArea): string {
  return AI_CONTEXT.SERVICE_BOUNDARIES[service].database;
}

/**
 * Check if a database is a customer/production database
 */
export function isCustomerDatabase(db: string): boolean {
  return db === AI_CONTEXT.ENVIRONMENTS.CUSTOMER;
}

/**
 * Validate that an operation is allowed for the current context
 */
export function validateContext(
  db: string,
  operation: string
): { valid: boolean; warning?: string } {
  if (db === AI_CONTEXT.ENVIRONMENTS.CUSTOMER) {
    return {
      valid: false,
      warning: 'CUSTOMER DATABASE (aap_db) - Requires explicit user approval for: ' + operation,
    };
  }
  return { valid: true };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default AI_CONTEXT;
