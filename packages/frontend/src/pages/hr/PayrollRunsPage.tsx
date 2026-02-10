/**
 * Payroll Runs History Page
 *
 * View history of processed payroll runs
 */

import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';
import { usePayrollRuns } from '@/services/api';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function PayrollRunsPage() {
  const { data: runs = [], isLoading } = usePayrollRuns(50);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Payroll History</h1>
          <p className="text-gray-400">History of processed payroll runs</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading payroll history...</div>
        ) : runs.length === 0 ? (
          <Card className="p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No payroll runs yet</h3>
            <p className="text-gray-400">Process your first payroll run to see history here.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {runs.map((run: any) => (
              <Card key={run.payrollRunId} variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <DocumentTextIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Payroll Run #{run.runNumber}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Processed:{' '}
                        {run.processedAt ? new Date(run.processedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <p className="text-gray-400">Employees</p>
                        <p className="text-white font-medium">{run.employeeCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Gross Pay</p>
                        <p className="text-white font-medium">
                          ${run.totalGrossPay?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Net Pay</p>
                        <p className="text-green-400 font-medium">
                          ${run.totalNetPay?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Tax</p>
                        <p className="text-red-400 font-medium">
                          ${run.totalTax?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
