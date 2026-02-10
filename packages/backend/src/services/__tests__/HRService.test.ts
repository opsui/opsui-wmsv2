/**
 * Unit tests for HRService
 * @covers src/services/HRService.ts
 */

import { hrService } from '../HRService';
import { hrRepository } from '../../repositories/HRRepository';
import {
  HREmployee,
  HREmployeeWithDetails,
  HRTimesheet,
  HRTimesheetEntry,
  HRTimesheetStatus,
  HRWorkType,
  HREmploymentType,
  HRNZTaxCode,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  SubmitTimesheetInput,
  NotFoundError,
} from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/HRRepository', () => ({
  hrRepository: {
    employees: {
      findAll: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      search: jest.fn(),
      softDelete: jest.fn(),
      rawQueryOne: jest.fn(),
    },
    timesheets: {
      findById: jest.fn(),
      findWithEntries: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByStatus: jest.fn(),
      findByEmployeeAndPeriod: jest.fn(),
      findByPeriod: jest.fn(),
      updateStatus: jest.fn(),
      update: jest.fn(),
    },
    payrollPeriods: {
      findById: jest.fn(),
    },
    payrollRuns: {
      findAll: jest.fn(),
      getNextRunNumber: jest.fn(),
    },
    payItems: {
      findByPayrollRunId: jest.fn(),
    },
    taxTables: {
      findByTaxCode: jest.fn(),
    },
    employeeDeductions: {
      findByEmployeeId: jest.fn(),
    },
    deductionTypes: {
      findActive: jest.fn(),
    },
    leaveTypes: {
      findActive: jest.fn(),
    },
    leaveRequests: {
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findByEmployeeId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    },
    leaveBalances: {
      findByEmployeeId: jest.fn(),
    },
    withTransaction: jest.fn(),
  },
}));

