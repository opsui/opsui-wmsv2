/**
 * 404 Not Found Page
 *
 * Custom 404 page for better UX when users navigate to non-existent routes
 *
 * ============================================================================
 * AESTHETIC DIRECTION: LOST IN WAREHOUSE
 * ============================================================================
 * A playful yet helpful error experience with warehouse theming:
 * - Dark theme with subtle purple accents
 * - Floating box decorations suggesting lost inventory
 * - Spotlight sweep effect for "searching" visual
 * - Bouncing 404 number for visual interest
 * - Clear helpful actions with industrial aesthetic
 * - Space Grotesk typography for consistent branding
 * ============================================================================
 */

import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  HomeIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/shared';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
      {/* Atmospheric background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl" />

        {/* Floating box decorations */}
        <div className="floating-box absolute top-20 left-20 w-16 h-16 bg-gray-800/30 border border-gray-700/50 rounded-lg" />
        <div className="floating-box absolute bottom-32 right-32 w-12 h-12 bg-gray-800/30 border border-gray-700/50 rounded-lg" />
        <div className="floating-box absolute top-1/3 right-20 w-10 h-10 bg-gray-800/30 border border-gray-700/50 rounded-lg" />
      </div>

      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        {/* 404 Icon with spotlight effect */}
        <div className="flex justify-center">
          <div className="relative spotlight-effect rounded-full">
            <div className="flex items-center justify-center w-32 h-32 rounded-full bg-error-500/20 border border-error-500/30">
              <ExclamationTriangleIcon className="h-16 w-16 text-error-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 border-2 border-error-500/50 shadow-lg shadow-error-500/20">
              <span className="lost-404-text text-xl font-bold text-error-400 font-['JetBrains_Mono',monospace]">
                404
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div
          className="space-y-3"
          style={{ animation: 'lost-fade-in 0.5s ease-out 0.2s backwards' }}
        >
          <h1 className="text-4xl font-bold text-white font-['Space_Grotesk',sans-serif]">
            Lost in the Warehouse
          </h1>
          <p className="text-gray-400 text-lg">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <p className="text-gray-500 text-sm">
            The page may have been moved, deleted, or there might be a typo in the URL.
          </p>
        </div>

        {/* Suggested Actions */}
        <div
          className="lost-warehouse-container rounded-xl p-6 border border-gray-700/50 space-y-4"
          style={{ animation: 'lost-fade-in 0.5s ease-out 0.3s backwards' }}
        >
          <h2 className="text-white font-semibold flex items-center justify-center gap-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-purple-400" />
            What can you do?
          </h2>
          <ul className="text-sm text-gray-400 space-y-2 text-left">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500/50 rounded-full" />
              Check the URL for spelling mistakes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500/50 rounded-full" />
              Try going back to the previous page
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500/50 rounded-full" />
              Use the navigation menu to find what you need
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500/50 rounded-full" />
              Contact support if you believe this is an error
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          style={{ animation: 'lost-fade-in 0.5s ease-out 0.4s backwards' }}
        >
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Go Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2"
          >
            <HomeIcon className="h-5 w-5" />
            Return Home
          </Button>
        </div>

        {/* Help Link */}
        <div
          className="text-sm text-gray-500"
          style={{ animation: 'lost-fade-in 0.5s ease-out 0.5s backwards' }}
        >
          Need help?{' '}
          <a
            href="mailto:support@warehouse-management.com"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
