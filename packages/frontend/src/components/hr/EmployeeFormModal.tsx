/**
 * Employee Form Modal
 *
 * Add/Edit employee with tabs for:
 * - Personal Info
 * - Employment Details
 * - Tax Info (NZ)
 * - Bank Accounts
 * - Deductions
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCreateEmployee, useUpdateEmployee, useDeductionTypes } from '@/services/api';
import { useToast } from '@/components/shared';
import type { HREmployeeWithDetails } from '@opsui/shared';

// Local type for form bank account (subset of HRBankAccount)
interface FormBankAccount {
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
  isPrimary: boolean;
}

interface EmployeeFormModalProps {
  employee: HREmployeeWithDetails | null;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = 'personal' | 'employment' | 'tax' | 'bank' | 'deductions';

const NZ_TAX_CODES = [
  { value: 'M', label: 'M - Main Income', description: 'Standard tax code for main income' },
  { value: 'ME', label: 'ME - Main + Student Loan', description: 'Main income with student loan' },
  { value: 'L', label: 'L - Secondary Income', description: 'Lower deduction rate' },
  { value: 'S', label: 'S - Secondary Higher', description: 'Higher secondary rate' },
  { value: 'SH', label: 'SH - Secondary Higher Rate', description: 'Higher rate secondary' },
  {
    value: 'ST',
    label: 'ST - Secondary + Student Loan',
    description: 'Secondary with student loan',
  },
];

const KIWISAVER_RATES = [
  { value: 'RATE_3', label: '3%', employer: '3%' },
  { value: 'RATE_4', label: '4%', employer: '3%' },
  { value: 'RATE_6', label: '6%', employer: '3%' },
  { value: 'RATE_8', label: '8%', employer: '3%' },
  { value: 'RATE_10', label: '10%', employer: '3%' },
];

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACT', 'FIXED_TERM'] as const;

const PAY_TYPES = ['HOURLY', 'SALARY'] as const;

const BANKS = [
  'ANZ',
  'Westpac',
  'BNZ',
  'ASB',
  'KiwiBank',
  'Heartland Bank',
  'Co-operative Bank',
  'TSB',
  'Other',
] as const;

export function EmployeeFormModal({ employee, onClose, onSuccess }: EmployeeFormModalProps) {
  const { showToast } = useToast();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: deductionTypes = [] } = useDeductionTypes();

  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [hireDate, setHireDate] = useState('');

  // Employment
  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] =
    useState<(typeof EMPLOYMENT_TYPES)[number]>('FULL_TIME');
  const [payType, setPayType] = useState<(typeof PAY_TYPES)[number]>('HOURLY');
  const [hourlyRate, setHourlyRate] = useState('');
  const [salary, setSalary] = useState('');
  const [standardHours, setStandardHours] = useState('40');

  // Tax
  const [irdNumber, setIrdNumber] = useState('');
  const [taxCode, setTaxCode] = useState('M');
  const [hasStudentLoan, setHasStudentLoan] = useState(false);
  const [kiwiSaverRate, setKiwiSaverRate] = useState('RATE_3');

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<FormBankAccount[]>([
    {
      bankName: 'ANZ',
      bankBranch: '',
      accountNumber: '',
      accountType: 'CHECKING',
      isPrimary: true,
    },
  ]);

  // Deductions
  const [selectedDeductions, setSelectedDeductions] = useState<
    Array<{
      deductionTypeId: string;
      percentage?: number;
      fixedAmount?: number;
    }>
  >([]);

  // Initialize form with employee data
  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName || '');
      setLastName(employee.lastName || '');
      setPreferredName(employee.preferredName || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setMobile(employee.mobile || '');
      setEmergencyContactName(employee.emergencyContactName || '');
      setEmergencyContactPhone(employee.emergencyContactPhone || '');
      setAddressLine1(employee.addressLine1 || '');
      setAddressLine2(employee.addressLine2 || '');
      setCity(employee.city || '');
      setRegion(employee.region || '');
      setPostalCode(employee.postalCode || '');
      setEmployeeNumber(employee.employeeNumber || '');
      setHireDate(employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '');

      if (employee.primaryEmployment) {
        setPositionTitle(employee.primaryEmployment.positionTitle || '');
        setDepartment(employee.primaryEmployment.department || '');
        setEmploymentType(employee.primaryEmployment.employmentType || 'FULL_TIME');
        setPayType(employee.primaryEmployment.payType || 'HOURLY');
        setHourlyRate(employee.primaryEmployment.hourlyRate?.toString() || '');
        setSalary(employee.primaryEmployment.salaryAmount?.toString() || '');
        setStandardHours(employee.primaryEmployment.standardHoursPerWeek?.toString() || '40');
      }

      if (employee.taxDetails) {
        setIrdNumber(employee.taxDetails.irdNumber || '');
        setTaxCode(employee.taxDetails.taxCode || 'M');
        setHasStudentLoan(employee.taxDetails.hasStudentLoan || false);
        // kiwiSaverRate is stored separately, use default if not available
        setKiwiSaverRate('RATE_3');
      }

      if (employee.bankAccounts && employee.bankAccounts.length > 0) {
        setBankAccounts(employee.bankAccounts);
      }
    }
  }, [employee]);

  const handleSubmit = async () => {
    // Validation
    if (!firstName || !lastName || !email) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const employeeData = {
        // Personal
        firstName,
        lastName,
        preferredName: preferredName || undefined,
        email,
        phone: phone || undefined,
        mobile: mobile || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        region: region || undefined,
        postalCode: postalCode || undefined,
        employeeNumber: employeeNumber || undefined,
        hireDate: hireDate ? new Date(hireDate) : new Date(),

        // Employment
        positionTitle,
        department: department || undefined,
        employmentType,
        payType,
        hourlyRate: payType === 'HOURLY' ? parseFloat(hourlyRate) || undefined : undefined,
        annualSalary: payType === 'SALARY' ? parseFloat(salary) || undefined : undefined,
        standardHoursPerWeek: parseFloat(standardHours) || 40,

        // Tax
        irdNumber,
        taxCode,
        hasStudentLoan,
        kiwiSaverRate,

        // Bank Accounts
        bankAccounts,

        // Deductions
        deductions: selectedDeductions,
      };

      if (employee) {
        await updateEmployee.mutateAsync({ employeeId: employee.employeeId, ...employeeData });
        showToast('Employee updated successfully', 'success');
      } else {
        await createEmployee.mutateAsync(employeeData);
        showToast('Employee created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to save employee', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      {
        bankName: 'ANZ',
        bankBranch: '',
        accountNumber: '',
        accountType: 'CHECKING',
        isPrimary: false,
      },
    ]);
  };

  const removeBankAccount = (index: number) => {
    if (bankAccounts.length > 1) {
      const updated = bankAccounts.filter((_, i) => i !== index);
      // Ensure one is primary
      if (!updated.some(a => a.isPrimary)) {
        updated[0].isPrimary = true;
      }
      setBankAccounts(updated);
    }
  };

  const updateBankAccount = (
    index: number,
    field: keyof Omit<HRBankAccount, 'bankAccountId'>,
    value: any
  ) => {
    const updated = [...bankAccounts];
    if (field === 'isPrimary') {
      updated.forEach((acc, i) => (acc.isPrimary = i === index));
    } else {
      (updated[index] as any)[field] = value;
    }
    setBankAccounts(updated);
  };

  const toggleDeduction = (deductionTypeId: string, category: string) => {
    // Skip tax-related deductions (they're handled separately)
    if (category === 'TAX' || category === 'KIWISAVER' || category === 'ACC') return;

    const existing = selectedDeductions.find(d => d.deductionTypeId === deductionTypeId);
    if (existing) {
      setSelectedDeductions(selectedDeductions.filter(d => d.deductionTypeId !== deductionTypeId));
    } else {
      setSelectedDeductions([...selectedDeductions, { deductionTypeId, percentage: 0 }]);
    }
  };

  const updateDeduction = (
    deductionTypeId: string,
    field: 'percentage' | 'fixedAmount',
    value: number
  ) => {
    setSelectedDeductions(
      selectedDeductions.map(d =>
        d.deductionTypeId === deductionTypeId ? { ...d, [field]: value } : d
      )
    );
  };

  const tabs = [
    { key: 'personal' as TabType, label: 'Personal', icon: '👤' },
    { key: 'employment' as TabType, label: 'Employment', icon: '💼' },
    { key: 'tax' as TabType, label: 'Tax (NZ)', icon: '🏛️' },
    { key: 'bank' as TabType, label: 'Bank', icon: '🏦' },
    { key: 'deductions' as TabType, label: 'Deductions', icon: '💸' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-primary-400 border-primary-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Preferred Name
                  </label>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={e => setPreferredName(e.target.value)}
                    placeholder="What they prefer to be called"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0X-XXX-XXXX"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="02X-XXX-XXXX"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={e => setEmergencyContactName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={e => setEmergencyContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Employee Number
                  </label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={e => setEmployeeNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Hire Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={e => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={e => setAddressLine2(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Employment Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Position Title
                  </label>
                  <input
                    type="text"
                    value={positionTitle}
                    onChange={e => setPositionTitle(e.target.value)}
                    placeholder="e.g., Warehouse Picker"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g., Operations"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={e => setEmploymentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {EMPLOYMENT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Pay Type</label>
                  <select
                    value={payType}
                    onChange={e => setPayType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {PAY_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {payType === 'HOURLY' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Hourly Rate (NZD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                      placeholder="25.50"
                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Annual Salary (NZD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      placeholder="55000"
                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Standard Hours/Week
                  </label>
                  <input
                    type="number"
                    value={standardHours}
                    onChange={e => setStandardHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">New Zealand Tax Information</h3>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  ℹ️ All employees must have a valid IRD number and tax code for PAYE calculations.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IRD Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={irdNumber}
                  onChange={e => setIrdNumber(e.target.value)}
                  placeholder="12-345-678"
                  maxLength={10}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Format: XX-XXX-XXX</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tax Code (IRD)
                </label>
                <div className="space-y-2">
                  {NZ_TAX_CODES.map(code => (
                    <label
                      key={code.value}
                      className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                        taxCode === code.value
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="taxCode"
                        value={code.value}
                        checked={taxCode === code.value}
                        onChange={e => setTaxCode(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-white">{code.label}</div>
                        <div className="text-sm text-gray-400">{code.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasStudentLoan}
                    onChange={e => setHasStudentLoan(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20"
                  />
                  <span className="text-sm font-medium text-gray-300">Has Student Loan (SL)</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  KiwiSaver Contribution
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {KIWISAVER_RATES.map(rate => (
                    <button
                      key={rate.value}
                      type="button"
                      onClick={() => setKiwiSaverRate(rate.value)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        kiwiSaverRate === rate.value
                          ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                          : 'border-white/10 hover:border-white/20 text-gray-300'
                      }`}
                    >
                      <div className="font-semibold">{rate.label}</div>
                      <div className="text-xs text-gray-500">Employer: {rate.employer}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Bank Accounts</h3>
                <button
                  type="button"
                  onClick={addBankAccount}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Account
                </button>
              </div>

              <div className="space-y-4">
                {bankAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/50 border border-white/10 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-400">Account {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name="primaryBank"
                            checked={account.isPrimary}
                            onChange={() => updateBankAccount(index, 'isPrimary', true)}
                            className="w-3 h-3"
                          />
                          <span className="text-gray-300">Primary</span>
                        </label>
                        {bankAccounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBankAccount(index)}
                            className="p-1 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <TrashIcon className="h-4 w-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Bank</label>
                        <select
                          value={account.bankName}
                          onChange={e => updateBankAccount(index, 'bankName', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-700 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          {BANKS.map(bank => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={account.bankBranch}
                          onChange={e => updateBankAccount(index, 'bankBranch', e.target.value)}
                          placeholder="e.g., Wellington Central"
                          className="w-full px-2 py-1.5 bg-slate-700 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={account.accountNumber}
                          onChange={e => updateBankAccount(index, 'accountNumber', e.target.value)}
                          placeholder="XX-XXXX-XXXXXXX-XX"
                          className="w-full px-2 py-1.5 bg-slate-700 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'deductions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Additional Deductions</h3>

              <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  💡 PAYE, KiwiSaver, and ACC deductions are calculated automatically based on tax
                  settings.
                </p>
              </div>

              <div className="space-y-2">
                {deductionTypes
                  .filter(
                    d => d.category !== 'TAX' && d.category !== 'KIWISAVER' && d.category !== 'ACC'
                  )
                  .map(deduction => {
                    const selected = selectedDeductions.find(
                      d => d.deductionTypeId === deduction.deductionTypeId
                    );
                    return (
                      <div
                        key={deduction.deductionTypeId}
                        className={`border rounded-lg p-3 ${
                          selected ? 'border-primary-500 bg-primary-500/5' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() =>
                                toggleDeduction(deduction.deductionTypeId, deduction.category)
                              }
                              className="w-4 h-4 rounded border-white/20"
                            />
                            <span className="font-medium text-white">{deduction.name}</span>
                          </label>
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
                            {deduction.category}
                          </span>
                        </div>

                        {selected && deduction.calculationMethod === 'PERCENTAGE' && (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-400 mb-1">Percentage %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={selected.percentage || 0}
                              onChange={e =>
                                updateDeduction(
                                  deduction.deductionTypeId,
                                  'percentage',
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-2 py-1 bg-slate-700 border border-white/10 rounded text-white text-sm"
                            />
                          </div>
                        )}

                        {selected && deduction.calculationMethod === 'FIXED_AMOUNT' && (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-400 mb-1">
                              Fixed Amount (NZD)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={selected.fixedAmount || 0}
                              onChange={e =>
                                updateDeduction(
                                  deduction.deductionTypeId,
                                  'fixedAmount',
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-2 py-1 bg-slate-700 border border-white/10 rounded text-white text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {deductionTypes.filter(
                d => d.category !== 'TAX' && d.category !== 'KIWISAVER' && d.category !== 'ACC'
              ).length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No additional deduction types available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}
