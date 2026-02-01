/**
 * Dashboard Builder component
 *
 * Drag-and-drop dashboard layout builder for organizing reports
 */

import { useState } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  SquaresPlusIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Dashboard, DashboardWidget, Report } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardBuilderProps {
  dashboard?: Dashboard;
  reports: Report[];
  onSave: (
    dashboard: Omit<Dashboard, 'dashboardId' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ) => void;
  onCancel: () => void;
  className?: string;
}

// ============================================================================
// WIDGET CARD COMPONENT
// ============================================================================

interface WidgetCardProps {
  widget: DashboardWidget;
  report: Report | undefined;
  isEditing: boolean;
  isSelected: boolean;
  isDragging?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResize: (size: { width: number; height: number }) => void;
  onPositionChange?: (position: { x: number; y: number; width: number; height: number }) => void;
}

function WidgetCard({
  widget,
  report,
  isEditing,
  isSelected,
  isDragging = false,
  onEdit,
  onDelete,
  onResize,
}: WidgetCardProps) {
  const [, setIsResizing] = useState(false);

  const handleResize = (direction: 'nw' | 'ne' | 'sw' | 'se', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = widget.position.width;
    const startHeight = widget.position.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('e')) newWidth = Math.max(2, startWidth + Math.round(deltaX / 50));
      if (direction.includes('w')) newWidth = Math.max(2, startWidth - Math.round(deltaX / 50));
      if (direction.includes('s')) newHeight = Math.max(2, startHeight + Math.round(deltaY / 50));
      if (direction.includes('n')) newHeight = Math.max(2, startHeight - Math.round(deltaY / 50));

      onResize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={cn(
        'absolute bg-gray-800 rounded-lg border-2 transition-all overflow-hidden group',
        isSelected ? 'border-primary-500 z-10' : 'border-white/[0.08]',
        isDragging && 'opacity-80'
      )}
      style={{
        left: `${widget.position.x * 25}%`,
        top: `${widget.position.y * 10}%`,
        width: `${widget.position.width * 25}%`,
        height: `${widget.position.height * 10}%`,
        minHeight: '100px',
      }}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-2 bg-gray-900/50 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-white truncate">
            {widget.title || report?.name || 'Untitled Widget'}
          </span>
          {report?.chartConfig.enabled && (
            <span className="text-xs text-gray-400">{report.chartConfig.chartType}</span>
          )}
        </div>

        {isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Edit widget"
            >
              <PencilIcon className="h-3 w-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove widget"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Resize Handles */}
      {isEditing && (
        <>
          <div
            className="absolute top-0 right-0 w-3 h-3 cursor-se-resize bg-primary-500/50"
            onMouseDown={e => handleResize('se', e)}
          />
          <div
            className="absolute top-0 left-0 w-3 h-3 cursor-sw-resize bg-primary-500/50"
            onMouseDown={e => handleResize('sw', e)}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-ne-resize bg-primary-500/50"
            onMouseDown={e => handleResize('ne', e)}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3 cursor-nw-resize bg-primary-500/50"
            onMouseDown={e => handleResize('nw', e)}
          />
        </>
      )}

      {/* Widget Preview */}
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <SquaresPlusIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Report visualization</p>
          {report?.chartConfig.chartType && (
            <p className="text-xs mt-1">{report.chartConfig.chartType}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADD WIDGET PANEL
// ============================================================================

interface AddWidgetPanelProps {
  reports: Report[];
  onAddWidget: (reportId: string) => void;
  onClose: () => void;
}

function AddWidgetPanel({ reports, onAddWidget, onClose }: AddWidgetPanelProps) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <h3 className="text-lg font-bold text-white">Add Widget</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {reports.map(report => (
              <button
                key={report.reportId}
                onClick={() => onAddWidget(report.reportId)}
                className="p-4 rounded-lg bg-white/5 border border-white/[0.08] hover:bg-white/10 hover:border-primary-500/30 transition-all text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-white">{report.name}</p>
                  {report.chartConfig.enabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                      {report.chartConfig.chartType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{report.description}</p>
              </button>
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No reports available</p>
              <p className="text-xs mt-1">Create a report first to add it to the dashboard</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD BUILDER COMPONENT
// ============================================================================

export function DashboardBuilder({
  dashboard,
  reports,
  onSave,
  onCancel,
  className,
}: DashboardBuilderProps) {
  const [isEditing, setIsEditing] = useState(!dashboard);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [name, setName] = useState(dashboard?.name || '');
  const [description, setDescription] = useState(dashboard?.description || '');
  const [widgets, setWidgets] = useState<DashboardWidget[]>(dashboard?.widgets || []);
  const [layout, setLayout] = useState(dashboard?.layout || { columns: 4, rows: 6 });
  const [isPublic, setIsPublic] = useState(dashboard?.isPublic || false);

  const handleAddWidget = (reportId: string) => {
    const newWidget: DashboardWidget = {
      widgetId: `widget-${Date.now()}`,
      reportId,
      position: {
        x: 0,
        y: Math.floor(widgets.length / layout.columns) * 2,
        width: 2,
        height: 2,
      },
    };

    setWidgets([...widgets, newWidget]);
    setShowAddWidget(false);
    setSelectedWidgetId(newWidget.widgetId);
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets(widgets.map(w => (w.widgetId === widgetId ? { ...w, ...updates } : w)));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.widgetId !== widgetId));
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      description,
      layout,
      widgets,
      owner: 'current-user', // This would come from auth
      isPublic,
    });
  };

  const gridColumns = Array.from({ length: layout.columns }, (_, i) => i);
  const gridRows = Array.from({ length: layout.rows }, (_, i) => i);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Dashboard Name"
            className="w-full text-lg font-bold text-white bg-transparent border-none focus:outline-none placeholder-gray-500"
            disabled={!isEditing}
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full text-sm text-gray-400 bg-transparent border-none focus:outline-none placeholder-gray-600"
            disabled={!isEditing}
          />
        </div>

        <div className="flex items-center gap-2">
          {dashboard && !isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-white/[0.08] rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="rounded bg-white/5 border-white/[0.08]"
                />
                Public
              </label>
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-white/[0.08] rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  !name.trim()
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                <EyeIcon className="h-4 w-4" />
                Save Dashboard
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {isEditing && (
        <div className="flex items-center justify-between p-3 border-b border-white/[0.08] bg-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddWidget(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Add Widget
            </button>
            <span className="text-xs text-gray-400">
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Grid:</label>
            <select
              value={`${layout.columns}x${layout.rows}`}
              onChange={e => {
                const [cols, rows] = e.target.value.split('x').map(Number);
                setLayout({ columns: cols, rows });
              }}
              className="px-2 py-1 bg-black/20 border border-white/[0.08] text-white rounded text-sm focus:outline-none"
            >
              <option value="4x6">4 x 6</option>
              <option value="4x8">4 x 8</option>
              <option value="6x6">6 x 6</option>
              <option value="6x8">6 x 8</option>
            </select>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-6 bg-black/20">
        <div
          className="relative bg-gray-900 rounded-lg border border-white/[0.08] mx-auto"
          style={{
            width: '100%',
            maxWidth: '1200px',
            height: `${layout.rows * 100}px`,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${100 / layout.columns}% ${100 / layout.rows}%`,
          }}
        >
          {/* Grid Lines */}
          {gridColumns.map(col => (
            <div
              key={`col-${col}`}
              className="absolute top-0 bottom-0 border-l border-white/[0.02]"
              style={{ left: `${((col + 1) / layout.columns) * 100}%` }}
            />
          ))}
          {gridRows.map(row => (
            <div
              key={`row-${row}`}
              className="absolute left-0 right-0 border-t border-white/[0.02]"
              style={{ top: `${((row + 1) / layout.rows) * 100}%` }}
            />
          ))}

          {/* Widgets */}
          {widgets.map(widget => (
            <WidgetCard
              key={widget.widgetId}
              widget={widget}
              report={reports.find(r => r.reportId === widget.reportId)}
              isEditing={isEditing}
              isSelected={selectedWidgetId === widget.widgetId}
              onEdit={() => setSelectedWidgetId(widget.widgetId)}
              onDelete={() => handleDeleteWidget(widget.widgetId)}
              onResize={size =>
                handleUpdateWidget(widget.widgetId, {
                  position: { ...widget.position, ...size },
                })
              }
            />
          ))}

          {/* Empty State */}
          {widgets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <SquaresPlusIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Empty dashboard</p>
                {isEditing && (
                  <button
                    onClick={() => setShowAddWidget(true)}
                    className="mt-3 text-primary-400 hover:text-primary-300 text-sm"
                  >
                    Add your first widget
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <AddWidgetPanel
          reports={reports}
          onAddWidget={handleAddWidget}
          onClose={() => setShowAddWidget(false)}
        />
      )}
    </div>
  );
}
