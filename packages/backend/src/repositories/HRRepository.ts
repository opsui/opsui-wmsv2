/**
 * HR Repository
 *
 * Data access layer for HR & Payroll operations
 * Handles employee records, timesheets, payroll runs, and leave management
 */

import { query, transaction, type PoolClient } from '../db/client';
import { BaseRepository } from './BaseRepository';
import type {
  HREmployee,
  HREmployeeTaxDetails,
  HREmployment,
  HRBankAccount,
  HRTimesheet,
  HRTimesheetEntry,
  HRPayrollPeriod,
  HRPayrollRun,
  HRPayItem,
  HRDeductionType,
  HREmployeeDeduction,
  HRLeaveType,
  HRLeaveBalance,
  HRLeaveRequest,
  HRTaxTable,
  HREmployeeWithDetails,
  HRTimesheetWithEntries,
} from '@opsui/shared';

// ============================================================================
// EMPLOYEE REPOSITORY
// ============================================================================

export class EmployeeRepository extends BaseRepository<HREmployee> {
  constructor() {
    super('hr_employees', 'employee_id');
  }

  // Find by email
  async findByEmail(email: string): Promise<HREmployee | null> {
    const result = await query<HREmployee>(
      `SELECT * FROM ${this.tableName} WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0] || null;
  }

  // Find with all details (tax, employments, bank accounts)
  async findByIdWithDetails(employeeId: string): Promise<HREmployeeWithDetails | null> {
    const employee = await this.findById(employeeId);
    if (!employee) return null;

    const [taxDetails, employments, bankAccounts] = await Promise.all([
      query<HREmployeeTaxDetails>('SELECT * FROM hr_employee_tax_details WHERE employee_id = $1', [
        employeeId,
      ]),
      query<HREmployment>('SELECT * FROM hr_employments WHERE employee_id = $1', [employeeId]),
      query<HRBankAccount>('SELECT * FROM hr_bank_accounts WHERE employee_id = $1', [employeeId]),
    ]);

    return {
      ...employee,
      taxDetails: taxDetails.rows[0] || undefined,
      employments: employments.rows,
      bankAccounts: bankAccounts.rows,
      primaryEmployment: employments.rows.find(e => e.isPrimary) || employments.rows[0],
      primaryBankAccount: bankAccounts.rows.find(b => b.isPrimary) || bankAccounts.rows[0],
    };
  }

  // Find all active employees
  async findActive(): Promise<HREmployee[]> {
    const result = await query<HREmployee>(
      `SELECT * FROM ${this.tableName} WHERE status = 'ACTIVE' AND deleted_at IS NULL ORDER BY last_name, first_name`
    );
    return result.rows;
  }

  // Soft delete
  async softDelete(employeeId: string): Promise<boolean> {
    const result = await query(
      `UPDATE ${this.tableName} SET status = 'TERMINATED', deleted_at = NOW() WHERE ${this.primaryKey} = $1`,
      [employeeId]
    );
    return (result.rowCount || 0) > 0;
  }

  // Restore
  async restore(employeeId: string): Promise<boolean> {
    const result = await query(
      `UPDATE ${this.tableName} SET status = 'ACTIVE', deleted_at = NULL WHERE ${this.primaryKey} = $1`,
      [employeeId]
    );
    return (result.rowCount || 0) > 0;
  }

  // Search employees
  async search(searchTerm: string, limit = 20): Promise<HREmployee[]> {
    const result = await query<HREmployee>(
      `SELECT * FROM ${this.tableName}
       WHERE deleted_at IS NULL
       AND (
         first_name ILIKE $1 OR
         last_name ILIKE $1 OR
         email ILIKE $1 OR
         employee_number ILIKE $1
       )
       ORDER BY last_name, first_name
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );
    return result.rows;
  }
}

// ============================================================================
// TAX DETAILS REPOSITORY
// ============================================================================

