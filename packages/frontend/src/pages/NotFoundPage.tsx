/**
 * 404 Not Found Page
 *
 * Custom 404 page for better UX when users navigate to non-existent routes
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
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* 404 Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex items-center justify-center w-32 h-32 rounded-full bg-error-500/20">
              <ExclamationTriangleIcon className="h-16 w-16 text-error-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 border-2 border-error-500">
              <span className="text-xl font-bold text-error-400">404</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-white">Page Not Found</h1>
          <p className="text-gray-400 text-lg">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <p className="text-gray-500 text-sm">
            The page may have been moved, deleted, or there might be a typo in the URL.
          </p>
        </div>

        {/* Suggested Actions */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <h2 className="text-white font-semibold flex items-center justify-center gap-2">
            <MagnifyingGlassIcon className="h-5 w-5" />
            What can you do?
          </h2>
          <ul className="text-sm text-gray-400 space-y-2 text-left">
            <li>• Check the URL for spelling mistakes</li>
            <li>• Try going back to the previous page</li>
            <li>• Use the navigation menu to find what you need</li>
            <li>• Contact support if you believe this is an error</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2"
          >
            <HomeIcon className="h-5 w-5" />
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Go Back
          </Button>
        </div>

        {/* Help Link */}
        <div className="text-sm text-gray-500">
          Need help?{' '}
          <a
            href="mailto:support@warehouse-management.com"
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
