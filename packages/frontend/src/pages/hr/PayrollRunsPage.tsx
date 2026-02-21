/**
 * Payroll Runs History Page
 *
 * A refined timeline-style view of processed payroll runs.
 * Design direction: Financial elegance with subtle motion and depth.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { usePayrollRuns } from '@/services/api';
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

// Animated counter hook
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

// Intersection observer hook for scroll animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Stat mini-component with animated counter
function MiniStat({ 
  label, 
  value, 
  prefix = '', 
  color = 'white',
  animate = true
}: { 
  label: string; 
  value: number;
  prefix?: string;
  color?: 'white' | 'emerald' | 'coral' | 'amber';
  animate?: boolean;
}) {
  const animatedValue = useAnimatedCounter(animate ? value : 0, 800);
  
  const colorClasses = {
    white: 'text-white',
    emerald: 'text-emerald-400',
    coral: 'text-rose-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-light ${colorClasses[color]}`}>
        {prefix}{(animate ? animatedValue : value).toLocaleString()}
      </p>
    </div>
  );
}

// Timeline item component
function TimelineItem({ run, index }: { run: any; index: number }) {
  const { ref, isInView } = useInView(0.1);
  const isEven = index % 2 === 0;
  
  return (
    <div 
      ref={ref}
      className="relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateX(0)' : `translateX(${isEven ? '-30px' : '30px'})`,
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`
      }}
    >
      {/* Timeline connector */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/50 via-slate-700 to-transparent -translate-x-1/2 hidden lg:block" />
      
      {/* Timeline node */}
      <div className="absolute left-1/2 -translate-x-1/2 top-8 hidden lg:block">
        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${
          isInView 
            ? 'bg-amber-400 border-amber-400/50 shadow-lg shadow-amber-400/30' 
            : 'bg-slate-700 border-slate-600'
        }`} />
      </div>

      {/* Content card */}
      <div className={`lg:grid lg:grid-cols-2 lg:gap-8 ${isEven ? '' : 'lg:direction-rtl'}`}>
        {/* Spacer for alternating layout */}
        <div className={`${isEven ? 'lg:pr-12' : 'lg:col-start-2 lg:pl-12'}`}>
          <Link 
            to={`/hr/payroll/runs/${run.payrollRunId}`}
            className="group block"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 hover:border-amber-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/5">
              {/* Hover gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative p-6">
                {/* Header row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                      isInView 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30' 
                        : 'bg-slate-700'
                    }`}>
                      <DocumentTextIcon className="h-5 w-5 text-slate-900" />
                    </div>
                    <div>
                      <h3 className="text-lg font-light text-white group-hover:text-amber-400 transition-colors">
                        Payroll Run #{run.runNumber}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <ClockIcon className="h-3 w-3" />
                        {run.processedAt ? new Date(run.processedAt).toLocaleDateString('en-NZ', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">Processed</span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <MiniStat 
                    label="Employees" 
                    value={run.employeeCount || 0} 
                    color="white"
                    animate={isInView}
                  />
                  <MiniStat 
                    label="Gross" 
                    value={run.totalGrossPay || 0} 
                    prefix="$" 
                    color="amber"
                    animate={isInView}
                  />
                  <MiniStat 
                    label="Net" 
                    value={run.totalNetPay || 0} 
                    prefix="$" 
                    color="emerald"
                    animate={isInView}
                  />
                  <MiniStat 
                    label="Tax" 
                    value={run.totalTax || 0} 
                    prefix="$" 
                    color="coral"
                    animate={isInView}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/30">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Pay Period: {run.periodName || 'Standard'}</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Summary stats card
function SummaryCard({ runs }: { runs: any[] }) {
  const { ref, isInView } = useInView(0.1);
  
  const totals = runs.reduce((acc, run) => ({
    employees: acc.employees + (run.employeeCount || 0),
    gross: acc.gross + (run.totalGrossPay || 0),
    net: acc.net + (run.totalNetPay || 0),
    tax: acc.tax + (run.totalTax || 0),
  }), { employees: 0, gross: 0, net: 0, tax: 0 });

  return (
    <div 
      ref={ref}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5 p-6 sm:p-8"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
            <CurrencyDollarIcon className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-light text-white">Total Summary</h3>
            <p className="text-xs text-slate-500">All processed payroll runs</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Total Runs</p>
            <p className="text-3xl font-light text-white">{runs.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Employees Paid</p>
            <p className="text-3xl font-light text-white">{totals.employees.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Total Net Pay</p>
            <p className="text-3xl font-light text-emerald-400">${totals.net.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Total Tax</p>
            <p className="text-3xl font-light text-rose-400">${totals.tax.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollRunsPage() {
  const { data: runs = [], isLoading } = usePayrollRuns(50);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] translate-y-1/2" />
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <Header />
      
      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
                <ClockIcon className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-amber-400/80">Payroll History</span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-3">
                  Payroll Runs
                </h1>
                <p className="text-lg text-slate-400 font-light max-w-xl">
                  A chronological view of all processed payroll runs.
                </p>
              </div>
              
              <Link to="/hr/payroll/process">
                <Button className="h-12 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-medium shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Pay Run
                </Button>
              </Link>
            </div>
          </header>

          {/* Loading state */}
          {isLoading ? (
            <div className="relative rounded-3xl bg-slate-900/50 border border-white/5 p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                <span className="text-slate-400 font-light">Loading payroll history...</span>
              </div>
            </div>
          ) : runs.length === 0 ? (
            /* Empty state */
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5 p-12 text-center">
              {/* Decorative element */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                <DocumentTextIcon className="h-64 w-64 text-white" />
              </div>
              
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                  <DocumentTextIcon className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-2xl font-light text-white mb-3">No payroll runs yet</h3>
                <p className="text-slate-400 font-light max-w-md mx-auto mb-8">
                  Process your first payroll run to see your payment history appear here.
                </p>
                <Link to="/hr/payroll/process">
                  <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-medium shadow-lg shadow-amber-500/25">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Process First Payroll
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="mb-12">
                <SummaryCard runs={runs} />
              </div>

              {/* Timeline section label */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Chronological History</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              </div>

              {/* Timeline */}
              <div className="space-y-6 lg:space-y-12">
                {runs.map((run: any, index: number) => (
                  <TimelineItem key={run.payrollRunId} run={run} index={index} />
                ))}
              </div>

              {/* Load more indicator */}
              {runs.length >= 50 && (
                <div className="mt-12 text-center">
                  <p className="text-sm text-slate-500 font-light">
                    Showing most recent {runs.length} runs
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}