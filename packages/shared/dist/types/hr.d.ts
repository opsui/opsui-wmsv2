/**
 * HR & Payroll Types
 *
 * Types for the Human Resources and Payroll module with NZ tax compliance
 * All types align with the database schema in migrations 046 and 047
 */
export declare enum HREmployeeStatus {
    ACTIVE = "ACTIVE",
    ON_LEAVE = "ON_LEAVE",
    TERMINATED = "TERMINATED",
    RESIGNED = "RESIGNED"
}
export declare enum HREmploymentType {
    FULL_TIME = "FULL_TIME",
    PART_TIME = "PART_TIME",
    CASUAL = "CASUAL",
    CONTRACT = "CONTRACT",
    FIXED_TERM = "FIXED_TERM"
}
export declare enum HRPayFrequency {
    WEEKLY = "WEEKLY",
    FORTNIGHTLY = "FORTNIGHTLY",
    MONTHLY = "MONTHLY",
    BI_MONTHLY = "BI_MONTHLY"
}
export declare enum HRNZTaxCode {
    M = "M",
    ME = "ME",// With student loan
    ML = "ML",// With SL (secondary)
    L = "L",// Lower rate
    SL = "SL",// With student loan
    SH = "SH",// Higher rate
    S = "S",// Standard rate
    ST = "ST",// Student loan
    WA = "WA",// Withholding rate
    WT = "WT",// Withholding rate with SL
    CAE = "CAE",// Certified agricultural adviser
    EDW = "EDW",// Election day worker
    NSW = "NSW"
}
export declare enum HRKiwiSaverRate {
    RATE_3 = "RATE_3",
    RATE_4 = "RATE_4",
    RATE_6 = "RATE_6",
    RATE_8 = "RATE_8",
    RATE_10 = "RATE_10"
}
export declare enum HRTimesheetStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    PAID = "PAID"
}
export declare enum HRWorkType {
    REGULAR = "REGULAR",
    OVERTIME_1_5 = "OVERTIME_1_5",
    OVERTIME_2_0 = "OVERTIME_2_0",
    DOUBLE_TIME = "DOUBLE_TIME",
    SUNDAY = "SUNDAY",
    PUBLIC_HOLIDAY = "PUBLIC_HOLIDAY",
    ON_CALL = "ON_CALL",
    TRAVEL = "TRAVEL",
    OTHER = "OTHER"
}
export declare enum HRPayrollStatus {
    DRAFT = "DRAFT",
    CALCULATED = "CALCULATED",
    PROCESSING = "PROCESSING",
    PROCESSED = "PROCESSED",
    PAID = "PAID",
    CANCELLED = "CANCELLED"
}
export declare enum HRDeductionCategory {
    TAX = "TAX",
    KIWISAVER = "KIWISAVER",
    ACC = "ACC",
    UNION = "UNION",
    MEDICAL = "MEDICAL",
    INSURANCE = "INSURANCE",
    LOAN = "LOAN",
    GARNISHMENT = "GARNISHMENT",
    OTHER = "OTHER"
}
export declare enum HRLeaveStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    DECLINED = "DECLINED",
    CANCELLED = "CANCELLED",
    COMPLETED = "COMPLETED"
}
export declare enum HRLeaveTypeEnum {
    ANNUAL = "ANNUAL",
    SICK = "SICK",
    BEREAVEMENT = "BEREAVEMENT",
    PARENTAL = "PARENTAL",
    UNPAID = "UNPAID",
    COMP_TIME = "COMP_TIME",
    JURY_DUTY = "JURY_DUTY",
    DOMESTIC_VIOLENCE = "DOMESTIC_VIOLENCE",
    LONG_SERVICE = "LONG_SERVICE",
    OTHER = "OTHER"
}
export interface HREmployee {
    employeeId: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    nationalId: string | null;
    email: string;
    phone: string | null;
    mobile: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: string;
    employeeNumber: string | null;
    status: HREmployeeStatus;
    hireDate: Date;
    terminationDate: Date | null;
    terminationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    createdBy: string | null;
}
export interface HREmployeeTaxDetails {
    taxDetailId: string;
    employeeId: string;
    irdNumber: string;
    taxCode: HRNZTaxCode;
    taxCodeEffectiveDate: Date | null;
    specialTaxRate: number | null;
    hasStudentLoan: boolean;
    studentLoanPlan: string | null;
    secondaryTaxCode: HRNZTaxCode | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface HREmployment {
    employmentId: string;
    employeeId: string;
    positionTitle: string;
    employmentType: HREmploymentType;
    department: string | null;
    costCenter: string | null;
    location: string | null;
    payType: 'HOURLY' | 'SALARY';
    hourlyRate: number | null;
    salaryAmount: number | null;
    salaryFrequency: HRPayFrequency | null;
    standardHoursPerWeek: number;
    standardHoursPerDay: number;
    startDate: Date;
    endDate: Date | null;
    isPrimary: boolean;
    status: 'ACTIVE' | 'TERMINATED' | 'SUSPENDED';
    createdAt: Date;
    updatedAt: Date;
}
export interface HRBankAccount {
    bankAccountId: string;
    employeeId: string;
    bankName: string;
    bankBranch: string | null;
    accountNumber: string;
    accountType: 'CHECKING' | 'SAVINGS';
    routingNumber: string | null;
    allocationPercent: number;
    allocationAmount: number | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface HREmployeeWithDetails extends HREmployee {
    taxDetails?: HREmployeeTaxDetails;
    employments?: HREmployment[];
    bankAccounts?: HRBankAccount[];
    primaryEmployment?: HREmployment;
    primaryBankAccount?: HRBankAccount;
}
export interface HRTimesheet {
    timesheetId: string;
    employeeId: string;
    periodStartDate: Date;
    periodEndDate: Date;
    status: HRTimesheetStatus;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalHours: number;
    submittedAt: Date | null;
    submittedBy: string | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    rejectionReason: string | null;
    payrollRunId: string | null;
    createdAt: Date;
    updatedAt: Date;
    employee?: HREmployee;
    entries?: HRTimesheetEntry[];
}
export interface HRTimesheetEntry {
    entryId: string;
    timesheetId: string;
    workDate: Date;
    workType: HRWorkType;
    description: string | null;
    hoursWorked: number;
    breakHours: number;
    orderId: string | null;
    taskType: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface HRTimesheetWithEntries extends HRTimesheet {
    entries?: HRTimesheetEntry[];
}
export interface HRPayrollPeriod {
    periodId: string;
    periodName: string;
    periodStartDate: Date;
    periodEndDate: Date;
    payDate: Date;
    payFrequency: HRPayFrequency;
    isActive: boolean;
    payrollRunId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface HRPayrollRun {
    payrollRunId: string;
    periodId: string;
    runNumber: number;
    status: HRPayrollStatus;
    calculatedAt: Date | null;
    processedAt: Date | null;
    paidAt: Date | null;
    employeeCount: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalTax: number;
    totalKiwisaver: number;
    totalAcc: number;
    totalDeductions: number;
    totalEmployerContributions: number;
    journalEntryId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    period?: HRPayrollPeriod;
}
export interface HRPayItem {
    payItemId: string;
    payrollRunId: string;
    employeeId: string;
    regularHours: number;
    regularRate: number;
    regularPay: number;
    overtime1_5Hours: number;
    overtime1_5Rate: number;
    overtime1_5Pay: number;
    overtime2_0Hours: number;
    overtime2_0Rate: number;
    overtime2_0Pay: number;
    otherEarnings: number;
    allowances: number;
    bonuses: number;
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
    createdAt: Date;
    employee?: HREmployee;
}
export interface HRDeductionType {
    deductionTypeId: string;
    name: string;
    code: string;
    category: HRDeductionCategory;
    description: string | null;
    isTaxable: boolean;
    isPreTax: boolean;
    calculationMethod: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FORMULA';
    expenseAccount: string | null;
    liabilityAccount: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface HREmployeeDeduction {
    employeeDeductionId: string;
    employeeId: string;
    deductionTypeId: string;
    amount: number | null;
    percentage: number | null;
    maximumAmount: number | null;
    isActive: boolean;
    effectiveDate: Date;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deductionType?: HRDeductionType;
}
export interface HRPayStub {
    payStubId: string;
    payItemId: string;
    payPeriodStart: Date;
    payPeriodEnd: Date;
    payDate: Date;
    payDetails: Record<string, unknown>;
    deductionDetails: Record<string, unknown>;
    employerContributions: Record<string, unknown>;
    ytdTotals: Record<string, unknown>;
    generatedAt: Date;
}
export interface HRLeaveType {
    leaveTypeId: string;
    name: string;
    code: string;
    leaveType: HRLeaveTypeEnum;
    description: string | null;
    accrualRate: number;
    accrualFrequency: HRPayFrequency;
    maxBalance: number | null;
    isPaid: boolean;
    requiresApproval: boolean;
    requiresDocumentation: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface HRLeaveBalance {
    balanceId: string;
    employeeId: string;
    leaveTypeId: string;
    openingBalance: number;
    accruedHours: number;
    takenHours: number;
    pendingHours: number;
    currentBalance: number;
    ytdAccrued: number;
    ytdTaken: number;
    effectiveDate: Date;
    updatedAt: Date;
    leaveType?: HRLeaveType;
}
export interface HRLeaveRequest {
    requestId: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    totalHours: number;
    totalDays: number;
    reason: string | null;
    attachmentUrl: string | null;
    status: HRLeaveStatus;
    submittedAt: Date;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    employee?: HREmployee;
    leaveType?: HRLeaveType;
}
export interface HRTaxTable {
    taxTableId: string;
    taxCode: HRNZTaxCode;
    effectiveDate: Date;
    thresholdFrom: number;
    thresholdTo: number | null;
    taxRate: number;
    withholdingAmount: number;
    isActive: boolean;
    createdAt: Date;
}
export interface KiwiSaverRateConfig {
    rateId: string;
    rateType: HRKiwiSaverRate;
    employeeRate: number;
    employerRate: number;
    effectiveDate: Date;
    isActive: boolean;
    createdAt: Date;
}
export interface HRACCRate {
    accRateId: string;
    incomeFrom: number;
    incomeTo: number | null;
    levyRate: number;
    effectiveDate: Date;
    isActive: boolean;
    createdAt: Date;
}
export interface CreateEmployeeInput {
    userId?: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
    dateOfBirth?: string;
    gender?: string;
    email: string;
    phone?: string;
    mobile?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    employeeNumber?: string;
    hireDate: string;
    taxDetails?: {
        irdNumber: string;
        taxCode: HRNZTaxCode;
        hasStudentLoan: boolean;
    };
    employment?: {
        positionTitle: string;
        employmentType: HREmploymentType;
        department?: string;
        payType: 'HOURLY' | 'SALARY';
        hourlyRate?: number;
        salaryAmount?: number;
        salaryFrequency?: HRPayFrequency;
        standardHoursPerWeek?: number;
    };
    bankAccount?: {
        bankName: string;
        bankBranch?: string;
        accountNumber: string;
        accountType?: 'CHECKING' | 'SAVINGS';
        routingNumber?: string;
    };
}
export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
}
export interface SubmitTimesheetInput {
    employeeId: string;
    periodStartDate: string;
    periodEndDate: string;
    entries: Array<{
        workDate: string;
        workType: HRWorkType;
        hoursWorked: number;
        description?: string;
        taskType?: string;
    }>;
}
export interface ProcessPayrollInput {
    periodId?: string;
    employeeIds?: string[];
    payDate?: string;
}
export interface CreateLeaveRequestInput {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalHours: number;
    reason?: string;
}
export interface PayrollReportQuery {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    department?: string;
    payrollRunId?: string;
}
export interface PayrollReportItem {
    employeeId: string;
    employeeName: string;
    department: string;
    position: string;
    regularHours: number;
    regularPay: number;
    overtimePay: number;
    grossPay: number;
    taxDeductions: number;
    kiwiSaverDeduction: number;
    totalDeductions: number;
    netPay: number;
    employerContributions: number;
    totalCost: number;
}
export interface TaxReportQuery {
    taxYear?: string;
    employeeId?: string;
}
export interface TaxReportItem {
    employeeId: string;
    employeeName: string;
    irdNumber: string;
    taxCode: string;
    grossPay: number;
    payeTax: number;
    kiwiSaverEmployee: number;
    accLevy: number;
    studentLoan: number;
    netPay: number;
}
export interface LeaveReportQuery {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    leaveType?: string;
    status?: HRLeaveStatus;
}
export interface LeaveReportItem {
    employeeId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    totalHours: number;
    status: string;
}
//# sourceMappingURL=hr.d.ts.map