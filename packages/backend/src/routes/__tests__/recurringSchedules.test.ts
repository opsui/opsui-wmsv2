/**
 * Integration tests for recurring schedules routes
 * @covers src/routes/recurringSchedules.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { recurringScheduleService } from '../../services/RecurringScheduleService';
import { UserRole } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../services/RecurringScheduleService', () => ({
  recurringScheduleService: {
    createRecurringSchedule: jest.fn().mockResolvedValue({
      scheduleId: 'schedule-001',
      scheduleName: 'Weekly Zone A Count',
      countType: 'WAVE',
      frequencyType: 'WEEKLY',
      frequencyInterval: 1,
      assignedTo: 'user-123',
      isActive: true,
      createdBy: 'user-123',
      createdAt: '2024-01-01T10:00:00Z',
    }),
    getAllSchedules: jest.fn().mockResolvedValue({
      schedules: [
        {
          scheduleId: 'schedule-001',
          scheduleName: 'Weekly Zone A Count',
          countType: 'WAVE',
          frequencyType: 'WEEKLY',
          isActive: true,
        },
      ],
      total: 1,
    }),
    getSchedule: jest.fn().mockResolvedValue({
      scheduleId: 'schedule-001',
      scheduleName: 'Weekly Zone A Count',
      countType: 'WAVE',
      frequencyType: 'WEEKLY',
    }),
    updateSchedule: jest.fn().mockResolvedValue({
      scheduleId: 'schedule-001',
      scheduleName: 'Updated Weekly Count',
      countType: 'WAVE',
      frequencyType: 'WEEKLY',
    }),
    deleteSchedule: jest.fn().mockResolvedValue(undefined),
    processDueSchedules: jest.fn().mockResolvedValue({
      processed: 5,
      generated: 3,
      failed: 2,
    }),
  },
}));

describe('Recurring Schedules Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /api/v1/cycle-count/schedules
  // ==========================================================================

  describe('POST /api/v1/cycle-count/schedules', () => {
    it('should create a recurring schedule', async () => {
      const scheduleData = {
        scheduleName: 'Weekly Zone A Count',
        countType: 'WAVE',
        frequencyType: 'WEEKLY',
        frequencyInterval: 1,
        location: 'A',
        assignedTo: 'user-123',
      };

      const response = await request(app)
        .post('/api/v1/cycle-count/schedules')
        .set('Authorization', 'Bearer valid-token')
        .send(scheduleData)
        .expect(201);

      expect(response.body).toHaveProperty('scheduleId');
      expect(response.body).toHaveProperty('scheduleName');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        scheduleName: 'Incomplete Schedule',
      };

      const response = await request(app)
        .post('/api/v1/cycle-count/schedules')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/schedules
  // ==========================================================================

  describe('GET /api/v1/cycle-count/schedules', () => {
    it('should get all recurring schedules', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/schedules')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('schedules');
      expect(response.body).toHaveProperty('total');
    });

    it('should apply filters', async () => {
      await request(app)
        .get(
          '/api/v1/cycle-count/schedules?isActive=true&assignedTo=user-123&frequencyType=WEEKLY&limit=10'
        )
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(recurringScheduleService.getAllSchedules).toHaveBeenCalledWith({
        isActive: true,
        assignedTo: 'user-123',
        frequencyType: 'WEEKLY',
        countType: undefined,
        limit: 10,
        offset: undefined,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/schedules/:scheduleId
  // ==========================================================================

  describe('GET /api/v1/cycle-count/schedules/:scheduleId', () => {
    it('should get a recurring schedule by ID', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/schedules/schedule-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('scheduleId', 'schedule-001');
    });
  });

  // ==========================================================================
  // PUT /api/v1/cycle-count/schedules/:scheduleId
  // ==========================================================================

  describe('PUT /api/v1/cycle-count/schedules/:scheduleId', () => {
    it('should update a recurring schedule', async () => {
      const updates = {
        scheduleName: 'Updated Weekly Count',
        isActive: false,
      };

      const response = await request(app)
        .put('/api/v1/cycle-count/schedules/schedule-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('scheduleName');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/cycle-count/schedules/:scheduleId
  // ==========================================================================

  describe('DELETE /api/v1/cycle-count/schedules/:scheduleId', () => {
    it('should delete a recurring schedule', async () => {
      await request(app)
        .delete('/api/v1/cycle-count/schedules/schedule-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);
    });
  });

  // ==========================================================================
  // POST /api/v1/cycle-count/schedules/process
  // ==========================================================================

  describe('POST /api/v1/cycle-count/schedules/process', () => {
    it('should process due schedules', async () => {
      const response = await request(app)
        .post('/api/v1/cycle-count/schedules/process')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('generated');
      expect(response.body).toHaveProperty('failed');
    });
  });
});
