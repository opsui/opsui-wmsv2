/**
 * Notifications Page
 *
 * Displays all notifications for the current user with filtering and management
 *
 * ============================================================================
 * AESTHETIC DIRECTION: ALERT CENTER
 * ============================================================================
 * A priority-focused notification command center:
 * - Dark theme with priority color coding (red/amber/green)
 * - Slide-in animations for new notifications
 * - Visual priority indicators with pulse effects
 * - Clean, scannable layout with clear hierarchy
 * - Monospace timestamps for data consistency
 * - Subtle glow effects on high-priority items
 * ============================================================================
 */

import { Header } from '@/components/shared';
import { NotificationHistory } from '@/components/notifications';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen relative">
      {/* Atmospheric background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header with distinctive styling */}
        <div className="mb-8" style={{ animation: 'notification-slide-in 0.4s ease-out' }}>
          <div className="flex items-center gap-4">
            {/* Priority indicator accent */}
            <div className="flex flex-col gap-1">
              <div className="w-1.5 h-4 bg-red-500 rounded-full" />
              <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
              <div className="w-1.5 h-4 bg-green-500 rounded-full" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk',sans-serif]">
                Notifications
              </h1>
              <p className="mt-1 text-gray-400 font-medium">View and manage your notifications</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          className="grid grid-cols-3 gap-4 mb-8"
          style={{ animation: 'notification-slide-in 0.5s ease-out 0.1s backwards' }}
        >
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-red-400 uppercase tracking-wide">
                High Priority
              </span>
            </div>
            <p className="text-2xl font-bold text-red-400 mt-2 font-['JetBrains_Mono',monospace]">
              —
            </p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                Medium
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-2 font-['JetBrains_Mono',monospace]">
              —
            </p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                Low
              </span>
            </div>
            <p className="text-2xl font-bold text-green-400 mt-2 font-['JetBrains_Mono',monospace]">
              —
            </p>
          </div>
        </div>

        {/* Notification History with enhanced container */}
        <div style={{ animation: 'notification-slide-in 0.6s ease-out 0.2s backwards' }}>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.05] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white font-['Space_Grotesk',sans-serif]">
                Recent Activity
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live updates</span>
              </div>
            </div>
            <NotificationHistory limit={100} />
          </div>
        </div>
      </main>
    </div>
  );
}
