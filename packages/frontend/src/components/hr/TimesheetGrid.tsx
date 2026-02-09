/**
 * TimesheetGrid Component
 *
 * Reusable grid component for displaying and editing timesheet entries
 * Supports weekly view with multiple time types and automatic calculations
 */

import { useState } from 'react';
import { ClockIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface TimesheetEntry {
  entryId?: string;
  workDate: string;
  projectId?: string;
  taskId?: string;
  regularHours: number;
  overtime1_5Hours: number;
  overtime2_0Hours: number;
  breakMinutes: number;
  notes?: string;
}

export interface TimesheetGridProps {
  entries: TimesheetEntry[];
  onChange: (entries: TimesheetEntry[]) => void;
  readonly?: boolean;
  showProject?: boolean;
  projects?: { id: string; name: string }[];
  tasks?: { id: string; name: string; projectId: string }[];
}

export function TimesheetGrid({
  entries,
  onChange,
  readonly = false,
  showProject = false,
  projects = [],
  tasks = [],
}: TimesheetGridProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
    if (readonly) return;

    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onChange(newEntries);
  };

  const removeEntry = (index: number) => {
    if (readonly) return;
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  const addEntry = () => {
    if (readonly) return;

    const lastEntry = entries[entries.length - 1];
    let newDate = new Date().toISOString().split('T')[0];
    if (lastEntry) {
      const lastDate = new Date(lastEntry.workDate);
      lastDate.setDate(lastDate.getDate() + 1);
      newDate = lastDate.toISOString().split('T')[0];
    }

    const newEntry: TimesheetEntry = {
      workDate: newDate,
      regularHours: 0,
      overtime1_5Hours: 0,
      overtime2_0Hours: 0,
      breakMinutes: 0,
    };

    onChange([...entries, newEntry]);
  };

  const getDayTotal = (entry: TimesheetEntry): number => {
    return (
      (entry.regularHours || 0) + (entry.overtime1_5Hours || 0) + (entry.overtime2_0Hours || 0)
    );
  };

  const getWeeklyTotals = () => {
    return entries.reduce(
      (acc, entry) => ({
        regular: acc.regular + (entry.regularHours || 0),
        ot1_5: acc.ot1_5 + (entry.overtime1_5Hours || 0),
        ot2_0: acc.ot2_0 + (entry.overtime2_0Hours || 0),
        total: acc.total + getDayTotal(entry),
      }),
      { regular: 0, ot1_5: 0, ot2_0: 0, total: 0 }
    );
  };

  const totals = getWeeklyTotals();

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const toggleNoteExpansion = (index: number) => {
    const newExpanded = new Set(expandedNotes);
    const key = index.toString();
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedNotes(newExpanded);
  };

  const filteredTasks = (projectId?: string) => {
    if (!projectId) return [];
    return tasks.filter(t => t.projectId === projectId);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
              <th className="pb-3 font-medium w-40">Date</th>
              {showProject && (
                <>
                  <th className="pb-3 font-medium w-40">Project</th>
                  <th className="pb-3 font-medium w-40">Task</th>
                </>
              )}
              <th className="pb-3 font-medium w-20">Regular</th>
              <th className="pb-3 font-medium w-20">OT 1.5x</th>
              <th className="pb-3 font-medium w-20">OT 2.0x</th>
              <th className="pb-3 font-medium w-20">Break</th>
              <th className="pb-3 font-medium w-20">Total</th>
              <th className="pb-3 font-medium">Notes</th>
              {!readonly && <th className="pb-3 font-medium w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.entryId || index} className="border-b border-slate-700/30">
                <td className="py-3">
                  {readonly ? (
                    <span className="text-white text-sm">{getDayName(entry.workDate)}</span>
                  ) : (
                    <input
                      type="date"
                      value={entry.workDate}
                      onChange={e => updateEntry(index, 'workDate', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                    />
                  )}
                </td>

                {showProject && (
                  <>
                    <td className="py-3">
                      {readonly ? (
                        <span className="text-slate-300 text-sm">
                          {projects.find(p => p.id === entry.projectId)?.name || '-'}
                        </span>
                      ) : (
                        <select
                          value={entry.projectId || ''}
                          onChange={e => {
                            updateEntry(index, 'projectId', e.target.value || undefined);
                            updateEntry(index, 'taskId', undefined);
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                        >
                          <option value="">-</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3">
                      {readonly ? (
                        <span className="text-slate-300 text-sm">
                          {tasks.find(t => t.id === entry.taskId)?.name || '-'}
                        </span>
                      ) : (
                        <select
                          value={entry.taskId || ''}
                          onChange={e => updateEntry(index, 'taskId', e.target.value || undefined)}
                          disabled={!entry.projectId}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm disabled:opacity-50"
                        >
                          <option value="">-</option>
                          {filteredTasks(entry.projectId).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </>
                )}

                <td className="py-3">
                  {readonly ? (
                    <span className="text-slate-300 text-sm">{entry.regularHours}h</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={entry.regularHours || 0}
                      onChange={e =>
                        updateEntry(index, 'regularHours', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                    />
                  )}
                </td>

                <td className="py-3">
                  {readonly ? (
                    <span className="text-slate-300 text-sm">{entry.overtime1_5Hours}h</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="12"
                      step="0.5"
                      value={entry.overtime1_5Hours || 0}
                      onChange={e =>
                        updateEntry(index, 'overtime1_5Hours', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                    />
                  )}
                </td>

                <td className="py-3">
                  {readonly ? (
                    <span className="text-slate-300 text-sm">{entry.overtime2_0Hours}h</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="12"
                      step="0.5"
                      value={entry.overtime2_0Hours || 0}
                      onChange={e =>
                        updateEntry(index, 'overtime2_0Hours', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                    />
                  )}
                </td>

                <td className="py-3">
                  {readonly ? (
                    <span className="text-slate-300 text-sm">{entry.breakMinutes}m</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="120"
                      step="5"
                      value={entry.breakMinutes || 0}
                      onChange={e =>
                        updateEntry(index, 'breakMinutes', parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                    />
                  )}
                </td>

                <td className="py-3">
                  <span className="text-white font-semibold">{getDayTotal(entry).toFixed(1)}h</span>
                </td>

                <td className="py-3">
                  {readonly ? (
                    <span className="text-slate-400 text-sm">{entry.notes || '-'}</span>
                  ) : (
                    <div className="relative">
                      {entry.notes &&
                      entry.notes.length > 30 &&
                      !expandedNotes.has(index.toString()) ? (
                        <div>
                          <span className="text-slate-300 text-sm">
                            {entry.notes.substring(0, 30)}...
                          </span>
                          <button
                            onClick={() => toggleNoteExpansion(index)}
                            className="text-blue-400 text-xs ml-1 hover:underline"
                          >
                            more
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={entry.notes || ''}
                          onChange={e => updateEntry(index, 'notes', e.target.value)}
                          placeholder="Add notes..."
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                        />
                      )}
                    </div>
                  )}
                </td>

                {!readonly && (
                  <td className="py-3">
                    <button
                      onClick={() => removeEntry(index)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title="Remove entry"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700">
              <td className="py-3 font-semibold text-white" colSpan={showProject ? 3 : 1}>
                Weekly Totals
              </td>
              <td className="py-3 text-right">
                <span className="text-blue-400 font-semibold">{totals.regular.toFixed(1)}h</span>
              </td>
              <td className="py-3 text-right">
                <span className="text-amber-400 font-semibold">{totals.ot1_5.toFixed(1)}h</span>
              </td>
              <td className="py-3 text-right">
                <span className="text-purple-400 font-semibold">{totals.ot2_0.toFixed(1)}h</span>
              </td>
              <td></td>
              <td className="py-3 text-right">
                <span className="text-emerald-400 font-bold text-lg">
                  {totals.total.toFixed(1)}h
                </span>
              </td>
              <td colSpan={readonly ? 1 : 2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readonly && (
        <button
          onClick={addEntry}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Entry
        </button>
      )}

      {totals.total > 40 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <ClockIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-400 font-medium">Overtime Alert</p>
            <p className="text-amber-300">
              Weekly total exceeds 40 hours. Ensure overtime is approved and properly classified.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
