/**
 * Smart Test Data Factory
 *
 * Generates realistic production-like test data using AI
 * Respects constraints, relationships, and business rules
 */

import { GLMClient } from './glm-client';

interface FieldSpec {
  name: string;
  type: string;
  constraints?: string[];
  required: boolean;
  enum?: string[];
  relationship?: {
    entity: string;
    field: string;
  };
}

interface GeneratedRecord {
  [key: string]: any;
}

interface DataGenerationResult {
  records: GeneratedRecord[];
  validationRules: Array<{
    field: string;
    rule: string;
    testValue: any;
  }>;
  variations: string[];
}

export class SmartTestDataFactory {
  private glm: GLMClient;
  private entityCache = new Map<string, any[]>();
  private wmsKnowledge = {
    skus: ['WMS-001', 'WMS-002', 'WMS-003', 'SKU-1001', 'SKU-1002'],
    binLocations: ['A-01-01', 'A-01-02', 'B-05-12', 'C-10-01', 'D-02-15'],
    carriers: ['CourierPost', 'NZ Post', 'DHL', 'Fastway'],
    statuses: ['pending', 'processing', 'picked', 'packed', 'shipped', 'delivered'],
    priorities: ['low', 'normal', 'high', 'urgent'],
    zones: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  };

  constructor(glm: GLMClient) {
    this.glm = glm;
  }

  /**
   * Generate test data for an entity
   */
  async generateTestData(
    entityType: string,
    fieldSpecs: FieldSpec[],
    options: {
      count?: number;
      scenario?: 'happy' | 'edge' | 'stress' | 'security';
      relationships?: Array<{ field: string; relatedEntity: string }>;
    } = {}
  ): Promise<DataGenerationResult> {
    const { count = 5, scenario = 'happy' } = options;

    console.log(`  🏭 Generating ${count} ${entityType} records (${scenario} scenario)...`);

    // Use AI to generate realistic data
    const result = await this.glm.generateProductionTestData({
      entityType,
      fieldSpecs,
      relationships: options.relationships,
      scenario,
    });

    console.log(`    ✅ Generated ${result.testData.length} records`);

    // Cache for relationships
    this.entityCache.set(entityType, result.testData);

    return {
      records: result.testData,
      validationRules: result.validationRules,
      variations: result.variations,
    };
  }

