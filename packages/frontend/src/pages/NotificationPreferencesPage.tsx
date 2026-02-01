/**
 * Notification Preferences page
 *
 * Manage notification delivery preferences including:
 * - Channel enablement (Email, SMS, Push, In-App)
 * - Per-type preferences
 * - Quiet hours configuration
 * - Phone number for SMS
 */

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Badge,
  ToggleSwitch,
  useToast,
} from '@/components/shared';
import {
  ArrowLeftIcon,
  BellIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationStats,
} from '@/services/api';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

const NOTIFICATION_TYPES = [
  {
    key: 'ORDER_CLAIMED',
    label: 'Order Claimed',
    description: 'When an order is claimed by a picker',
  },
  { key: 'ORDER_COMPLETED', label: 'Order Completed', description: 'When an order is completed' },
  { key: 'PICK_UPDATED', label: 'Pick Updated', description: 'When an item is picked' },
  { key: 'INVENTORY_LOW', label: 'Low Inventory', description: 'When stock falls below threshold' },
  {
    key: 'EXCEPTION_REPORTED',
    label: 'Exception Reported',
    description: 'When an exception is logged',
  },
  { key: 'ZONE_ASSIGNED', label: 'Zone Assigned', description: 'When assigned to a picking zone' },
  { key: 'WAVE_CREATED', label: 'Wave Created', description: 'When a picking wave is created' },
  { key: 'SYSTEM_ALERT', label: 'System Alerts', description: 'Critical system notifications' },
];

const CHANNELS = [
  { key: 'email', label: 'Email', icon: EnvelopeIcon, color: 'text-blue-400' },
  { key: 'sms', label: 'SMS', icon: ChatBubbleLeftRightIcon, color: 'text-green-400' },
  { key: 'push', label: 'Push', icon: DevicePhoneMobileIcon, color: 'text-purple-400' },
  { key: 'inApp', label: 'In-App', icon: BellIcon, color: 'text-yellow-400' },
];

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function ChannelToggle({
  channel,
  enabled,
  onToggle,
}: {
  channel: (typeof CHANNELS)[0];
  enabled: boolean;
  onToggle: () => void;
}) {
  const Icon = channel.icon;
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        enabled
          ? 'bg-primary-500/10 border-primary-500/30'
          : 'bg-white/5 border-white/[0.08] hover:border-white/20'
      }`}
    >
      <Icon className={`h-5 w-5 ${enabled ? channel.color : 'text-gray-400'}`} />
      <span className="flex-1 text-left text-sm font-medium text-white">{channel.label}</span>
      <div
        className={`w-10 h-5 rounded-full transition-colors ${
          enabled ? 'bg-primary-500' : 'bg-gray-600'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
          style={{ marginTop: 2 }}
        />
      </div>
    </button>
  );
}

