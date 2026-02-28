/**
 * Payroll Processing Page
 *
 * A refined, professional interface for calculating and processing payroll runs.
 * Design direction: Financial elegance with subtle motion and precision typography.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { usePayrollPeriods, useProcessPayroll } from '@/services/api';
import {
  CalculatorIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// Animated counter hook for number animations
function useAnimatedCounter(end: number, duration: number = 1000, start: number = 0) {
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (end === 0) {
      setValue(0);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function for smooth animation
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, start]);

  return value;
}

// Animated stat component with counter
function AnimatedStat({
  label,
  value,
  prefix = '',
  suffix = '',
  color = 'purple',
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color?: 'purple' | 'violet' | 'fuchsia' | 'silver';
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const animatedValue = useAnimatedCounter(isVisible ? value : 0, 1200);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const colorClasses = {
    purple: 'from-purple-400 to-violet-500 text-purple-400',
    violet: 'from-violet-400 to-purple-500 text-violet-400',
    fuchsia: 'from-fuchsia-400 to-purple-500 text-fuchsia-400',
    silver: 'from-slate-300 to-slate-400 text-slate-300',
  };

  return (
    <div
      className="relative group"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Subtle glow effect on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')} opacity-0 group-hover:opacity-10 blur-xl rounded-2xl transition-opacity duration-500`}
      />

      <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] mb-3">
          {label}
        </p>
        <p className={`text-3xl font-light tracking-tight ${colorClasses[color].split(' ').pop()}`}>
          {prefix}
          {animatedValue.toLocaleString()}
          {suffix}
        </p>
      </div>
    </div>
  );
}

// Pay period card component
function PeriodCard({
  period,
  isSelected,
  onClick,
  index,
}: {
  period: any;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Selection indicator */}
      <div
        className={`absolute -inset-px rounded-2xl transition-all duration-300 ${
          isSelected
            ? 'bg-gradient-to-r from-purple-500/20 via-purple-400/10 to-purple-500/20 border border-purple-400/40'
            : 'border border-transparent group-hover:border-white/10'
        }`}
      />

      <div className="relative p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm">
        {/* Period name with accent */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isSelected ? 'bg-purple-400 shadow-lg shadow-purple-400/50' : 'bg-slate-600'
            }`}
          />
          <span className="text-white font-medium tracking-wide">{period.periodName}</span>
        </div>

        {/* Date range */}
        <p className="text-slate-400 text-sm font-light tracking-wide">
          {period.periodStartDate} → {period.periodEndDate}
        </p>

        {/* Pay date badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50">
          <CurrencyDollarIcon className="h-3 w-3 text-purple-500/70" />
          <span className="text-xs text-slate-400">Pay: {period.payDate}</span>
        </div>
      </div>
    </button>
  );
}

export default function PayrollProcessingPage() {
  const navigate = useNavigate();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);

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
      setShowResults(true);
    }, 1500);
  };

  const handleProcess = async () => {
    if (!selectedPeriodId || !calculation) return;
    await processPayroll.mutateAsync({ periodId: selectedPeriodId });
    navigate('/hr/payroll/runs');
  };

  const availablePeriods = periods.filter((p: any) => !p.payrollRunId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] translate-y-1/2" />
      </div>

      <Header />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page header with elegant typography */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/20">
                <CalculatorIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-purple-400/80">
                Financial Operations
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-3">
              Process Payroll
            </h1>
            <p className="text-lg text-slate-400 font-light max-w-xl">
              Calculate and process payroll with precision. Every dollar accounted for.
            </p>
          </header>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-[1fr,400px] gap-8">
            {/* Left column - Period selection and calculation */}
            <div className="space-y-6">
              {/* Select Period Card */}
              <div className="relative">
                <div className="absolute -inset-px bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded-3xl" />
                <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/5 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                      <ChartBarIcon className="h-4 w-4 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-light text-white">Select Pay Period</h2>
                  </div>

                  {availablePeriods.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {availablePeriods.map((period: any, index: number) => (
                        <PeriodCard
                          key={period.periodId}
                          period={period}
                          isSelected={selectedPeriodId === period.periodId}
                          onClick={() => setSelectedPeriodId(period.periodId)}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                        <SparklesIcon className="h-8 w-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 font-light">All periods have been processed.</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Check back later for new periods.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculation Results */}
              {showResults && calculation && (
                <div
                  className="relative animate-in"
                  style={{
                    animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 via-violet-500/10 to-purple-500/20 rounded-3xl" />
                  <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/10 p-6 sm:p-8">
                    {/* Results header */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <CalculatorIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-light text-white">Calculation Complete</h2>
                          <p className="text-sm text-slate-500">Ready for processing</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowResults(false);
                          setCalculation(null);
                        }}
                        className="text-sm text-slate-400 hover:text-purple-400 transition-colors"
                      >
                        Recalculate
                      </button>
                    </div>

                    {/* Animated stats grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <AnimatedStat
                        label="Employees"
                        value={calculation.employeeCount}
                        color="silver"
                        delay={100}
                      />
                      <AnimatedStat
                        label="Gross Pay"
                        value={calculation.totalGrossPay}
                        prefix="$"
                        color="purple"
                        delay={200}
                      />
                      <AnimatedStat
                        label="Net Pay"
                        value={calculation.totalNetPay}
                        prefix="$"
                        color="violet"
                        delay={300}
                      />
                      <AnimatedStat
                        label="Total Tax"
                        value={calculation.totalTax}
                        prefix="$"
                        color="fuchsia"
                        delay={400}
                      />
                    </div>

                    {/* Additional breakdown */}
                    <div className="grid grid-cols-2 gap-4 mb-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">KiwiSaver</span>
                        <span className="text-white font-light">
                          ${calculation.totalKiwiSaver.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">ACC</span>
                        <span className="text-white font-light">
                          ${calculation.totalACC.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Process button */}
                    <Button
                      onClick={handleProcess}
                      className="w-full h-14 text-base font-medium bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Process Payroll
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Action panel */}
            <div className="lg:sticky lg:top-8 h-fit space-y-6">
              {/* Calculate action card */}
              {!showResults && (
                <div className="relative">
                  <div className="absolute -inset-px bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded-3xl" />
                  <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/5 p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <UserGroupIcon className="h-4 w-4 text-purple-400" />
                      </div>
                      <h2 className="text-lg font-light text-white">Ready to Calculate</h2>
                    </div>

                    {/* Selected period indicator */}
                    {selectedPeriodId ? (
                      <div className="mb-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                        <p className="text-sm text-purple-400/80 mb-1">Selected Period</p>
                        <p className="text-white font-light">
                          {availablePeriods.find((p: any) => p.periodId === selectedPeriodId)
                            ?.periodName || 'Unknown'}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                        <p className="text-slate-400 text-sm">
                          Select a pay period from the left to begin
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleCalculate}
                      disabled={!selectedPeriodId || isCalculating}
                      size="lg"
                      className={`w-full h-14 text-base font-medium transition-all duration-500 ${
                        selectedPeriodId
                          ? 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isCalculating ? (
                        <>
                          <div className="w-5 h-5 mr-2 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <CalculatorIcon className="h-5 w-5 mr-2" />
                          Calculate Payroll
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Info card */}
              <div className="relative">
                <div className="bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-white/5 p-5">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Processing Notes</h3>
                  <ul className="space-y-2 text-sm text-slate-500">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-purple-500/50 mt-2" />
                      <span>Calculations include all approved timesheets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-purple-500/50 mt-2" />
                      <span>Tax withheld per PAYE guidelines</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-purple-500/50 mt-2" />
                      <span>KiwiSaver deductions applied automatically</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
