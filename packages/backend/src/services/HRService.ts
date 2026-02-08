/**
 * HR Service
 *
 * Business logic for HR & Payroll operations
 * Handles employee management, timesheet processing, payroll calculation,
 * NZ tax compliance (PAYE, KiwiSaver, ACC), and leave management
 */

import { hrRepository } from '../repositories/HRRepository';
import {
  HREmployee,
  HREmployeeWithDetails,
  HRTimesheet,
  HRTimesheetEntry,
  HRTimesheetStatus,
  HRPayrollRun,
  HRPayItem,
  HRPayrollPeriod,
  HRNZTaxCode,
  HRLeaveStatus,
  HRLeaveRequest,
  HRLeaveBalance,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  SubmitTimesheetInput,
  ProcessPayrollInput,
} from '@opsui/shared';
import { NotFoundError } from '@opsui/shared';

// ============================================================================
// PAYROLL CALCULATION RESULT
// ============================================================================

export interface PayrollCalculationResult {
  periodId: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalTax: number;
  totalKiwiSaver: number;
  totalACC: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  payItems: PayItemCalculation[];
}

export interface PayItemCalculation {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  regularRate: number;
  regularPay: number;
  overtime1_5Hours: number;
  overtime1_5Rate: number;
  overtime1_5Pay: number;
  overtime2_0Hours: number;
  overtime2_0Rate: number;
  overtime2_0Pay: number;
  grossPay: number;
  payeTax: number;
  kiwiSaverEmployee: number;
  accEarnersLevy: number;
  studentLoan: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  kiwiSaverEmployer: number;
  accEmployerLevy: number;
  totalEmployerContributions: number;
  totalCost: number;
}

// ============================================================================
// HR SERVICE
// ============================================================================

class HRService {
  // =========================================================================
  // EMPLOYEE MANAGEMENT
  // =========================================================================

  /**
   * Get all employees with optional filters
   */
  async getEmployees(
    filters: {
      status?: string;
      department?: string;
      search?: string;
    } = {}
  ): Promise<HREmployee[]> {
    let employees: HREmployee[];

    if (filters.search) {
      employees = await hrRepository.employees.search(filters.search);
    } else if (filters.status === 'ACTIVE') {
      employees = await hrRepository.employees.findActive();
    } else {
      employees = await hrRepository.employees.findAll({ orderBy: 'last_name, first_name' });
    }

    // Apply additional filters
    if (filters.department) {
      const employmentIds = await hrRepository.withTransaction(async client => {
        const result = await client.query(
          `SELECT DISTINCT employee_id FROM hr_employments WHERE department = $1`,
          [filters.department]
        );
        return result.rows.map((r: any) => r.employee_id);
      });

      employees = employees.filter(e => employmentIds.includes(e.employeeId));
    }

    return employees;
  }

  /**
   * Get employee with all details
   */
  async getEmployeeById(employeeId: string): Promise<HREmployeeWithDetails> {
    const employee = await hrRepository.employees.findByIdWithDetails(employeeId);

    if (!employee) {
      throw new NotFoundError('Employee', employeeId);
    }

    return employee;
  }

