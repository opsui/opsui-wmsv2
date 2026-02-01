/**
 * Connection Status Indicator
 *
 * Shows real-time WebSocket connection status with visual indicator
 * Provides manual reconnect functionality
 */

import { SignalIcon, WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ============================================================================
// HOOK
// ============================================================================

/**
 * useWebSocketConnection - Hook to monitor WebSocket connection status
 * Uses the actual WebSocketService for real-time connection monitoring
 */
import { useWebSocket as useWebSocketService } from '@/hooks/useWebSocket';

export function useWebSocketConnection() {
  const { connectionStatus, socketId, reconnect } = useWebSocketService();

  // Map connection status from useWebSocket to our local types
  const statusMap: Record<string, ConnectionStatus> = {
    connected: 'connected',
    connecting: 'connecting',
    disconnected: 'disconnected',
    error: 'error',
  };

  const status: ConnectionStatus = statusMap[connectionStatus] || 'disconnected';

  return {
    status,
    socketId,
    reconnect,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ className, showLabel = true }: ConnectionStatusProps) {
  const { status, reconnect } = useWebSocketConnection();

  const statusConfig = {
    connecting: {
      icon: WifiIcon,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
      label: 'Connecting...',
      pulse: true,
    },
    connected: {
      icon: SignalIcon,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30',
      label: 'Connected',
      pulse: false,
    },
    disconnected: {
      icon: WifiIcon,
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
      borderColor: 'border-gray-400/30',
      label: 'Disconnected',
      pulse: false,
    },
    error: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
      label: 'Connection Error',
      pulse: false,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
        config.bgColor,
        config.borderColor,
        className
      )}
      title={`WebSocket: ${config.label}`}
    >
      <Icon className={cn('h-4 w-4', config.color, config.pulse && 'animate-pulse')} />
      {showLabel && <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>}
      {status !== 'connected' && status !== 'connecting' && (
        <button onClick={reconnect} className="ml-1 text-xs underline hover:text-white">
          Reconnect
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MINIMAL VERSION (for header)
// ============================================================================

interface ConnectionStatusDotProps {
  className?: string;
}

export function ConnectionStatusDot({ className }: ConnectionStatusDotProps) {
  const { status } = useWebSocketConnection();

  const colors = {
    connecting: 'bg-yellow-400',
    connected: 'bg-green-400',
    disconnected: 'bg-gray-400',
    error: 'bg-red-400',
  };

  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full',
        colors[status],
        status === 'connecting' && 'animate-pulse',
        className
      )}
      title={`WebSocket: ${status}`}
    />
  );
}

// ============================================================================
// FULL PANEL (for settings/debug page)
// ============================================================================

interface ConnectionStatusPanelProps {
  className?: string;
}

export function ConnectionStatusPanel({ className }: ConnectionStatusPanelProps) {
  const { status, socketId, reconnect } = useWebSocketConnection();

  const statusConfig = {
    connecting: {
      icon: WifiIcon,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
      label: 'Connecting',
      description: 'Establishing WebSocket connection...',
    },
    connected: {
      icon: SignalIcon,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30',
      label: 'Connected',
      description: 'Real-time updates are active',
    },
    disconnected: {
      icon: WifiIcon,
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
      borderColor: 'border-gray-400/30',
      label: 'Disconnected',
      description: 'WebSocket connection is not active',
    },
    error: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
      label: 'Connection Error',
      description: 'Failed to establish WebSocket connection',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('p-4 rounded-lg border', config.bgColor, config.borderColor, className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h3 className={cn('text-sm font-medium', config.color)}>{config.label}</h3>
            <p className="text-xs text-gray-400 mt-1">{config.description}</p>
            {socketId && <p className="text-xs text-gray-500 mt-1">Socket ID: {socketId}</p>}
          </div>
        </div>

        {status !== 'connected' && status !== 'connecting' && (
          <button
            onClick={reconnect}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>

      {status === 'connecting' && (
        <div className="mt-3">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
