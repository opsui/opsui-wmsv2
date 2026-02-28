/**
 * Leave Requests Page
 *
 * A human-centered interface for managing leave requests and balances.
 * Design direction: Warm, approachable HR aesthetic with calendar visualization.
 */

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useLeaveRequests, useLeaveBalances } from '@/services/api';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  SunIcon,
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
  PlusIcon,
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

// Animated circular progress for leave balance
function BalanceRing({
  available,
  total,
  label,
  color = 'purple',
  delay = 0,
}: {
  available: number;
  total: number;
  label: string;
  color?: 'purple' | 'violet' | 'fuchsia' | 'amethyst';
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const percentage = total > 0 ? (available / total) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - (isVisible ? (percentage / 100) * circumference : circumference);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const colorClasses = {
    purple: {
      stroke: 'stroke-purple-400',
      bg: 'stroke-purple-900/30',
      text: 'text-purple-400',
      glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]',
    },
    violet: {
      stroke: 'stroke-violet-400',
      bg: 'stroke-violet-900/30',
      text: 'text-violet-400',
      glow: 'drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]',
    },
    fuchsia: {
      stroke: 'stroke-fuchsia-400',
      bg: 'stroke-fuchsia-900/30',
      text: 'text-fuchsia-400',
      glow: 'drop-shadow-[0_0_8px_rgba(232,121,249,0.4)]',
    },
    amethyst: {
      stroke: 'stroke-purple-300',
      bg: 'stroke-purple-900/30',
      text: 'text-purple-300',
      glow: 'drop-shadow-[0_0_8px_rgba(196,181,253,0.4)]',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className={colors.bg} />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={`${colors.stroke} ${colors.glow}`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: `stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${delay + 200}ms`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className={`text-2xl font-light ${colors.text}`}>{available}</span>
          <span className="text-slate-500 text-sm block">days</span>
        </div>
      </div>
      <span className="mt-2 text-xs text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// Mini calendar preview component
function MiniCalendar({ startDate, endDate }: { startDate: string; endDate: string }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get days in the range
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className="flex items-center gap-1">
      {days.slice(0, 5).map((day, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center"
        >
          <span className="text-xs text-purple-400">{day.getDate()}</span>
        </div>
      ))}
      {days.length > 5 && (
        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
          <span className="text-xs text-slate-400">+{days.length - 5}</span>
        </div>
      )}
    </div>
  );
}

// Request card with hover effects
function RequestCard({
  request,
  index,
  onApprove,
  onReject,
}: {
  request: any;
  index: number;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className="group relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 via-transparent to-violet-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />

      <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-colors duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-400 uppercase tracking-wider">Pending</span>
            </div>
            <h3 className="text-lg font-light text-white">
              {request.startDate} → {request.endDate}
            </h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
            <ClockIcon className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-white">{request.totalDays} days</span>
          </div>
        </div>

        {/* Calendar preview */}
        <div className="mb-4">
          <MiniCalendar startDate={request.startDate} endDate={request.endDate} />
        </div>

        {/* Reason */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 mb-4">
          <p className="text-sm text-slate-400 italic">
            "{request.reason || 'No reason provided'}"
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onApprove}
            className="flex-1 h-11 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-medium shadow-lg shadow-purple-500/20 transition-all duration-300"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="ghost"
            onClick={onReject}
            className="h-11 px-4 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <XCircleIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Balance card with animated fill
function BalanceCard({ balance, index }: { balance: any; index: number }) {
  const { ref, isInView } = useInView(0.1);
  const percentage =
    balance.ytdAccrued > 0 ? Math.min((balance.currentBalance / balance.ytdAccrued) * 100, 100) : 0;

  return (
    <div
      ref={ref}
      className="group relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
      }}
    >
      <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">{balance.leaveType?.name || 'Leave Type'}</h4>
          <span
            className={`text-2xl font-light ${percentage > 30 ? 'text-purple-400' : 'text-fuchsia-400'}`}
          >
            {balance.currentBalance}
            <span className="text-sm text-slate-500 ml-1">hrs</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              percentage > 50
                ? 'bg-gradient-to-r from-purple-500 to-violet-400'
                : percentage > 25
                  ? 'bg-gradient-to-r from-violet-500 to-purple-400'
                  : 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-400'
            }`}
            style={{
              width: isInView ? `${percentage}%` : '0%',
              transitionDelay: `${index * 100 + 200}ms`,
            }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>Accrued: {balance.ytdAccrued}h</span>
          <span>Taken: {balance.ytdTaken}h</span>
        </div>
      </div>
    </div>
  );
}

export default function LeaveRequestsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'balances'>('pending');
  const { data: requests = [] } = useLeaveRequests({ status: 'PENDING' });
  const { data: balances = [] } = useLeaveBalances();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] translate-y-1/2" />
      </div>

      <Header />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 shadow-lg shadow-purple-500/20">
                <SunIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-purple-400/80">
                Time Off
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-3">
              Leave Management
            </h1>
            <p className="text-lg text-slate-400 font-light max-w-xl">
              Review requests and manage your team's time off.
            </p>
          </header>

          {/* Tabs with animated indicator */}
          <div className="relative mb-8">
            <div className="flex gap-1 p-1 rounded-xl bg-slate-900/50 border border-white/5 w-fit">
              <button
                onClick={() => setActiveTab('pending')}
                className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'pending' ? 'text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                {activeTab === 'pending' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg shadow-lg shadow-purple-500/25" />
                )}
                <span className="relative flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  Pending
                  {requests.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        activeTab === 'pending'
                          ? 'bg-white/20 text-white'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {requests.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('balances')}
                className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'balances' ? 'text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                {activeTab === 'balances' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg shadow-lg shadow-purple-500/25" />
                )}
                <span className="relative flex items-center gap-2">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Leave Balances
                </span>
              </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'pending' ? (
            <>
              {requests.length === 0 ? (
                <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5 p-12 text-center">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <SparklesIcon className="h-64 w-64 text-white" />
                  </div>

                  <div className="relative">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <CheckCircleIcon className="h-10 w-10 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-light text-white mb-3">All caught up!</h3>
                    <p className="text-slate-400 font-light max-w-md mx-auto">
                      No pending leave requests. Your team's requests will appear here for approval.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {requests.map((request: any, index: number) => (
                    <RequestCard
                      key={request.requestId}
                      request={request}
                      index={index}
                      onApprove={() => {
                        /* Approve logic */
                      }}
                      onReject={() => {
                        /* Reject logic */
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Balance rings visualization */}
              {balances.length > 0 && (
                <div className="mb-10 p-8 rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-6 text-center">
                    Available Leave Balance
                  </h3>
                  <div className="flex flex-wrap justify-center gap-8">
                    {balances.slice(0, 4).map((balance: any, index: number) => (
                      <BalanceRing
                        key={balance.balanceId}
                        available={Math.floor(balance.currentBalance / 8)} // Convert hours to days
                        total={Math.floor((balance.ytdAccrued || 20) / 8)}
                        label={balance.leaveType?.name?.split(' ')[0] || 'Leave'}
                        color={(['purple', 'violet', 'fuchsia', 'amethyst'] as const)[index % 4]}
                        delay={index * 150}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed balances */}
              {balances.length === 0 ? (
                <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5 p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <CalendarDaysIcon className="h-10 w-10 text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-light text-white mb-3">No balances available</h3>
                  <p className="text-slate-400 font-light">Leave balance information not found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {balances.map((balance: any, index: number) => (
                    <BalanceCard key={balance.balanceId} balance={balance} index={index} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
