/**
 * Payroll Processing Page
 *
 * Calculate and process payroll runs
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { usePayrollPeriods, useProcessPayroll } from '@/services/api';
import { CalculatorIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function PayrollProcessingPage() {
  const navigate = useNavigate();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: periods = [] } = usePayrollPeriods();
  const processPayroll = useProcessPayroll();

  const handleCalculate = async () => {
    if (!selectedPeriodId) return;
    setIsCalculating(true);
    // Simulate calculation - in real implementation, call the API
    setTimeout(() => {
      setCalculation({
        periodId: selectedPeriodId,
        employeeCount: 3,
        totalGrossPay: 12500,
        totalNetPay: 9500,
        totalTax: 2000,
        totalKiwiSaver: 500,
        totalACC: 100,
      });
      setIsCalculating(false);
    }, 1000);
  };

  const handleProcess = async () => {
    if (!selectedPeriodId || !calculation) return;
    await processPayroll.mutateAsync({ periodId: selectedPeriodId });
    navigate('/hr/payroll/runs');
  };

  const availablePeriods = periods.filter((p: any) => !p.payrollRunId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Process Payroll</h1>
          <p className="text-gray-400">Calculate and process payroll for a pay period</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Select Period */}
          <Card variant="glass" className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Select Pay Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availablePeriods.map((period: any) => (
                <button
                  key={period.periodId}
                  onClick={() => setSelectedPeriodId(period.periodId)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPeriodId === period.periodId
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-slate-800/30 hover:border-white/30'
                  }`}
                >
                  <p className="text-white font-medium">{period.periodName}</p>
                  <p className="text-sm text-gray-400">
                    {period.periodStartDate} - {period.periodEndDate}
                  </p>
                  <p className="text-sm text-gray-400">Pay date: {period.payDate}</p>
                </button>
              ))}
              {availablePeriods.length === 0 && (
                <p className="text-gray-400 col-span-3 text-center py-4">
                  All periods have been processed. Check back later.
                </p>
              )}
            </div>
          </Card>

          {/* Calculation Result */}
          {calculation && (
            <Card variant="glass" className="p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CalculatorIcon className="h-5 w-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-white">Payroll Calculation</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Employees</p>
                  <p className="text-2xl font-bold text-white">{calculation.employeeCount}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Gross Pay</p>
                  <p className="text-2xl font-bold text-white">
                    ${calculation.totalGrossPay.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Net Pay</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${calculation.totalNetPay.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Tax</p>
                  <p className="text-2xl font-bold text-red-400">
                    ${calculation.totalTax.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleProcess} className="flex-1">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Process Payroll
                </Button>
                <Button variant="secondary" onClick={() => setCalculation(null)}>
                  Recalculate
                </Button>
              </div>
            </Card>
          )}

          {/* Calculate Button */}
          {!calculation && selectedPeriodId && (
            <Card variant="glass" className="p-6 text-center">
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                size="lg"
                className="mx-auto"
              >
                <CalculatorIcon className="h-5 w-5 mr-2" />
                {isCalculating ? 'Calculating...' : 'Calculate Payroll'}
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
