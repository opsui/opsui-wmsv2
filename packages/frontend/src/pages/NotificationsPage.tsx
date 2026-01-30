/**
 * Notifications Page
 *
 * Displays all notifications for the current user with filtering and management
 */

import { Header } from '@/components/shared';
import { NotificationHistory } from '@/components/notifications';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Notifications</h1>
          <p className="mt-2 text-gray-400">
            View and manage your notifications
          </p>
        </div>

        {/* Notification History */}
        <NotificationHistory limit={100} />
      </main>
    </div>
  );
}