export class EmployeeTaxDetailsRepository extends BaseRepository<HREmployeeTaxDetails> {
  constructor() {
    super('hr_employee_tax_details', 'tax_detail_id');
  }

  async findByEmployeeId(employeeId: string): Promise<HREmployeeTaxDetails | null> {
    const result = await query<HREmployeeTaxDetails>(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1`,
      [employeeId]
    );
    return result.rows[0] || null;
  }

  async upsert(
    employeeId: string,
    data: Partial<HREmployeeTaxDetails>
  ): Promise<HREmployeeTaxDetails> {
    const existing = await this.findByEmployeeId(employeeId);

    if (existing) {
      return (await this.update(existing.taxDetailId, data)) as HREmployeeTaxDetails;
    } else {
      return await this.insert({ ...data, employeeId } as HREmployeeTaxDetails);
    }
  }
}

// ============================================================================
// EMPLOYMENT REPOSITORY
// ============================================================================

export class EmploymentRepository extends BaseRepository<HREmployment> {
  constructor() {
    super('hr_employments', 'employment_id');
  }

  async findByEmployeeId(employeeId: string): Promise<HREmployment[]> {
    const result = await query<HREmployment>(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 ORDER BY start_date DESC`,
      [employeeId]
    );
    return result.rows;
  }

  async findPrimaryByEmployeeId(employeeId: string): Promise<HREmployment | null> {
    const result = await query<HREmployment>(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 AND is_primary = true AND status = 'ACTIVE'`,
      [employeeId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// BANK ACCOUNT REPOSITORY
// ============================================================================

export class BankAccountRepository extends BaseRepository<HRBankAccount> {
  constructor() {
    super('hr_bank_accounts', 'bank_account_id');
  }

  async findByEmployeeId(employeeId: string): Promise<HRBankAccount[]> {
    const result = await query<HRBankAccount>(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 ORDER BY is_primary DESC`,
      [employeeId]
    );
    return result.rows;
  }