  /**
   * Create a new employee
   */
  async createEmployee(
    data: CreateEmployeeInput,
    createdBy: string
  ): Promise<HREmployeeWithDetails> {
    // Generate employee ID
    const employeeId = await this.generateEmployeeId();

    // Generate employee number if not provided
    const employeeNumber = data.employeeNumber || (await this.generateEmployeeNumber());

    return await hrRepository.withTransaction(async client => {
      // Insert employee
      await client.query<HREmployee>(
        `INSERT INTO hr_employees (employee_id, user_id, first_name, last_name, preferred_name,
         email, phone, mobile, emergency_contact_name, emergency_contact_phone,
         address_line1, address_line2, city, region, postal_code, country,
         employee_number, status, hire_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         RETURNING *`,
        [
          employeeId,
          data.userId || null,
          data.firstName,
          data.lastName,
          data.preferredName || null,
          data.email,
          data.phone || null,
          data.mobile || null,
          data.emergencyContactName || null,
          data.emergencyContactPhone || null,
          data.addressLine1 || null,
          data.addressLine2 || null,
          data.city || null,
          data.region || null,
          data.postalCode || null,
          data.country || 'NEW ZEALAND',
          employeeNumber,
          'ACTIVE',
          data.hireDate,
          createdBy,
        ]
      );

      // Insert tax details if provided
      if (data.taxDetails) {
        const taxDetailId = `TX-${employeeId}`;
        await client.query(
          `INSERT INTO hr_employee_tax_details (tax_detail_id, employee_id, ird_number, tax_code, has_student_loan)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            taxDetailId,
            employeeId,
            data.taxDetails.irdNumber,
            data.taxDetails.taxCode,
            data.taxDetails.hasStudentLoan,
          ]
        );
      }

      // Insert employment record if provided
      if (data.employment) {
        const employmentId = `EMP-${employeeId}-01`;
        await client.query(
          `INSERT INTO hr_employments (employment_id, employee_id, position_title, employment_type,
           department, pay_type, hourly_rate, salary_amount, salary_frequency, standard_hours_per_week, start_date, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            employmentId,
            employeeId,
            data.employment.positionTitle,
            data.employment.employmentType,
            data.employment.department || null,
            data.employment.payType,
            data.employment.hourlyRate || null,
            data.employment.salaryAmount || null,
            data.employment.salaryFrequency || null,
            data.employment.standardHoursPerWeek || 40,
            data.hireDate,
            true,
          ]
        );
      }

      // Insert bank account if provided
      if (data.bankAccount) {
        const bankAccountId = `BA-${employeeId}`;
        await client.query(
          `INSERT INTO hr_bank_accounts (bank_account_id, employee_id, bank_name, bank_branch,
           account_number, account_type, routing_number, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            bankAccountId,
            employeeId,
            data.bankAccount.bankName,
            data.bankAccount.bankBranch || null,
            data.bankAccount.accountNumber,
            data.bankAccount.accountType || 'CHECKING',
            data.bankAccount.routingNumber || null,
            true,
          ]
        );
      }

      return (await hrRepository.employees.findByIdWithDetails(
        employeeId
      )) as HREmployeeWithDetails;
    });
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(
    employeeId: string,
    data: UpdateEmployeeInput
  ): Promise<HREmployeeWithDetails> {
    const existing = await hrRepository.employees.findById(employeeId);
    if (!existing) {
      throw new NotFoundError('Employee', employeeId);
    }

    return await hrRepository.withTransaction(async client => {
      // Update employee basic info
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        updateValues.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        updateValues.push(data.lastName);
      }
      if (data.preferredName !== undefined) {
        updateFields.push(`preferred_name = $${paramIndex++}`);
        updateValues.push(data.preferredName);
      }
      if (data.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(data.email);
      }
      if (data.phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        updateValues.push(data.phone);
      }
      if (data.mobile !== undefined) {
        updateFields.push(`mobile = $${paramIndex++}`);
        updateValues.push(data.mobile);
      }
      if (data.addressLine1 !== undefined) {
        updateFields.push(`address_line1 = $${paramIndex++}`);
        updateValues.push(data.addressLine1);
      }
      if (data.city !== undefined) {
        updateFields.push(`city = $${paramIndex++}`);
        updateValues.push(data.city);
      }
      if (data.region !== undefined) {
        updateFields.push(`region = $${paramIndex++}`);
        updateValues.push(data.region);
      }
      if (data.postalCode !== undefined) {
        updateFields.push(`postal_code = $${paramIndex++}`);
        updateValues.push(data.postalCode);
      }

      if (updateFields.length > 0) {
        updateValues.push(employeeId);
        await client.query(
          `UPDATE hr_employees SET ${updateFields.join(', ')} WHERE employee_id = $${paramIndex}`,
          updateValues
        );
      }

      // Update tax details if provided
      if (data.taxDetails) {
        await client.query(
          `UPDATE hr_employee_tax_details
           SET ird_number = $1, tax_code = $2, has_student_loan = $3
           WHERE employee_id = $4`,
          [
            data.taxDetails.irdNumber,
            data.taxDetails.taxCode,
            data.taxDetails.hasStudentLoan,
            employeeId,
          ]
        );
      }

      return (await hrRepository.employees.findByIdWithDetails(
        employeeId
      )) as HREmployeeWithDetails;
    });
  }

  /**
   * Delete (soft delete) an employee
   */
  async deleteEmployee(employeeId: string): Promise<boolean> {
    return await hrRepository.employees.softDelete(employeeId);
  }

  // =========================================================================
  // TIMESHEET MANAGEMENT
  // =========================================================================

  /**
   * Get timesheet with entries
   */
  async getTimesheet(timesheetId: string): Promise<HRTimesheet & { entries: HRTimesheetEntry[] }> {
    const timesheet = await hrRepository.timesheets.findWithEntries(timesheetId);

    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    return {
      ...timesheet,
      entries: timesheet.entries || [],
    };
  }

  /**
   * Get timesheets for an employee
   */
  async getEmployeeTimesheets(employeeId: string, limit = 10): Promise<HRTimesheet[]> {
    return await hrRepository.timesheets.findByEmployeeId(employeeId, limit);
  }

  /**
   * Get timesheets by status
   */
  async getTimesheetsByStatus(status: HRTimesheetStatus): Promise<HRTimesheet[]> {
    return await hrRepository.timesheets.findByStatus(status);
  }

  /**
   * Submit a timesheet
   */
  async submitTimesheet(data: SubmitTimesheetInput, userId: string): Promise<HRTimesheet> {
    // Check if timesheet already exists
    const existing = await hrRepository.timesheets.findByEmployeeAndPeriod(
      data.employeeId,
      data.periodStartDate,
      data.periodEndDate
    );

    const timesheetId = existing?.timesheetId || `TS-${Date.now()}`;

    return await hrRepository.withTransaction(async client => {
      // Calculate totals
      let totalRegularHours = 0;
      let totalOvertimeHours = 0;

      for (const entry of data.entries) {
        if (entry.workType === 'REGULAR') {
          totalRegularHours += entry.hoursWorked;
        } else {
          totalOvertimeHours += entry.hoursWorked;
        }
      }

      // Upsert timesheet header
      await client.query(
        `INSERT INTO hr_timesheets (timesheet_id, employee_id, period_start_date, period_end_date,
         status, total_regular_hours, total_overtime_hours, submitted_at, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
         ON CONFLICT (employee_id, period_start_date, period_end_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           total_regular_hours = EXCLUDED.total_regular_hours,
           total_overtime_hours = EXCLUDED.total_overtime_hours,
           submitted_at = EXCLUDED.submitted_at,
           submitted_by = EXCLUDED.submitted_by`,
        [
          timesheetId,
          data.employeeId,
          data.periodStartDate,
          data.periodEndDate,
          'SUBMITTED',
          totalRegularHours,
          totalOvertimeHours,
          userId,
        ]
      );

      // Delete existing entries
      await client.query('DELETE FROM hr_timesheet_entries WHERE timesheet_id = $1', [timesheetId]);

      // Insert new entries
      for (const entry of data.entries) {
        const entryId = `TSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `INSERT INTO hr_timesheet_entries (entry_id, timesheet_id, work_date, work_type, hours_worked, description, task_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            entryId,
            timesheetId,
            entry.workDate,
            entry.workType,
            entry.hoursWorked,
            entry.description || null,
            entry.taskType || null,
          ]
        );
      }

      return (await hrRepository.timesheets.findById(timesheetId)) as HRTimesheet;
    });
  }

  /**
   * Approve a timesheet
   */
  async approveTimesheet(timesheetId: string, approvedBy: string): Promise<HRTimesheet> {
    const timesheet = await hrRepository.timesheets.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    return (await hrRepository.timesheets.updateStatus(
      timesheetId,
      'APPROVED',
      approvedBy
    )) as HRTimesheet;
  }

  /**
   * Reject a timesheet
   */
  async rejectTimesheet(
    timesheetId: string,
    reason: string,
    rejectedBy: string
  ): Promise<HRTimesheet> {
    const timesheet = await hrRepository.timesheets.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    await hrRepository.timesheets.update(timesheetId, {
      status: 'REJECTED' as any,
      rejectionReason: reason,
      // Store the rejecting user in approvedBy for tracking
      approvedBy: rejectedBy,
      approvedAt: new Date(),
    } as any);

    return (await hrRepository.timesheets.findById(timesheetId)) as HRTimesheet;
  }

  // =========================================================================
  // PAYROLL PROCESSING
  // =========================================================================

  /**
   * Calculate payroll for a period (preview)
   */
  async calculatePayroll(
    periodId: string,
    options: ProcessPayrollInput = {}
  ): Promise<PayrollCalculationResult> {
    const period = await hrRepository.payrollPeriods.findById(periodId);
    if (!period) {
      throw new NotFoundError('Payroll Period', periodId);
    }

    // Get employees to process
    let employeeIds = options.employeeIds;
    if (!employeeIds || employeeIds.length === 0) {
      const activeEmployees = await hrRepository.employees.findActive();
      employeeIds = activeEmployees.map(e => e.employeeId);
    }

    // Get approved timesheets for the period
    const timesheets = await hrRepository.timesheets.findByPeriod(
      period.periodStartDate.toISOString().split('T')[0],
      period.periodEndDate.toISOString().split('T')[0]
    );

    const approvedTimesheets = timesheets.filter(ts => ts.status === 'APPROVED');

    // Calculate pay items
    const payItems: PayItemCalculation[] = [];
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalTax = 0;
    let totalKiwiSaver = 0;
    let totalACC = 0;
    let totalDeductions = 0;
    let totalEmployerContributions = 0;

    for (const employeeId of employeeIds) {
      const timesheet = approvedTimesheets.find(ts => ts.employeeId === employeeId);
      const employee = await hrRepository.employees.findByIdWithDetails(employeeId);

      if (!employee || !employee.primaryEmployment) continue;

      const payItem = await this.calculateEmployeePay(
        employee,
        timesheet,
        period.periodStartDate.toISOString().split('T')[0],
        period.periodEndDate.toISOString().split('T')[0]
      );

      payItems.push(payItem);

      totalGrossPay += payItem.grossPay;
      totalNetPay += payItem.netPay;
      totalTax += payItem.payeTax;
      totalKiwiSaver += payItem.kiwiSaverEmployee;
      totalACC += payItem.accEarnersLevy;
      totalDeductions += payItem.totalDeductions;
      totalEmployerContributions += payItem.totalEmployerContributions;
    }

    return {
      periodId,
      employeeCount: payItems.length,
      totalGrossPay,
      totalNetPay,
      totalTax,
      totalKiwiSaver,
      totalACC,
      totalDeductions,
      totalEmployerContributions,
      payItems,
    };
  }

  /**
   * Process payroll run
   */
  async processPayrollRun(
    periodId: string,
    options: ProcessPayrollInput = {},
    createdBy: string
  ): Promise<HRPayrollRun> {
    const period = await hrRepository.payrollPeriods.findById(periodId);
    if (!period) {
      throw new NotFoundError('Payroll Period', periodId);
    }

    // Calculate payroll
    const calculation = await this.calculatePayroll(periodId, options);

    // Create payroll run
    const runNumber = await hrRepository.payrollRuns.getNextRunNumber(periodId);
    const payrollRunId = `PR-${new Date().getFullYear()}-${String(runNumber).padStart(3, '0')}`;

    return await hrRepository.withTransaction(async client => {
      // Insert payroll run
      const payrollRun = await client.query<HRPayrollRun>(
        `INSERT INTO hr_payroll_runs (payroll_run_id, period_id, run_number, status,
         calculated_at, employee_count, total_gross_pay, total_net_pay, total_tax,
         total_kiwisaver, total_acc, total_deductions, total_employer_contributions, created_by)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          payrollRunId,
          periodId,
          runNumber,
          'PROCESSED',
          calculation.employeeCount,
          calculation.totalGrossPay,
          calculation.totalNetPay,
          calculation.totalTax,
          calculation.totalKiwiSaver,
          calculation.totalACC,
          calculation.totalDeductions,
          calculation.totalEmployerContributions,
          createdBy,
        ]
      );

      // Insert pay items
      for (const item of calculation.payItems) {
        const payItemId = `PI-${payrollRunId}-${item.employeeId}`;
        await client.query(
          `INSERT INTO hr_pay_items (pay_item_id, payroll_run_id, employee_id,
           regular_hours, regular_rate, regular_pay,
           overtime_1_5_hours, overtime_1_5_rate, overtime_1_5_pay,
           overtime_2_0_hours, overtime_2_0_rate, overtime_2_0_pay,
           other_earnings, allowances, bonuses,
           paye_tax, kiwi_saver_employee, acc_earners_levy, student_loan, other_deductions,
           kiwi_saver_employer, acc_employer_levy)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            payItemId,
            payrollRunId,
            item.employeeId,
            item.regularHours,
            item.regularRate,
            item.regularPay,
            item.overtime1_5Hours,
            item.overtime1_5Rate,
            item.overtime1_5Pay,
            item.overtime2_0Hours,
            item.overtime2_0Rate,
            item.overtime2_0Pay,
            0, // other_earnings
            0, // allowances
            0, // bonuses
            item.payeTax,
            item.kiwiSaverEmployee,
            item.accEarnersLevy,
            item.studentLoan,
            0, // other_deductions
            item.kiwiSaverEmployer,
            item.accEmployerLevy,
          ]
        );
      }

      // Update payroll period
      await client.query(`UPDATE hr_payroll_periods SET payroll_run_id = $1 WHERE period_id = $2`, [
        payrollRunId,
        periodId,
      ]);

      // Update timesheets
      await client.query(
        `UPDATE hr_timesheets SET status = 'PAID', payroll_run_id = $1
         WHERE period_start_date = $2 AND period_end_date = $3 AND status = 'APPROVED'`,
        [payrollRunId, period.periodStartDate, period.periodEndDate]
      );

      return payrollRun.rows[0];
    });
  }

  /**
   * Get payroll runs
   */
  async getPayrollRuns(limit = 20): Promise<HRPayrollRun[]> {
    return await hrRepository.payrollRuns.findAll({
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit,
    });
  }

  /**
   * Get payroll run with pay items
   */
  async getPayrollRun(payrollRunId: string): Promise<HRPayrollRun & { payItems: HRPayItem[] }> {
    const payrollRun = await hrRepository.payrollRuns.findById(payrollRunId);
    if (!payrollRun) {
      throw new NotFoundError('Payroll Run', payrollRunId);
    }

    const payItems = await hrRepository.payItems.findByPayrollRunId(payrollRunId);

    return {
      ...payrollRun,
      payItems,
    };
  }

  // =========================================================================
  // NZ TAX CALCULATIONS
  // =========================================================================

  /**
   * Calculate PAYE tax using IRD tax tables
   */
  async calculatePAYE(taxableIncome: number, taxCode: HRNZTaxCode): Promise<number> {
    const taxTables = await hrRepository.taxTables.findByTaxCode(taxCode);

    let tax = 0;
    let remainingIncome = taxableIncome;

    for (const bracket of taxTables) {
      if (remainingIncome <= 0) break;

      const taxableInBracket = Math.min(
        remainingIncome,
        (bracket.thresholdTo ?? Infinity) - bracket.thresholdFrom
      );

      if (taxableInBracket > 0) {
        tax += (taxableInBracket * bracket.taxRate) / 100;
        remainingIncome -= taxableInBracket;
      }
    }

    return Math.round(tax * 100) / 100;
  }

  /**
   * Calculate ACC earners levy
   */
  async calculateACCEarnersLevy(grossPay: number): Promise<number> {
    const accRates = await hrRepository.withTransaction(async client => {
      const result = await client.query<any>(
        `SELECT * FROM hr_acc_rates WHERE is_active = true ORDER BY income_from`
      );
      return result.rows;
    });

    let levy = 0;
    let remainingIncome = grossPay;

    for (const rate of accRates) {
      if (remainingIncome <= 0 || rate.incomeFrom > grossPay) continue;

      const taxableInBracket = Math.min(
        remainingIncome,
        (rate.incomeTo ?? Infinity) - rate.incomeFrom
      );

      if (taxableInBracket > 0) {
        levy += (taxableInBracket * rate.levyRate) / 100;
        remainingIncome -= taxableInBracket;
      }
    }

    return Math.round(levy * 100) / 100;
  }

  /**
   * Calculate KiwiSaver contribution
   */
  async calculateKiwiSaver(
    grossPay: number,
    rate: string
  ): Promise<{ employee: number; employer: number }> {
    const ksRate = await hrRepository.withTransaction(async client => {
      const result = await client.query(
        `SELECT * FROM hr_kiwisaver_rates WHERE rate_type = $1 AND is_active = true`,
        [rate]
      );
      return result.rows[0];
    });

    if (!ksRate) {
      return { employee: 0, employer: 0 };
    }

    const employee = Math.round(((grossPay * ksRate.employeeRate) / 100) * 100) / 100;
    const employer = Math.round(((grossPay * ksRate.employerRate) / 100) * 100) / 100;

    return { employee, employer };
  }

  /**
   * Calculate student loan repayment
   */
  calculateStudentLoan(grossPay: number): number {
    // Student loan repayment threshold (as of 2024: $24,280 annually = $467.69 weekly)
    const weeklyThreshold = 467.69;
    const repaymentRate = 0.12; // 12%

    const weeklyPay = grossPay / 52; // Approximate weekly
    const excess = Math.max(0, weeklyPay - weeklyThreshold);

    return Math.round(excess * repaymentRate * 52 * 100) / 100;
  }

  // =========================================================================
  // PRIVATE HELPER METHODS
  // =========================================================================

  /**
   * Calculate pay for a single employee
   */
  private async calculateEmployeePay(
    employee: HREmployeeWithDetails,
    timesheet?: HRTimesheet,
    // periodStart and periodEnd are reserved for future use (e.g., pro-rating)
    _periodStart?: string,
    _periodEnd?: string
  ): Promise<PayItemCalculation> {
    const employment = employee.primaryEmployment;
    const taxDetails = employee.taxDetails;
    const deductions = await hrRepository.employeeDeductions.findByEmployeeId(employee.employeeId);

    // Calculate hours and pay
    let regularHours = 0;
    let overtime1_5Hours = 0;
    let overtime2_0Hours = 0;

    if (timesheet) {
      for (const entry of timesheet.entries || []) {
        switch (entry.workType) {
          case 'REGULAR':
            regularHours += entry.hoursWorked;
            break;
          case 'OVERTIME_1_5':
            overtime1_5Hours += entry.hoursWorked;
            break;
          case 'OVERTIME_2_0':
            overtime2_0Hours += entry.hoursWorked;
            break;
          default:
            regularHours += entry.hoursWorked;
        }
      }
    } else if (employment?.payType === 'SALARY' && employment?.standardHoursPerWeek) {
      // Default to standard hours for salaried employees without timesheet
      regularHours = employment.standardHoursPerWeek * 2; // Fortnightly
    }

    // Calculate rates
    let regularRate = employment?.hourlyRate || 0;
    if (employment?.payType === 'SALARY' && employment?.salaryAmount) {
      // Calculate hourly rate from salary
      const weeksPerYear = 52;
      const hoursPerWeek = employment.standardHoursPerWeek || 40;
      regularRate = employment.salaryAmount / weeksPerYear / hoursPerWeek;
    }

    const overtime1_5Rate = regularRate * 1.5;
    const overtime2_0Rate = regularRate * 2.0;

    // Calculate earnings
    const regularPay = regularHours * regularRate;
    const overtime1_5Pay = overtime1_5Hours * overtime1_5Rate;
    const overtime2_0Pay = overtime2_0Hours * overtime2_0Rate;
    const grossPay = regularPay + overtime1_5Pay + overtime2_0Pay;

    // Calculate PAYE
    let payeTax = 0;
    if (taxDetails) {
      payeTax = await this.calculatePAYE(grossPay, taxDetails.taxCode);
    }

    // Calculate KiwiSaver
    const ksDeduction = deductions.find(d => d.deductionType?.code === 'KS_EMP');
    const ksRate = ksDeduction?.percentage
      ? (`RATE_${Math.round(ksDeduction.percentage)}` as any)
      : 'RATE_3';
    const kiwiSaver = await this.calculateKiwiSaver(grossPay, ksRate);

    // Calculate ACC
    const accEarnersLevy = await this.calculateACCEarnersLevy(grossPay);
    const accEmployerLevy = accEarnersLevy; // Simplified - employer rate may differ

    // Calculate student loan
    let studentLoan = 0;
    if (taxDetails?.hasStudentLoan) {
      studentLoan = this.calculateStudentLoan(grossPay);
    }

    // Calculate other deductions
    let otherDeductions = 0;
    for (const deduction of deductions) {
      if (
        deduction.deductionType?.category === 'UNION' ||
        deduction.deductionType?.category === 'MEDICAL'
      ) {
        if (deduction.amount) {
          otherDeductions += deduction.amount;
        } else if (deduction.percentage) {
          otherDeductions += (grossPay * deduction.percentage) / 100;
        }
      }
    }

    const totalDeductions =
      payeTax + kiwiSaver.employee + accEarnersLevy + studentLoan + otherDeductions;
    const netPay = Math.max(0, grossPay - totalDeductions);
    const totalEmployerContributions = kiwiSaver.employer + accEmployerLevy;

    return {
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      regularHours,
      regularRate,
      regularPay,
      overtime1_5Hours,
      overtime1_5Rate,
      overtime1_5Pay,
      overtime2_0Hours,
      overtime2_0Rate,
      overtime2_0Pay,
      grossPay: Math.round(grossPay * 100) / 100,
      payeTax: Math.round(payeTax * 100) / 100,
      kiwiSaverEmployee: kiwiSaver.employee,
      accEarnersLevy: Math.round(accEarnersLevy * 100) / 100,
      studentLoan: Math.round(studentLoan * 100) / 100,
      otherDeductions: Math.round(otherDeductions * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      kiwiSaverEmployer: kiwiSaver.employer,
      accEmployerLevy: Math.round(accEmployerLevy * 100) / 100,
      totalEmployerContributions: Math.round(totalEmployerContributions * 100) / 100,
      totalCost: Math.round((grossPay + totalEmployerContributions) * 100) / 100,
    };
  }

  /**
   * Generate employee ID
   */
  private async generateEmployeeId(): Promise<string> {
    const lastEmployee = await hrRepository.employees.rawQueryOne(
      `SELECT employee_id FROM hr_employees ORDER BY employee_id DESC LIMIT 1`
    );

    if (!lastEmployee) {
      return 'EMP-001';
    }

    const lastNum = parseInt(lastEmployee.employeeId.split('-')[1], 10);
    return `EMP-${String(lastNum + 1).padStart(3, '0')}`;
  }

  /**
   * Generate employee number
   */
  private async generateEmployeeNumber(): Promise<string> {
    const lastEmployee = await hrRepository.employees.rawQueryOne(
      `SELECT employee_number FROM hr_employees WHERE employee_number IS NOT NULL ORDER BY employee_number DESC NULLS LAST LIMIT 1`
    );

    if (!lastEmployee?.employeeNumber) {
      return 'EMP001';
    }

    const lastNum = parseInt(lastEmployee.employeeNumber.replace(/\D/g, ''), 10);
    return `EMP${String(lastNum + 1).padStart(3, '0')}`;
  }

  // =========================================================================
  // LEAVE MANAGEMENT
  // =========================================================================

  /**
   * Get leave requests
   */
  async getLeaveRequests(
    filters: { status?: HRLeaveStatus; employeeId?: string } = {}
  ): Promise<HRLeaveRequest[]> {
    if (filters.status) {
      return await hrRepository.leaveRequests.findByStatus(filters.status);
    }
    if (filters.employeeId) {
      return await hrRepository.leaveRequests.findByEmployeeId(filters.employeeId);
    }
    return await hrRepository.leaveRequests.findAll({
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  }

  /**
   * Create leave request
   */
  async createLeaveRequest(data: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalHours: number;
    reason?: string;
  }): Promise<HRLeaveRequest> {
    const requestId = `LR-${Date.now()}`;
    const totalDays = Math.ceil(data.totalHours / 8); // Assume 8-hour day

    const leaveRequest = await hrRepository.leaveRequests.insert({
      requestId,
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalHours: data.totalHours,
      totalDays,
      reason: data.reason || null,
      status: 'PENDING' as any,
      submittedAt: new Date(),
      attachmentUrl: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as HRLeaveRequest);

    return leaveRequest;
  }

  /**
   * Approve leave request
   */
  async approveLeaveRequest(requestId: string, approvedBy: string): Promise<HRLeaveRequest> {
    const request = await hrRepository.leaveRequests.findById(requestId);
    if (!request) {
      throw new NotFoundError('Leave Request', requestId);
    }

    await hrRepository.leaveRequests.update(requestId, {
      status: 'APPROVED' as any,
      reviewedBy: approvedBy,
      reviewedAt: new Date(),
    });

    return (await hrRepository.leaveRequests.findById(requestId)) as HRLeaveRequest;
  }

  /**
   * Get leave balances for employee
   */
  async getLeaveBalances(employeeId: string): Promise<HRLeaveBalance[]> {
    return await hrRepository.leaveBalances.findByEmployeeId(employeeId);
  }

  // =========================================================================
  // SETTINGS & CONFIGURATION
  // =========================================================================

  /**
   * Get active deduction types
   */
  async getDeductionTypes(): Promise<any[]> {
    return await hrRepository.deductionTypes.findActive();
  }

  /**
   * Get active leave types
   */
  async getLeaveTypes(): Promise<any[]> {
    return await hrRepository.leaveTypes.findActive();
  }

  /**
   * Get payroll periods
   */
  async getPayrollPeriods(): Promise<HRPayrollPeriod[]> {
    return await hrRepository.payrollPeriods.findActive();
  }

  /**
   * Get current payroll period
   */
  async getCurrentPayrollPeriod(): Promise<HRPayrollPeriod | null> {
    return await hrRepository.payrollPeriods.findCurrentPeriod();
  }
}

export const hrService = new HRService();