describe('HRService', () => {
  // Helper to create mock employee
  const createMockEmployee = (overrides: any = {}): HREmployee => ({
    employeeId: 'EMP-001',
    userId: 'USER-001',
    firstName: 'John',
    lastName: 'Doe',
    preferredName: 'Johnny',
    email: 'john.doe@example.com',
    phone: '+64-4-123-4567',
    mobile: '+64-21-123-4567',
    employeeNumber: 'E001',
    status: 'ACTIVE' as any,
    hireDate: new Date('2020-01-15'),
    createdBy: 'admin',
    createdAt: new Date('2020-01-15'),
    dateOfBirth: null,
    gender: null,
    nationalId: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    country: 'NEW ZEALAND',
    terminationDate: null,
    terminationReason: null,
    updatedAt: new Date('2020-01-15'),
    deletedAt: null,
    ...overrides,
  });

  // Helper to create mock employee with details
  const createMockEmployeeWithDetails = (overrides: any = {}): HREmployeeWithDetails => ({
    ...createMockEmployee(),
    taxDetails: {
      taxDetailId: 'TX-001',
      employeeId: 'EMP-001',
      irdNumber: '123456789',
      taxCode: 'M' as any,
      taxCodeEffectiveDate: null,
      specialTaxRate: null,
      hasStudentLoan: false,
      studentLoanPlan: null,
      secondaryTaxCode: null,
      createdAt: new Date('2020-01-15'),
      updatedAt: new Date('2020-01-15'),
    },
    employments: [],
    bankAccounts: [],
    ...overrides,
  });

  // Helper to create mock timesheet
  const createMockTimesheet = (overrides: any = {}): HRTimesheet => ({
    timesheetId: 'TS-001',
    employeeId: 'EMP-001',
    periodStartDate: new Date('2024-01-01'),
    periodEndDate: new Date('2024-01-14'),
    status: 'DRAFT' as any,
    totalRegularHours: 80,
    totalOvertimeHours: 0,
    submittedAt: undefined,
    submittedBy: undefined,
    approvedBy: undefined,
    approvedAt: undefined,
    ...overrides,
  });

  // Helper to create mock timesheet entry
  const createMockTimesheetEntry = (overrides: any = {}): HRTimesheetEntry => ({
    entryId: 'TSE-001',
    timesheetId: 'TS-001',
    workDate: new Date('2024-01-01'),
    workType: 'REGULAR' as any,
    hoursWorked: 8,
    description: 'Regular work',
    taskType: 'PICKING',
    breakHours: 0,
    orderId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (hrRepository.employees.rawQueryOne as jest.Mock).mockResolvedValue(null);
  });

  // ==========================================================================
  // EMPLOYEE MANAGEMENT
  // ==========================================================================

  describe('getEmployees', () => {
    it('should return all employees', async () => {
      const mockEmployees = [
        createMockEmployee({ employeeId: 'EMP-001' }),
        createMockEmployee({ employeeId: 'EMP-002' }),
      ];
      (hrRepository.employees.findAll as jest.Mock).mockResolvedValue(mockEmployees);

      const result = await hrService.getEmployees();

      expect(result).toHaveLength(2);
      expect(hrRepository.employees.findAll).toHaveBeenCalledWith({
        orderBy: 'last_name, first_name',
      });
    });

    it('should filter by status', async () => {
      const mockEmployees = [createMockEmployee()];
      (hrRepository.employees.findActive as jest.Mock).mockResolvedValue(mockEmployees);

      const result = await hrService.getEmployees({ status: 'ACTIVE' });

      expect(result).toHaveLength(1);
      expect(hrRepository.employees.findActive).toHaveBeenCalled();
    });

    it('should search by name', async () => {
      const mockEmployees = [createMockEmployee()];
      (hrRepository.employees.search as jest.Mock).mockResolvedValue(mockEmployees);

      const result = await hrService.getEmployees({ search: 'John' });

      expect(result).toHaveLength(1);
      expect(hrRepository.employees.search).toHaveBeenCalledWith('John');
    });

    it('should filter by department', async () => {
      const mockEmployees = [createMockEmployee()];
      (hrRepository.employees.findAll as jest.Mock).mockResolvedValue(mockEmployees);

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [{ employee_id: 'EMP-001' }] }),
        };
        return await callback(mockClient);
      });

      const result = await hrService.getEmployees({ department: 'Warehouse' });

      expect(result).toHaveLength(1);
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee with details', async () => {
      const mockEmployee = createMockEmployeeWithDetails();
      (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await hrService.getEmployeeById('EMP-001');

      expect(result).toEqual(mockEmployee);
      expect(hrRepository.employees.findByIdWithDetails).toHaveBeenCalledWith('EMP-001');
    });

    it('should throw NotFoundError when employee not found', async () => {
      (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(null);

      await expect(hrService.getEmployeeById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createEmployee', () => {
    it('should create a new employee', async () => {
      const data: CreateEmployeeInput = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        hireDate: '2024-01-15',
      };

      const mockEmployee = createMockEmployeeWithDetails({
        firstName: 'Jane',
        lastName: 'Smith',
      });

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockEmployee] }),
        };
        (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(mockEmployee);
        return await callback(mockClient);
      });

      const result = await hrService.createEmployee(data, 'admin');

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should create employee with tax details', async () => {
      const data: CreateEmployeeInput = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        hireDate: '2024-01-15',
        taxDetails: {
          irdNumber: '987654321',
          taxCode: 'M' as any,
          hasStudentLoan: true,
        },
      };

      const mockEmployee = createMockEmployeeWithDetails({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      });

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockEmployee] }),
        };
        (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(mockEmployee);
        return await callback(mockClient);
      });

      const result = await hrService.createEmployee(data, 'admin');

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should create employee with employment details', async () => {
      const data: CreateEmployeeInput = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        hireDate: '2024-01-15',
        employment: {
          positionTitle: 'Warehouse Worker',
          employmentType: 'FULL_TIME' as any,
          department: 'Warehouse',
          payType: 'HOURLY',
          hourlyRate: 25,
          standardHoursPerWeek: 40,
        },
      };

      const mockEmployee = createMockEmployeeWithDetails({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      });

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockEmployee] }),
        };
        (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(mockEmployee);
        return await callback(mockClient);
      });

      const result = await hrService.createEmployee(data, 'admin');

      expect(result.firstName).toBe('Jane');
    });

    it('should create employee with bank account', async () => {
      const data: CreateEmployeeInput = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        hireDate: '2024-01-15',
        bankAccount: {
          bankName: 'ANZ',
          accountNumber: '1234567890',
          accountType: 'CHECKING',
        },
      };

      const mockEmployee = createMockEmployeeWithDetails({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      });

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockEmployee] }),
        };
        (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(mockEmployee);
        return await callback(mockClient);
      });

      const result = await hrService.createEmployee(data, 'admin');

      expect(result.firstName).toBe('Jane');
    });
  });

  describe('updateEmployee', () => {
    it('should update an existing employee', async () => {
      const existingEmployee = createMockEmployee();
      const updatedEmployee = createMockEmployeeWithDetails({ firstName: 'Jane' });

      (hrRepository.employees.findById as jest.Mock).mockResolvedValue(existingEmployee);

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [updatedEmployee] }),
        };
        (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(
          updatedEmployee
        );
        return await callback(mockClient);
      });

      const result = await hrService.updateEmployee('EMP-001', {
        firstName: 'Jane',
      });

      expect(result.firstName).toBe('Jane');
    });

    it('should throw NotFoundError when updating non-existent employee', async () => {
      (hrRepository.employees.findById as jest.Mock).mockResolvedValue(null);

      await expect(hrService.updateEmployee('NONEXISTENT', { firstName: 'Jane' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should update employee tax details', async () => {
      const existingEmployee = createMockEmployee();
      const updatedEmployee = createMockEmployeeWithDetails();

      (hrRepository.employees.findById as jest.Mock).mockResolvedValue(existingEmployee);

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [updatedEmployee] }),
        };
        (hrRepository.employees.findByIdWithDetails as jest.Mock).mockResolvedValue(
          updatedEmployee
        );
        return await callback(mockClient);
      });

      await hrService.updateEmployee('EMP-001', {
        taxDetails: {
          irdNumber: '999999999',
          taxCode: 'M' as any,
          hasStudentLoan: false,
        },
      });

      expect(hrRepository.withTransaction).toHaveBeenCalled();
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete an employee', async () => {
      (hrRepository.employees.softDelete as jest.Mock).mockResolvedValue(true);

      const result = await hrService.deleteEmployee('EMP-001');

      expect(result).toBe(true);
      expect(hrRepository.employees.softDelete).toHaveBeenCalledWith('EMP-001');
    });
  });

  // ==========================================================================
  // TIMESHEET MANAGEMENT
  // ==========================================================================

  describe('getTimesheet', () => {
    it('should return timesheet with entries', async () => {
      const mockTimesheet = createMockTimesheet();
      const mockEntries = [createMockTimesheetEntry()];
      const mockTimesheetWithEntries = { ...mockTimesheet, entries: mockEntries };

      (hrRepository.timesheets.findWithEntries as jest.Mock).mockResolvedValue(
        mockTimesheetWithEntries
      );

      const result = await hrService.getTimesheet('TS-001');

      expect(result.timesheetId).toBe('TS-001');
      expect(result.entries).toHaveLength(1);
    });

    it('should throw NotFoundError when timesheet not found', async () => {
      (hrRepository.timesheets.findWithEntries as jest.Mock).mockResolvedValue(null);

      await expect(hrService.getTimesheet('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEmployeeTimesheets', () => {
    it('should return timesheets for an employee', async () => {
      const mockTimesheets = [
        createMockTimesheet({ timesheetId: 'TS-001' }),
        createMockTimesheet({ timesheetId: 'TS-002' }),
      ];
      (hrRepository.timesheets.findByEmployeeId as jest.Mock).mockResolvedValue(mockTimesheets);

      const result = await hrService.getEmployeeTimesheets('EMP-001');

      expect(result).toHaveLength(2);
      expect(hrRepository.timesheets.findByEmployeeId).toHaveBeenCalledWith('EMP-001', 10);
    });

    it('should use custom limit', async () => {
      const mockTimesheets = [createMockTimesheet()];
      (hrRepository.timesheets.findByEmployeeId as jest.Mock).mockResolvedValue(mockTimesheets);

      await hrService.getEmployeeTimesheets('EMP-001', 20);

      expect(hrRepository.timesheets.findByEmployeeId).toHaveBeenCalledWith('EMP-001', 20);
    });
  });

  describe('getTimesheetsByStatus', () => {
    it('should return timesheets by status', async () => {
      const mockTimesheets = [createMockTimesheet({ status: 'SUBMITTED' as any })];
      (hrRepository.timesheets.findByStatus as jest.Mock).mockResolvedValue(mockTimesheets);

      const result = await hrService.getTimesheetsByStatus('SUBMITTED' as any);

      expect(result).toHaveLength(1);
      expect(hrRepository.timesheets.findByStatus).toHaveBeenCalledWith('SUBMITTED');
    });
  });

  describe('submitTimesheet', () => {
    it('should submit a new timesheet', async () => {
      const data: SubmitTimesheetInput = {
        employeeId: 'EMP-001',
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-01-14',
        entries: [
          {
            workDate: '2024-01-01',
            workType: 'REGULAR' as any,
            hoursWorked: 8,
            description: 'Regular work',
          },
        ],
      };

      const mockTimesheet = createMockTimesheet({
        status: 'SUBMITTED' as any,
        totalRegularHours: 8,
      });

      (hrRepository.timesheets.findByEmployeeAndPeriod as jest.Mock).mockResolvedValue(null);

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockTimesheet] }),
        };
        (hrRepository.timesheets.findById as jest.Mock).mockResolvedValue(mockTimesheet);
        return await callback(mockClient);
      });

      const result = await hrService.submitTimesheet(data, 'USER-001');

      expect(result.status).toBe('SUBMITTED');
      expect(result.totalRegularHours).toBe(8);
    });

    it('should update existing timesheet', async () => {
      const existingTimesheet = createMockTimesheet({ timesheetId: 'TS-EXISTING' });

      const data: SubmitTimesheetInput = {
        employeeId: 'EMP-001',
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-01-14',
        entries: [
          {
            workDate: '2024-01-01',
            workType: 'REGULAR' as any,
            hoursWorked: 10,
          },
        ],
      };

      const mockTimesheet = createMockTimesheet({
        timesheetId: 'TS-EXISTING',
        status: 'SUBMITTED' as any,
        totalRegularHours: 10,
      });

      (hrRepository.timesheets.findByEmployeeAndPeriod as jest.Mock).mockResolvedValue(
        existingTimesheet
      );

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockTimesheet] }),
        };
        (hrRepository.timesheets.findById as jest.Mock).mockResolvedValue(mockTimesheet);
        return await callback(mockClient);
      });

      const result = await hrService.submitTimesheet(data, 'USER-001');

      expect(result.timesheetId).toBe('TS-EXISTING');
      expect(hrRepository.withTransaction).toHaveBeenCalled();
    });

    it('should calculate overtime hours separately', async () => {
      const data: SubmitTimesheetInput = {
        employeeId: 'EMP-001',
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-01-14',
        entries: [
          {
            workDate: '2024-01-01',
            workType: 'REGULAR' as any,
            hoursWorked: 40,
          },
          {
            workDate: '2024-01-06',
            workType: 'OVERTIME_1_5' as any,
            hoursWorked: 5,
          },
        ],
      };

      const mockTimesheet = createMockTimesheet({
        status: 'SUBMITTED' as any,
        totalRegularHours: 40,
        totalOvertimeHours: 5,
      });

      (hrRepository.timesheets.findByEmployeeAndPeriod as jest.Mock).mockResolvedValue(null);

      (hrRepository.withTransaction as jest.Mock).mockImplementation(async callback => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockTimesheet] }),
        };
        (hrRepository.timesheets.findById as jest.Mock).mockResolvedValue(mockTimesheet);
        return await callback(mockClient);
      });

      const result = await hrService.submitTimesheet(data, 'USER-001');

      expect(result.totalRegularHours).toBe(40);
      expect(result.totalOvertimeHours).toBe(5);
    });
  });

  describe('approveTimesheet', () => {
    it('should approve a timesheet', async () => {
      const mockTimesheet = createMockTimesheet({
        status: 'SUBMITTED' as any,
      });

      const approvedTimesheet = createMockTimesheet({
        status: 'APPROVED' as any,
        approvedBy: 'ADMIN-001',
        approvedAt: new Date(),
      });

      (hrRepository.timesheets.findById as jest.Mock).mockResolvedValue(mockTimesheet);
      (hrRepository.timesheets.updateStatus as jest.Mock).mockResolvedValue(approvedTimesheet);

      const result = await hrService.approveTimesheet('TS-001', 'ADMIN-001');

      expect(result.status).toBe('APPROVED');
      expect(hrRepository.timesheets.updateStatus).toHaveBeenCalledWith(
        'TS-001',
        'APPROVED',
        'ADMIN-001'
      );
    });

    it('should throw NotFoundError when timesheet not found', async () => {
      (hrRepository.timesheets.findById as jest.Mock).mockResolvedValue(null);

      await expect(hrService.approveTimesheet('NONEXISTENT', 'ADMIN-001')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('rejectTimesheet', () => {
    it('should reject a timesheet with reason', async () => {
      const mockTimesheet = createMockTimesheet({
        status: 'SUBMITTED' as any,
      });

      const rejectedTimesheet = createMockTimesheet({
        status: 'REJECTED' as any,
        rejectionReason: 'Incorrect hours',
        approvedBy: 'ADMIN-001',
      });

      (hrRepository.timesheets.findById as jest.Mock)
        .mockResolvedValueOnce(mockTimesheet)
        .mockResolvedValueOnce(rejectedTimesheet);

      (hrRepository.timesheets.update as jest.Mock).mockResolvedValue(rejectedTimesheet);

      const result = await hrService.rejectTimesheet('TS-001', 'Incorrect hours', 'ADMIN-001');

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Incorrect hours');
    });

    it('should throw NotFoundError when timesheet not found', async () => {
      (hrRepository.timesheets.findById as jest.Mock).mockResolvedValue(null);

      await expect(hrService.rejectTimesheet('NONEXISTENT', 'Reason', 'ADMIN-001')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
