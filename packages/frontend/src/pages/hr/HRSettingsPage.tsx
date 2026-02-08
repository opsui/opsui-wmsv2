/**
 * HR Settings Page
 *
 * Configure HR and Payroll settings
 */

import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';
import { useDeductionTypes, useLeaveTypes } from '@/services/api';
import { CogIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export default function HRSettingsPage() {
  const { data: deductionTypes = [] } = useDeductionTypes();
  const { data: leaveTypes = [] } = useLeaveTypes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">HR Settings</h1>
          <p className="text-gray-400">Configure HR and payroll system settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deduction Types */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-white">Deduction Types</h2>
            </div>
            <div className="space-y-2">
              {deductionTypes.map((type: any) => (
                <div
                  key={type.deductionTypeId}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{type.name}</p>
                    <p className="text-sm text-gray-400">
                      {type.category} • {type.calculationMethod}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      type.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {type.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {deductionTypes.length === 0 && (
                <p className="text-center text-gray-400 py-4">No deduction types configured</p>
              )}
            </div>
          </Card>

          {/* Leave Types */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CogIcon className="h-5 w-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-white">Leave Types</h2>
            </div>
            <div className="space-y-2">
              {leaveTypes.map((type: any) => (
                <div
                  key={type.leaveTypeId}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{type.name}</p>
                    <p className="text-sm text-gray-400">
                      {type.accrualRate} hrs/{type.accrualFrequency} •{' '}
                      {type.isPaid ? 'Paid' : 'Unpaid'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      type.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {type.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {leaveTypes.length === 0 && (
                <p className="text-center text-gray-400 py-4">No leave types configured</p>
              )}
            </div>
          </Card>
        </div>

        {/* Info Card */}
        <Card variant="glass" className="p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">NZ Tax Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">PAYE Tax Tables</p>
              <p className="text-white font-medium">2024/2025 IRD Rates</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">KiwiSaver Rates</p>
              <p className="text-white font-medium">3% - 10% Employee</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">ACC Levy</p>
              <p className="text-white font-medium">1.46% (capped)</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Tax tables are updated automatically. Contact HR Administrator for changes to tax rates.
          </p>
        </Card>
      </main>
    </div>
  );
}