  /**
   * Generate WMS-specific order data
   */
  generateWMSOrder(
    overrides: Partial<GeneratedRecord> = {}
  ): GeneratedRecord {
    const statuses = ['pending', 'processing', 'picked', 'packed'];
    const carriers = ['CourierPost', 'NZ Post', 'DHL'];

    return {
      order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customer_id: `CUST-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: this.wmsKnowledge.priorities[Math.floor(Math.random() * this.wmsKnowledge.priorities.length)],
      total_amount: Math.round((Math.random() * 500 + 50) * 100) / 100,
      item_count: Math.floor(Math.random() * 10) + 1,
      carrier: carriers[Math.floor(Math.random() * carriers.length)],
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      shipping_address: this.generateAddress(),
      ...overrides,
    };
  }

  /**
   * Generate WMS SKU data
   */
  generateWMSSKU(
    overrides: Partial<GeneratedRecord> = {}
  ): GeneratedRecord {
    const categories = ['Electronics', 'Clothing', 'Food', 'Tools', 'Furniture'];
    const zones = this.wmsKnowledge.zones;

    const sku = `SKU-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    return {
      sku,
      name: `${categories[Math.floor(Math.random() * categories.length)]} Item ${Math.floor(Math.random() * 1000)}`,
      description: `Quality ${categories[Math.floor(Math.random() * categories.length)].toLowerCase()} product`,
      category: categories[Math.floor(Math.random() * categories.length)],
      default_location: `${zones[Math.floor(Math.random() * zones.length)]}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`,
      quantity_on_hand: Math.floor(Math.random() * 500),
      reorder_level: Math.floor(Math.random() * 50) + 10,
      unit_price: Math.round((Math.random() * 100 + 5) * 100) / 100,
      barcode: String(Math.floor(Math.random() * 1000000000000)),
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate WMS bin location data
   */
  generateWMSBinLocation(
    overrides: Partial<GeneratedRecord> = {}
  ): GeneratedRecord {
    const zones = this.wmsKnowledge.zones;
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const aisle = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
    const shelf = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');

    return {
      location_id: `${zone}-${aisle}-${shelf}`,
      zone,
      aisle: parseInt(aisle),
      shelf: parseInt(shelf),
      capacity: Math.floor(Math.random() * 100) + 10,
      current_quantity: Math.floor(Math.random() * 50),
      location_type: ['shelf', 'pallet', 'bin', 'floor'][Math.floor(Math.random() * 4)],
      temperature: ['ambient', 'refrigerated', 'frozen'][Math.floor(Math.random() * 3)],
      ...overrides,
    };
  }

  /**
   * Generate WMS user data
   */
  generateWMSUser(
    overrides: Partial<GeneratedRecord> = {}
  ): GeneratedRecord {
    const roles = ['PICKER', 'PACKER', 'ADMIN', 'SUPERVISOR', 'STOCK_CONTROLLER'];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Davies', 'Evans'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return {
      user_id: `USER-${Math.floor(Math.random() * 10000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@wms.local`,
      first_name: firstName,
      last_name: lastName,
      role: roles[Math.floor(Math.random() * roles.length)],
      active: Math.random() > 0.1, // 90% active
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate edge case test data
   */
  async generateEdgeCaseData(
    entityType: string,
    fieldSpecs: FieldSpec[]
  ): Promise<GeneratedRecord[]> {
    const edgeCases: GeneratedRecord[] = [];

    // Boundary values
    for (const field of fieldSpecs) {
      if (field.type === 'number') {
        edgeCases.push(
          this.generateRecordWithField(entityType, field, 'minimum'),
          this.generateRecordWithField(entityType, field, 'maximum'),
          this.generateRecordWithField(entityType, field, 'zero'),
          this.generateRecordWithField(entityType, field, 'negative')
        );
      } else if (field.type === 'string') {
        edgeCases.push(
          this.generateRecordWithField(entityType, field, 'empty'),
          this.generateRecordWithField(entityType, field, 'maximum_length'),
          this.generateRecordWithField(entityType, field, 'special_characters')
        );
      }
    }

    return edgeCases.filter(r => Object.keys(r).length > 0);
  }

  /**
   * Generate security test data
   */
  async generateSecurityData(
    entityType: string,
    fieldSpecs: FieldSpec[]
  ): Promise<GeneratedRecord[]> {
    const securityCases: GeneratedRecord[] = [];

    // XSS attempts
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      'javascript:alert("XSS")',
    ];

    // SQL injection attempts
    const sqlPayloads = [
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--",
      "1'; DROP TABLE users--",
    ];

    for (const field of fieldSpecs) {
      if (field.type === 'string') {
        for (const payload of xssPayloads.slice(0, 2)) {
          securityCases.push(this.generateRecordWithField(entityType, field, 'custom', payload));
        }
        for (const payload of sqlPayloads.slice(0, 2)) {
          securityCases.push(this.generateRecordWithField(entityType, field, 'custom', payload));
        }
      }
    }

    return securityCases;
  }

  /**
   * Generate record with specific field value
   */
  private generateRecordWithField(
    entityType: string,
    field: FieldSpec,
    scenario: string,
    customValue?: any
  ): GeneratedRecord {
    const record: GeneratedRecord = {};

    for (const spec of [field]) {
      switch (scenario) {
        case 'minimum':
          record[spec.name] = spec.type === 'number' ? 0 : '';
          break;
        case 'maximum':
          record[spec.name] = spec.type === 'number' ? 999999 : 'A'.repeat(255);
          break;
        case 'zero':
          record[spec.name] = 0;
          break;
        case 'negative':
          record[spec.name] = -1;
          break;
        case 'empty':
          record[spec.name] = '';
          break;
        case 'maximum_length':
          record[spec.name] = 'A'.repeat(1000);
          break;
        case 'special_characters':
          record[spec.name] = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
          break;
        case 'custom':
          record[spec.name] = customValue;
          break;
        default:
          record[spec.name] = this.getDefaultValue(spec.type);
      }
    }

    return record;
  }

  /**
   * Get default value for field type
   */
  private getDefaultValue(type: string): any {
    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
        return 'test value';
      case 'number':
      case 'integer':
        return 100;
      case 'boolean':
        return true;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'email':
        return 'test@example.com';
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Generate realistic address
   */
  private generateAddress(): string {
    const streetNumbers = Math.floor(Math.random() * 999) + 1;
    const streetNames = ['Main', 'Queen', 'King', 'High', 'Victoria', 'George', 'Albert'];
    const streetTypes = ['St', 'Ave', 'Rd', 'Lane', 'Crescent', 'Drive'];
    const suburbs = ['CBD', 'Newtown', 'Westside', 'Eastgate', 'Northpark', 'Southbay'];
    const cities = ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin'];

    return `${streetNumbers} ${streetNames[Math.floor(Math.random() * streetNames.length)]} ${streetTypes[Math.floor(Math.random() * streetTypes.length)]}, ${suburbs[Math.floor(Math.random() * suburbs.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;
  }

  /**
   * Get cached entity data for relationships
   */
  getCachedEntity(entityType: string): any[] | null {
    return this.entityCache.get(entityType) || null;
  }

  /**
   * Generate related record
   */
  async generateRelatedRecord(
    entityType: string,
    relationship: {
      field: string;
      relatedEntity: string;
    }
  ): Promise<GeneratedRecord> {
    const relatedData = this.getCachedEntity(relationship.relatedEntity);

    if (relatedData && relatedData.length > 0) {
      // Return existing related record
      return relatedData[Math.floor(Math.random() * relatedData.length)];
    }

    // Generate new related record
    const relatedSpecs = this.getSpecsForEntity(relationship.relatedEntity);
    const result = await this.generateTestData(relationship.relatedEntity, relatedSpecs, {
      count: 1,
    });

    return result.records[0];
  }

  /**
   * Get field specs for known entity types
   */
  private getSpecsForEntity(entityType: string): FieldSpec[] {
    const specs: Record<string, FieldSpec[]> = {
      order: [
        { name: 'order_id', type: 'string', required: true },
        { name: 'customer_id', type: 'string', required: true },
        { name: 'status', type: 'string', required: true, enum: this.wmsKnowledge.statuses },
        { name: 'total_amount', type: 'number', required: true },
        { name: 'item_count', type: 'number', required: true },
      ],
      sku: [
        { name: 'sku', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'quantity_on_hand', type: 'number', required: true },
        { name: 'unit_price', type: 'number', required: true },
        { name: 'barcode', type: 'string', required: true },
      ],
      user: [
        { name: 'user_id', type: 'string', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'first_name', type: 'string', required: true },
        { name: 'last_name', type: 'string', required: true },
        { name: 'role', type: 'string', required: true },
      ],
    };

    return specs[entityType] || [];
  }
}

export default SmartTestDataFactory;