function TypeChannelPreference({
  type,
  channel,
  enabled,
  globalEnabled,
  onToggle,
}: {
  type: (typeof NOTIFICATION_TYPES)[0];
  channel: (typeof CHANNELS)[0];
  enabled: boolean | undefined;
  globalEnabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={!globalEnabled}
      className={`p-2 rounded transition-colors ${
        !globalEnabled
          ? 'opacity-30 cursor-not-allowed'
          : enabled
            ? 'bg-primary-500/20 text-primary-400'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
      title={globalEnabled ? `${channel.label} for ${type.label}` : `Enable ${channel.label} first`}
    >
      <channel.icon className="h-4 w-4" />
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const { data: stats } = useNotificationStats();
  const updatePreferences = useUpdateNotificationPreferences();

  // Local state for form
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [smsPhone, setSmsPhone] = useState('');
  const [typePreferences, setTypePreferences] = useState<Record<string, any>>({});

  // Sync with API data
  useState(() => {
    if (preferences) {
      setEmailEnabled(preferences.emailEnabled ?? false);
      setSmsEnabled(preferences.smsEnabled ?? false);
      setPushEnabled(preferences.pushEnabled ?? false);
      setInAppEnabled(preferences.inAppEnabled ?? false);
      setQuietHoursEnabled(preferences.quietHoursEnabled ?? false);
      setQuietHoursStart(preferences.quietHoursStart || '22:00');
      setQuietHoursEnd(preferences.quietHoursEnd || '08:00');
      setSmsPhone(preferences.smsPhone || '');
      setTypePreferences(preferences.typePreferences || {});
    }
  });

  const handleSave = async () => {
    const { showToast } = useToast();
    try {
      await updatePreferences.mutateAsync({
        emailEnabled,
        smsEnabled,
        pushEnabled,
        inAppEnabled,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        smsPhone: smsPhone || undefined,
        typePreferences,
      });
      showToast('Notification preferences saved successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to save notification preferences', 'error');
    }
  };

  const handleTypeChannelToggle = (typeKey: string, channelKey: string) => {
    setTypePreferences(prev => {
      const typePrefs = prev[typeKey] || {};
      const newEnabled = !typePrefs[channelKey];
      return {
        ...prev,
        [typeKey]: {
          ...typePrefs,
          [channelKey]: newEnabled,
        },
      };
    });
  };

  const getTypeChannelEnabled = (typeKey: string, channelKey: string): boolean => {
    return typePreferences[typeKey]?.[channelKey] ?? false;
  };

  const getTypeChannelGlobalEnabled = (channelKey: string): boolean => {
    switch (channelKey) {
      case 'email':
        return emailEnabled;
      case 'sms':
        return smsEnabled;
      case 'push':
        return pushEnabled;
      case 'inApp':
        return inAppEnabled;
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-white text-center py-12">Loading preferences...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Notification Preferences</h1>
            <p className="text-gray-400 text-sm">Manage how you receive notifications</p>
          </div>
          {stats && (
            <Badge variant="info" className="shrink-0">
              {stats.unread} unread
            </Badge>
          )}
        </div>

        {/* Channel Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHANNELS.map(channel => (
              <ChannelToggle
                key={channel.key}
                channel={channel}
                enabled={getTypeChannelGlobalEnabled(channel.key)}
                onToggle={() => {
                  switch (channel.key) {
                    case 'email':
                      setEmailEnabled(!emailEnabled);
                      break;
                    case 'sms':
                      setSmsEnabled(!smsEnabled);
                      break;
                    case 'push':
                      setPushEnabled(!pushEnabled);
                      break;
                    case 'inApp':
                      setInAppEnabled(!inAppEnabled);
                      break;
                  }
                }}
              />
            ))}
          </CardContent>
        </Card>

        {/* SMS Configuration */}
        {smsEnabled && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>SMS Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={smsPhone}
                  onChange={e => setSmsPhone(e.target.value)}
                  placeholder="+64212345678"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Enter your phone number in E.164 format (e.g., +64212345678)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-Type Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notification Type Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {NOTIFICATION_TYPES.map(type => (
                <div
                  key={type.key}
                  className="p-4 rounded-lg bg-white/5 border border-white/[0.08]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{type.label}</h3>
                      <p className="text-gray-400 text-sm">{type.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {CHANNELS.map(channel => (
                      <TypeChannelPreference
                        key={channel.key}
                        type={type}
                        channel={channel}
                        enabled={getTypeChannelEnabled(type.key, channel.key)}
                        globalEnabled={getTypeChannelGlobalEnabled(channel.key)}
                        onToggle={() => handleTypeChannelToggle(type.key, channel.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quiet Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Enable Quiet Hours</h3>
                <p className="text-gray-400 text-sm">
                  Suppress notifications during specific times
                </p>
              </div>
              <ToggleSwitch checked={quietHoursEnabled} onChange={setQuietHoursEnabled} />
            </div>

            {quietHoursEnabled && (
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <MoonIcon className="h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={e => setQuietHoursStart(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <span className="text-gray-400">to</span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={e => setQuietHoursEnd(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <SunIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={updatePreferences.isPending}
            className="min-w-[120px]"
          >
            {updatePreferences.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </div>
  );
}
