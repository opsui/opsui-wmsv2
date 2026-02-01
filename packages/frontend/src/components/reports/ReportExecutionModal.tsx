/**
 * Report Execution Modal component
 *
 * Modal for executing reports with parameter inputs and displaying results
 */

import { useState } from 'react';
import {
  XMarkIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Report, ReportExecution, ReportFormat, ReportStatus } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ReportExecutionModalProps {
  report: Report;
  onClose: () => void;
  onExecute?: (parameters: Record<string, any>) => Promise<ReportExecution>;
}

interface Parameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dateRange' | 'select';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
}

// ============================================================================
// PARAMETER EDITOR COMPONENT
// ============================================================================

function ParameterEditor({
  parameter,
  value,
  onChange,
}: {
  parameter: Parameter;
  value: any;
  onChange: (value: any) => void;
}) {
  const inputId = `param-${parameter.name}`;

  switch (parameter.type) {
    case 'number':
      return (
        <input
          type="number"
          id={inputId}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          id={inputId}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      );

    case 'dateRange':
      return (
        <div className="flex gap-2">
          <input
            type="date"
            id={`${inputId}-from`}
            value={value?.from || ''}
            onChange={e => onChange({ ...value, from: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
          <input
            type="date"
            id={`${inputId}-to`}
            value={value?.to || ''}
            onChange={e => onChange({ ...value, to: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      );

    case 'select':
      return (
        <select
          id={inputId}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="">Select...</option>
          {parameter.options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          id={inputId}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      );
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReportExecutionModal({ report, onClose, onExecute }: ReportExecutionModalProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<ReportExecution | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>(ReportFormat.PDF);

  // Generate parameters based on report filters
  const parameterDefinitions: Parameter[] = report.filters.map(filter => ({
    name: filter.field,
    label: filter.displayName || filter.field,
    type:
      filter.operator === 'between'
        ? 'dateRange'
        : filter.operator === 'in'
          ? 'select'
          : filter.field.toLowerCase().includes('date')
            ? 'date'
            : filter.field.toLowerCase().includes('count') ||
                filter.field.toLowerCase().includes('amount')
              ? 'number'
              : 'text',
    required: false,
    options:
      filter.operator === 'in' && Array.isArray(filter.value)
        ? filter.value.map((v: any) => ({ value: v, label: String(v) }))
        : undefined,
    defaultValue: filter.value,
  }));

  const handleExecute = async () => {
    if (onExecute) {
      setExecuting(true);
      try {
        const result = await onExecute(parameters);
        setExecution(result);
      } catch (error) {
        console.error('Failed to execute report:', error);
      } finally {
        setExecuting(false);
      }
    }
  };

  const handleExport = () => {
    if (execution) {
      const url = execution.fileUrl;
      if (url) {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div>
            <h2 className="text-xl font-bold text-white">Execute Report</h2>
            <p className="text-sm text-gray-400 mt-1">{report.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Report Info */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/[0.08]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Description</p>
                  <p className="text-white mt-1">{report.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {report.chartConfig.enabled && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <ChartBarIcon className="h-3 w-3" />
                      {report.chartConfig.chartType}
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <TableCellsIcon className="h-3 w-3" />
                    {report.defaultFormat}
                  </span>
                </div>
              </div>
            </div>

            {/* Parameters */}
            {parameterDefinitions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  {parameterDefinitions.map(param => (
                    <div key={param.name}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {param.label}
                        {param.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <ParameterEditor
                        parameter={param}
                        value={parameters[param.name]}
                        onChange={value => setParameters({ ...parameters, [param.name]: value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Status */}
            {execution && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Results</h3>

                {execution.status === ReportStatus.COMPLETED ? (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-500/20">
                        <DocumentArrowDownIcon className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-400">
                          Report Completed Successfully
                        </p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-400">
                          <span>{execution.rowCount?.toLocaleString()} rows</span>
                          <span>{(execution.fileSizeBytes! / 1024).toFixed(2)} KB</span>
                          <span>{((execution.executionTimeMs || 0) / 1000).toFixed(2)}s</span>
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ) : execution.status === ReportStatus.FAILED ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm font-medium text-red-400">Execution Failed</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {execution.errorMessage || 'Unknown error'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                      <p className="text-sm text-blue-400">Report is running...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export Options (show when completed) */}
            {execution && execution.status === ReportStatus.COMPLETED && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Export As</h3>
                <div className="flex gap-2">
                  {Object.values(ReportFormat).map(format => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                        selectedFormat === format
                          ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                          : 'bg-white/5 text-gray-400 border-white/[0.08] hover:bg-white/10'
                      )}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-white/[0.08]">
          <div className="text-xs text-gray-400">
            {execution && execution.status === ReportStatus.COMPLETED && (
              <span>Ready to download • Expires in 24 hours</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/[0.08] rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
            >
              Close
            </button>
            {!execution && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  executing
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                <PlayIcon className="h-4 w-4" />
                {executing ? 'Executing...' : 'Execute Report'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
