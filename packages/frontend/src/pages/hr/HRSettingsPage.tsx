/**
 * HR Settings Page
 *
 * A polished, organized interface for configuring HR and Payroll settings.
 * Design direction: Professional settings with visual organization and depth.
 */

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { useDeductionTypes, useLeaveTypes } from '@/services/api';
import { 
  CogIcon, 
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

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

// Animated toggle switch
function ToggleSwitch({ 
  enabled, 
  onChange,
  size = 'md'
}: { 
  enabled: boolean; 
  onChange?: () => void;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' }
  };

  return (
    <button
      onClick={onChange}
      className={`
        relative inline-flex items-center rounded-full transition-all duration-300
        ${sizeClasses[size].track}
        ${enabled 
          ? 'bg-gradient-to-r from-teal-500 to-teal-400 shadow-lg shadow-teal-500/25' 
          : 'bg-slate-700'
        }
      `}
    >
      <span
        className={`
          inline-block rounded-full bg-white shadow-sm transition-all duration-300
          ${sizeClasses[size].thumb}
          ${enabled ? sizeClasses[size].translate : 'translate-x-0.5'}
          ${enabled ? 'shadow-teal-500/20' : ''}
        `}
      />
    </button>
  );
}

// Settings item with hover effects
function SettingsItem({ 
  item, 
  index,
  onToggle
}: { 
  item: any; 
  index: number;
  onToggle?: () => void;
}) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div 
      ref={ref}
      className="group relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateX(0)' : 'translateX(-20px)',
        transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 50}ms`
      }}
    >
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-transparent hover:border-teal-500/20 hover:bg-slate-800/50 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-teal-400' : 'bg-slate-500'}`} />
          <div>
            <p className="text-white font-medium group-hover:text-teal-400 transition-colors">{item.name}</p>
            <p className="text-sm text-slate-500">
              {item.category || item.accrualRate} 
              {item.calculationMethod && ` • ${item.calculationMethod}`}
              {item.accrualFrequency && ` hrs/${item.accrualFrequency}`}
              {item.isPaid !== undefined && ` • ${item.isPaid ? 'Paid' : 'Unpaid'}`}
            </p>
          </div>
        </div>
        <ToggleSwitch enabled={item.isActive} onChange={onToggle} size="sm" />
      </div>
    </div>
  );
}

// Settings section card
function SettingsSection({ 
  title, 
  icon: Icon, 
  iconColor = 'teal',
  children,
  index = 0
}: { 
  title: string; 
  icon: React.ElementType; 
  iconColor?: 'teal' | 'amber' | 'violet' | 'rose';
  children: React.ReactNode;
  index?: number;
}) {
  const { ref, isInView } = useInView(0.1);

  const iconColors = {
    teal: 'from-teal-400 to-teal-600 shadow-teal-500/20',
    amber: 'from-amber-400 to-amber-600 shadow-amber-500/20',
    violet: 'from-violet-400 to-violet-600 shadow-violet-500/20',
    rose: 'from-rose-400 to-rose-600 shadow-rose-500/20',
  };

  return (
    <div 
      ref={ref}
      className="relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`
      }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5">
        {/* Section header */}
        <div className="flex items-center gap-3 p-6 border-b border-slate-700/30">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColors[iconColor]} flex items-center justify-center shadow-lg`}>
            <Icon className="h-5 w-5 text-slate-900" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-light text-white">{title}</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Section content */}
        <div className="p-4 space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

// Info card with icon
function InfoCard({ 
  label, 
  value, 
  icon: Icon,
  delay = 0
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className="relative group"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
      }}
    >
      <div className="p-5 rounded-xl bg-slate-800/30 border border-white/5 hover:border-teal-500/20 transition-colors duration-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-white font-light mt-1">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HRSettingsPage() {
  const { data: deductionTypes = [] } = useDeductionTypes();
  const { data: leaveTypes = [] } = useLeaveTypes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] translate-y-1/2" />
        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <Header />
      
      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/20">
                <CogIcon className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-violet-400/80">Configuration</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-3">
              HR Settings
            </h1>
            <p className="text-lg text-slate-400 font-light max-w-xl">
              Configure HR and payroll system settings for your organization.
            </p>
          </header>

          {/* Settings grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Deduction Types */}
            <SettingsSection 
              title="Deduction Types" 
              icon={AdjustmentsHorizontalIcon}
              iconColor="teal"
              index={0}
            >
              {deductionTypes.length > 0 ? (
                deductionTypes.map((type: any, index: number) => (
                  <SettingsItem 
                    key={type.deductionTypeId} 
                    item={type} 
                    index={index}
                  />
                ))
              ) : (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/50 flex items-center justify-center">
                    <AdjustmentsHorizontalIcon className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-slate-500 text-sm">No deduction types configured</p>
                </div>
              )}
            </SettingsSection>

            {/* Leave Types */}
            <SettingsSection 
              title="Leave Types" 
              icon={CalendarDaysIcon}
              iconColor="amber"
              index={1}
            >
              {leaveTypes.length > 0 ? (
                leaveTypes.map((type: any, index: number) => (
                  <SettingsItem 
                    key={type.leaveTypeId} 
                    item={type} 
                    index={index}
                  />
                ))
              ) : (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/50 flex items-center justify-center">
                    <CalendarDaysIcon className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-slate-500 text-sm">No leave types configured</p>
                </div>
              )}
            </SettingsSection>
          </div>

          {/* NZ Tax Configuration */}
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-r from-violet-500/10 via-transparent to-teal-500/10 rounded-3xl" />
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/20">
                  <ShieldCheckIcon className="h-5 w-5 text-slate-900 m-auto mt-2.5" />
                </div>
                <div>
                  <h2 className="text-xl font-light text-white">NZ Tax Configuration</h2>
                  <p className="text-sm text-slate-500">Automatically updated tax tables</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <InfoCard 
                  label="PAYE Tax Tables" 
                  value="2024/2025 IRD Rates" 
                  icon={DocumentTextIcon}
                  delay={100}
                />
                <InfoCard 
                  label="KiwiSaver Rates" 
                  value="3% - 10% Employee" 
                  icon={BanknotesIcon}
                  delay={200}
                />
                <InfoCard 
                  label="ACC Levy" 
                  value="1.46% (capped)" 
                  icon={ShieldCheckIcon}
                  delay={300}
                />
              </div>

              <div className="flex items-center gap-2 p-4 rounded-xl bg-teal-500/5 border border-teal-500/10">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <p className="text-sm text-slate-400">
                  Tax tables are updated automatically. Contact HR Administrator for changes to tax rates.
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" className="gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              Export Configuration
            </Button>
            <Button variant="ghost" className="gap-2">
              <CogIcon className="h-4 w-4" />
              Advanced Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}