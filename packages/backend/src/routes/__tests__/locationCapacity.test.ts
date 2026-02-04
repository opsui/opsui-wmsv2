/**
 * Integration tests for location capacity routes
 * @covers src/routes/locationCapacity.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { locationCapacityService } from '../../services/LocationCapacityService';
import { UserRole, CapacityType, CapacityRuleStatus } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      baseRole: UserRole.ADMIN,
      effectiveRole: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../services/LocationCapacityService', () => ({
  locationCapacityService: {
    createCapacityRule: jest.fn().mockResolvedValue({
      ruleId: 'rule-001',
      ruleName: 'Test Rule',
      capacityType: 'VOLUME',
      maximumCapacity: 1000,
    }),
    getAllCapacityRules: jest.fn().mockResolvedValue([
      {
        ruleId: 'rule-001',
        ruleName: 'Test Rule',
        capacityType: 'VOLUME',
        maximumCapacity: 1000,
      },
    ]),
    getCapacityRule: jest.fn().mockResolvedValue({
      ruleId: 'rule-001',
      ruleName: 'Test Rule',
      capacityType: 'VOLUME',
      maximumCapacity: 1000,
    }),
    updateCapacityRule: jest.fn().mockResolvedValue({
      ruleId: 'rule-001',
      ruleName: 'Updated Rule',
      capacityType: 'VOLUME',
      maximumCapacity: 1500,
    }),
    deleteCapacityRule: jest.fn().mockResolvedValue(undefined),
    getLocationCapacity: jest.fn().mockResolvedValue({
      binLocation: 'A-01-01',
      currentCapacity: 500,
      maximumCapacity: 1000,
      utilizationPercent: 50,
    }),
    getAllLocationCapacities: jest.fn().mockResolvedValue({
      locations: [
        {
          binLocation: 'A-01-01',
          currentCapacity: 500,
          maximumCapacity: 1000,
          utilizationPercent: 50,
        },
      ],
      total: 1,
    }),
    recalculateLocationCapacity: jest.fn().mockResolvedValue({
      binLocation: 'A-01-01',
      currentCapacity: 500,
      maximumCapacity: 1000,
      utilizationPercent: 50,
    }),
    getAllCapacityAlerts: jest.fn().mockResolvedValue({
      alerts: [
        {
          alertId: 'alert-001',
          binLocation: 'A-01-01',
          alertType: 'WARNING',
          acknowledged: false,
        },
      ],
      total: 1,
    }),
    acknowledgeCapacityAlert: jest.fn().mockResolvedValue({
      alertId: 'alert-001',
      acknowledged: true,
      acknowledgedAt: '2024-01-01T10:00:00Z',
    }),
  },
}));

describe('Location Capacity Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /api/v1/location-capacity/rules
  // ==========================================================================

  describe('POST /api/v1/location-capacity/rules', () => {
    it('should create a capacity rule', async () => {
      const ruleData = {
        ruleName: 'Test Rule',
        capacityType: 'VOLUME',
        capacityUnit: 'CUBIC_METERS',
        appliesTo: 'ZONE',
        zone: 'A',
        maximumCapacity: 1000,
      };

      const response = await request(app)
        .post('/api/v1/location-capacity/rules')
        .set('Authorization', 'Bearer valid-token')
        .send(ruleData)
        .expect(201);

      expect(response.body).toHaveProperty('ruleId');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        ruleName: 'Incomplete Rule',
      };

      const response = await request(app)
        .post('/api/v1/location-capacity/rules')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
  });

  // ==========================================================================
  // GET /api/v1/location-capacity/rules
  // ==========================================================================

  describe('GET /api/v1/location-capacity/rules', () => {
    it('should get all capacity rules', async () => {
      const response = await request(app)
        .get('/api/v1/location-capacity/rules')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==========================================================================
  // GET /api/v1/location-capacity/rules/:ruleId
  // ==========================================================================

  describe('GET /api/v1/location-capacity/rules/:ruleId', () => {
    it('should get a capacity rule by ID', async () => {
      const response = await request(app)
        .get('/api/v1/location-capacity/rules/rule-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('ruleId', 'rule-001');
    });
  });

  // ==========================================================================
  // PATCH /api/v1/location-capacity/rules/:ruleId
  // ==========================================================================

  describe('PATCH /api/v1/location-capacity/rules/:ruleId', () => {
    it('should update a capacity rule', async () => {
      const updates = {
        ruleName: 'Updated Rule',
        maximumCapacity: 1500,
      };

      const response = await request(app)
        .patch('/api/v1/location-capacity/rules/rule-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('ruleName');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/location-capacity/rules/:ruleId
  // ==========================================================================

  describe('DELETE /api/v1/location-capacity/rules/:ruleId', () => {
    it('should delete a capacity rule', async () => {
      await request(app)
        .delete('/api/v1/location-capacity/rules/rule-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);
    });
  });

  // ==========================================================================
  // GET /api/v1/location-capacity/locations/:binLocation
  // ==========================================================================

  describe('GET /api/v1/location-capacity/locations/:binLocation', () => {
    it('should get location capacity', async () => {
      const response = await request(app)
        .get('/api/v1/location-capacity/locations/A-01-01')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('binLocation', 'A-01-01');
      expect(response.body).toHaveProperty('utilizationPercent', 50);
    });
  });

  // ==========================================================================
  // GET /api/v1/location-capacity/locations
  // ==========================================================================

  describe('GET /api/v1/location-capacity/locations', () => {
    it('should get all location capacities', async () => {
      const response = await request(app)
        .get('/api/v1/location-capacity/locations')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('locations');
      expect(response.body).toHaveProperty('total');
    });

    it('should apply filters', async () => {
      await request(app)
        .get('/api/v1/location-capacity/locations?capacityType=VOLUME&showAlertsOnly=true&limit=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(locationCapacityService.getAllLocationCapacities).toHaveBeenCalledWith({
        capacityType: 'VOLUME',
        status: undefined,
        showAlertsOnly: true,
        limit: 50,
        offset: 0,
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/location-capacity/locations/:binLocation/recalculate
  // ==========================================================================

  describe('POST /api/v1/location-capacity/locations/:binLocation/recalculate', () => {
    it('should recalculate location capacity', async () => {
      const response = await request(app)
        .post('/api/v1/location-capacity/locations/A-01-01/recalculate')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('binLocation');
    });
  });

  // ==========================================================================
  // GET /api/v1/location-capacity/alerts
  // ==========================================================================

  describe('GET /api/v1/location-capacity/alerts', () => {
    it('should get all capacity alerts', async () => {
      const response = await request(app)
        .get('/api/v1/location-capacity/alerts')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('total');
    });

    it('should apply filters', async () => {
      await request(app)
        .get('/api/v1/location-capacity/alerts?acknowledged=false&alertType=WARNING&limit=25')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(locationCapacityService.getAllCapacityAlerts).toHaveBeenCalledWith({
        acknowledged: false,
        alertType: 'WARNING',
        limit: 25,
        offset: 0,
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/location-capacity/alerts/:alertId/acknowledge
  // ==========================================================================

  describe('POST /api/v1/location-capacity/alerts/:alertId/acknowledge', () => {
    it('should acknowledge a capacity alert', async () => {
      const response = await request(app)
        .post('/api/v1/location-capacity/alerts/alert-001/acknowledge')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('alertId', 'alert-001');
      expect(response.body).toHaveProperty('acknowledged', true);
    });
  });
});
