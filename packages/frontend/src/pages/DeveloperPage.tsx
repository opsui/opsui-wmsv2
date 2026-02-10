/**
 * Developer Panel Page
 *
 * Comprehensive developer tools with tabbed interface
 * Only available in development environment
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared';
import { Tabs } from '@/components/shared/Tabs';
import { OverviewTab } from './developer/OverviewTab';
import { FeatureFlagsTab } from './developer/FeatureFlagsTab';
import { MonitoringTab } from './developer/MonitoringTab';
import { DataManagementTab } from './developer/DataManagementTab';
import { TestingToolsTab } from './developer/TestingToolsTab';
import { CrawlerTab } from './developer/CrawlerTab';
import {
  BeakerIcon,
  ChartBarIcon,
  ServerIcon,
  CommandLineIcon,
  BeakerIcon as FlaskIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { type Tab } from '@/components/shared/Tabs';

export default function DeveloperPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Array<{ type: 'success' | 'error'; text: string }>>([]);

  const addMessage = (type: 'success' | 'error', text: string) => {
    setMessages(prev => [...prev, { type, text }]);
    setTimeout(() => {
      setMessages(prev => prev.slice(1));
    }, 5000);
  };

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: ChartBarIcon,
      content: <OverviewTab onAddMessage={addMessage} />,
    },
    {
      id: 'feature-flags',
      label: 'Feature Flags',
      icon: FlaskIcon,
      content: <FeatureFlagsTab />,
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: ServerIcon,
      content: <MonitoringTab />,
    },
    {
      id: 'data',
      label: 'Data Management',
      icon: CommandLineIcon,
      content: <DataManagementTab />,
    },
    {
      id: 'testing',
      label: 'Testing Tools',
      icon: BeakerIcon,
      content: <TestingToolsTab />,
    },
    {
      id: 'crawler',
      label: 'Error Crawler',
      icon: GlobeAltIcon,
      content: <CrawlerTab />,
    },
  ];

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md">
          <div className="text-center p-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 dark:text-white">Developer Panel Unavailable</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The developer panel is only available in development mode.
            </p>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Messages */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 p-3 rounded-lg shadow-lg ${
              msg.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm">{msg.text}</span>
          </div>
        ))}
      </div>

      <div className="w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold dark:text-white flex items-center gap-3">
              <BeakerIcon className="h-8 w-8" />
              Developer Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Development and debugging tools</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to App
          </Button>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} defaultTab="overview" />
      </div>
    </div>
  );
}