  async findPrimaryByEmployeeId(employeeId: string): Promise<HRBankAccount | null> {
    const result = await query<HRBankAccount>(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 AND is_primary = true`,
      [employeeId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// TIMESHEET REPOSITORY
// ============================================================================

export class TimesheetRepository extends BaseRepository<HRTimesheet> {
  constructor() {
    super('hr_timesheets', 'timesheet_id');
  }

  async findByEmployeeId(employeeId: string, limit = 10): Promise<HRTimesheet[]> {
    const result = await query<HRTimesheet>(
      `SELECT * FROM ${this.tableName}
       WHERE employee_id = $1
       ORDER BY period_start_date DESC
       LIMIT $2`,
      [employeeId, limit]
    );
    return result.rows;
  }

  async findByPeriod(startDate: string, endDate: string): Promise<HRTimesheet[]> {
    const result = await query<HRTimesheet>(
      `SELECT * FROM ${this.tableName}
       WHERE period_start_date = $1 AND period_end_date = $2
       ORDER BY employee_id`,
      [startDate, endDate]
    );
    return result.rows;
  }

  async findByEmployeeAndPeriod(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<HRTimesheet | null> {
    const result = await query<HRTimesheet>(
      `SELECT * FROM ${this.tableName}
       WHERE employee_id = $1 AND period_start_date = $2 AND period_end_date = $3`,
      [employeeId, startDate, endDate]
    );
    return result.rows[0] || null;
  }

  async findWithEntries(timesheetId: string): Promise<HRTimesheetWithEntries | null> {
    const timesheet = await this.findById(timesheetId);
    if (!timesheet) return null;

    const entries = await query<HRTimesheetEntry>(
      `SELECT * FROM hr_timesheet_entries WHERE timesheet_id = $1 ORDER BY work_date`,
      [timesheetId]
    );

    return {
      ...timesheet,
      entries: entries.rows,
    };
  }

  async findByStatus(status: string): Promise<HRTimesheet[]> {
    const result = await query<HRTimesheet>(
      `SELECT * FROM ${this.tableName} WHERE status = $1 ORDER BY period_start_date DESC`,
      [status]
    );
    return result.rows;
  }

  async updateStatus(
    timesheetId: string,
    status: string,
    userId?: string
  ): Promise<HRTimesheet | null> {
    const updates: Partial<HRTimesheet> = { status } as any;

    if (status === 'SUBMITTED') {
      (updates as any).submittedAt = new Date();
      (updates as any).submittedBy = userId;
    } else if (status === 'APPROVED') {
      (updates as any).approvedAt = new Date();
      (updates as any).approvedBy = userId;
    }

    return await this.update(timesheetId, updates);
  }
}

// ============================================================================
// TIMESHEET ENTRY REPOSITORY
// ============================================================================

export class TimesheetEntryRepository extends BaseRepository<HRTimesheetEntry> {
  constructor() {
    super('hr_timesheet_entries', 'entry_id');
  }

  async findByTimesheetId(timesheetId: string): Promise<HRTimesheetEntry[]> {
    const result = await query<HRTimesheetEntry>(
      `SELECT * FROM ${this.tableName} WHERE timesheet_id = $1 ORDER BY work_date`,
      [timesheetId]
    );
    return result.rows;
  }

  async deleteByTimesheetId(timesheetId: string, client?: PoolClient): Promise<number> {
    const result = client
      ? await client.query(`DELETE FROM ${this.tableName} WHERE timesheet_id = $1`, [timesheetId])
      : await query(`DELETE FROM ${this.tableName} WHERE timesheet_id = $1`, [timesheetId]);

    return result.rowCount || 0;
  }
}

// ============================================================================
// PAYROLL PERIOD REPOSITORY
// ============================================================================

export class PayrollPeriodRepository extends BaseRepository<HRPayrollPeriod> {
  constructor() {
    super('hr_payroll_periods', 'period_id');
  }

  async findActive(): Promise<HRPayrollPeriod[]> {
    const result = await query<HRPayrollPeriod>(
      `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY period_start_date DESC`
    );
    return result.rows;
  }

  async findCurrentPeriod(): Promise<HRPayrollPeriod | null> {
    const result = await query<HRPayrollPeriod>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = true
       AND period_start_date <= CURRENT_DATE
       AND period_end_date >= CURRENT_DATE
       LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async findNextPeriod(): Promise<HRPayrollPeriod | null> {
    const result = await query<HRPayrollPeriod>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = true
       AND period_start_date > CURRENT_DATE
       AND payroll_run_id IS NULL
       ORDER BY period_start_date
       LIMIT 1`
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// PAYROLL RUN REPOSITORY
// ============================================================================

export class PayrollRunRepository extends BaseRepository<HRPayrollRun> {
  constructor() {
    super('hr_payroll_runs', 'payroll_run_id');
  }

  async findByPeriodId(periodId: string): Promise<HRPayrollRun[]> {
    const result = await query<HRPayrollRun>(
      `SELECT * FROM ${this.tableName} WHERE period_id = $1 ORDER BY run_number DESC`,
      [periodId]
    );
    return result.rows;
  }

  async findLatest(): Promise<HRPayrollRun | null> {
    const result = await query<HRPayrollRun>(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async findByStatus(status: string): Promise<HRPayrollRun[]> {
    const result = await query<HRPayrollRun>(
      `SELECT * FROM ${this.tableName} WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    );
    return result.rows;
  }

  async getNextRunNumber(periodId: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE period_id = $1`,
      [periodId]
    );
    return parseInt(result.rows[0].count, 10) + 1;
  }
}

// ============================================================================
// PAY ITEM REPOSITORY
// ============================================================================

export class PayItemRepository extends BaseRepository<HRPayItem> {
  constructor() {
    super('hr_pay_items', 'pay_item_id');
  }

  async findByPayrollRunId(payrollRunId: string): Promise<HRPayItem[]> {
    const result = await query<HRPayItem>(
      `SELECT * FROM ${this.tableName} WHERE payroll_run_id = $1 ORDER BY employee_id`,
      [payrollRunId]
    );
    return result.rows;
  }

  async findByEmployeeId(employeeId: string, limit = 10): Promise<HRPayItem[]> {
    const result = await query<HRPayItem>(
      `SELECT pi.* FROM ${this.tableName} pi
       JOIN hr_payroll_runs pr ON pr.payroll_run_id = pi.payroll_run_id
       WHERE pi.employee_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2`,
      [employeeId, limit]
    );
    return result.rows;
  }

  async deleteByPayrollRunId(payrollRunId: string, client?: PoolClient): Promise<number> {
    const result = client
      ? await client.query(`DELETE FROM ${this.tableName} WHERE payroll_run_id = $1`, [
          payrollRunId,
        ])
      : await query(`DELETE FROM ${this.tableName} WHERE payroll_run_id = $1`, [payrollRunId]);

    return result.rowCount || 0;
  }
}

// ============================================================================
// LEAVE REQUEST REPOSITORY
// ============================================================================

export class LeaveRequestRepository extends BaseRepository<HRLeaveRequest> {
  constructor() {
    super('hr_leave_requests', 'request_id');
  }

  async findByEmployeeId(employeeId: string): Promise<HRLeaveRequest[]> {
    const result = await query<HRLeaveRequest>(
      `SELECT * FROM ${this.tableName}
       WHERE employee_id = $1
       ORDER BY created_at DESC`,
      [employeeId]
    );
    return result.rows;
  }

  async findByStatus(status: string): Promise<HRLeaveRequest[]> {
    const result = await query<HRLeaveRequest>(
      `SELECT * FROM ${this.tableName}
       WHERE status = $1
       ORDER BY start_date ASC`,
      [status]
    );
    return result.rows;
  }

  async findByDateRange(startDate: string, endDate: string): Promise<HRLeaveRequest[]> {
    const result = await query<HRLeaveRequest>(
      `SELECT * FROM ${this.tableName}
       WHERE status IN ('APPROVED', 'PENDING')
       AND (
         (start_date <= $1 AND end_date >= $1) OR
         (start_date <= $2 AND end_date >= $2) OR
         (start_date >= $1 AND end_date <= $2)
       )
       ORDER BY start_date`,
      [startDate, endDate]
    );
    return result.rows;
  }
}

// ============================================================================
// LEAVE BALANCE REPOSITORY
// ============================================================================

export class LeaveBalanceRepository extends BaseRepository<HRLeaveBalance> {
  constructor() {
    super('hr_leave_balances', 'balance_id');
  }

  async findByEmployeeId(employeeId: string): Promise<HRLeaveBalance[]> {
    const result = await query<HRLeaveBalance>(
      `SELECT * FROM ${this.tableName}
       WHERE employee_id = $1
       ORDER BY effective_date DESC`,
      [employeeId]
    );
    return result.rows;
  }

  async findByEmployeeAndLeaveType(
    employeeId: string,
    leaveTypeId: string
  ): Promise<HRLeaveBalance[]> {
    const result = await query<HRLeaveBalance>(
      `SELECT * FROM ${this.tableName}
       WHERE employee_id = $1 AND leave_type_id = $2
       ORDER BY effective_date DESC`,
      [employeeId, leaveTypeId]
    );
    return result.rows;
  }

  async findCurrentBalance(
    employeeId: string,
    leaveTypeId: string
  ): Promise<HRLeaveBalance | null> {
    const result = await query<HRLeaveBalance>(
      `SELECT * FROM ${this.tableName}
       WHERE employee_id = $1 AND leave_type_id = $2
       ORDER BY effective_date DESC
       LIMIT 1`,
      [employeeId, leaveTypeId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// DEDUCTION TYPE REPOSITORY
// ============================================================================

export class DeductionTypeRepository extends BaseRepository<HRDeductionType> {
  constructor() {
    super('hr_deduction_types', 'deduction_type_id');
  }

  async findActive(): Promise<HRDeductionType[]> {
    const result = await query<HRDeductionType>(
      `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY code`
    );
    return result.rows;
  }

  async findByCode(code: string): Promise<HRDeductionType | null> {
    const result = await query<HRDeductionType>(`SELECT * FROM ${this.tableName} WHERE code = $1`, [
      code,
    ]);
    return result.rows[0] || null;
  }

  async findByCategory(category: string): Promise<HRDeductionType[]> {
    const result = await query<HRDeductionType>(
      `SELECT * FROM ${this.tableName} WHERE category = $1 AND is_active = true ORDER BY code`,
      [category]
    );
    return result.rows;
  }
}

// ============================================================================
// EMPLOYEE DEDUCTION REPOSITORY
// ============================================================================

export class EmployeeDeductionRepository extends BaseRepository<HREmployeeDeduction> {
  constructor() {
    super('hr_employee_deductions', 'employee_deduction_id');
  }

  async findByEmployeeId(employeeId: string): Promise<HREmployeeDeduction[]> {
    const result = await query<HREmployeeDeduction>(
      `SELECT ed.*, dt.name, dt.code, dt.category
       FROM ${this.tableName} ed
       JOIN hr_deduction_types dt ON dt.deduction_type_id = ed.deduction_type_id
       WHERE ed.employee_id = $1 AND ed.is_active = true
       ORDER BY dt.category, dt.code`,
      [employeeId]
    );
    return result.rows;
  }
}

// ============================================================================
// TAX TABLE REPOSITORY
// ============================================================================

export class TaxTableRepository extends BaseRepository<HRTaxTable> {
  constructor() {
    super('hr_tax_tables', 'tax_table_id');
  }

  async findByTaxCode(taxCode: string): Promise<HRTaxTable[]> {
    const result = await query<HRTaxTable>(
      `SELECT * FROM ${this.tableName}
       WHERE tax_code = $1 AND is_active = true
       ORDER BY threshold_from`,
      [taxCode]
    );
    return result.rows;
  }

  async findActiveRates(): Promise<HRTaxTable[]> {
    const result = await query<HRTaxTable>(
      `SELECT DISTINCT ON (tax_code) *
       FROM ${this.tableName}
       WHERE is_active = true
       ORDER BY tax_code, effective_date DESC`
    );
    return result.rows;
  }
}

// ============================================================================
// LEAVE TYPE REPOSITORY
// ============================================================================

export class LeaveTypeRepository extends BaseRepository<HRLeaveType> {
  constructor() {
    super('hr_leave_types', 'leave_type_id');
  }

  async findActive(): Promise<HRLeaveType[]> {
    const result = await query<HRLeaveType>(
      `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY name`
    );
    return result.rows;
  }
}

// ============================================================================
// CONSOLIDATED HR REPOSITORY
// ============================================================================

class HRRepository {
  readonly employees = new EmployeeRepository();
  readonly taxDetails = new EmployeeTaxDetailsRepository();
  readonly employments = new EmploymentRepository();
  readonly bankAccounts = new BankAccountRepository();
  readonly timesheets = new TimesheetRepository();
  readonly timesheetEntries = new TimesheetEntryRepository();
  readonly payrollPeriods = new PayrollPeriodRepository();
  readonly payrollRuns = new PayrollRunRepository();
  readonly payItems = new PayItemRepository();
  readonly leaveRequests = new LeaveRequestRepository();
  readonly leaveBalances = new LeaveBalanceRepository();
  readonly deductionTypes = new DeductionTypeRepository();
  readonly employeeDeductions = new EmployeeDeductionRepository();
  readonly taxTables = new TaxTableRepository();
  readonly leaveTypes = new LeaveTypeRepository();

  // Transaction helper
  async withTransaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    return transaction(callback);
  }
}

export const hrRepository = new HRRepository();
