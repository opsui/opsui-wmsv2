/**
 * ASN Detail Page
 * Shows details of an Advance Shipping Notice
 */

import { Breadcrumb, Button, Card, LoadingSpinner } from '@/components/shared';
import { useASN } from '@/services/api';
import { useParams, useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PARTIAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function ASNDetailPage() {
  const { asnId } = useParams<{ asnId: string }>();
  const navigate = useNavigate();
  const { data: asn, isLoading, error } = useASN(asnId || '', !!asnId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !asn) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              ASN Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The ASN you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/inwards')}>Back to Inwards Goods</Button>
          </div>
        </Card>
      </div>
    );
  }

  const asnData = asn.data || asn;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Inwards Goods', href: '/inwards' },
          { label: 'ASN', href: '/inwards?tab=asn' },
          { label: asnData.asnNumber || asnId! },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {asnData.asnNumber || `ASN-${asnId}`}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            PO: {asnData.poNumber || asnData.purchaseOrderNumber} | Supplier:{' '}
            {asnData.supplierName || asnData.supplierId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[asnData.status] || statusColors.PENDING
            }`}
          >
            {asnData.status}
          </span>
          <Button variant="outline" onClick={() => navigate('/inwards')}>
            Back
          </Button>
        </div>
      </div>

      {/* Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASN Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            ASN Information
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">ASN Number</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {asnData.asnNumber || asnId}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">PO Number</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {asnData.poNumber || asnData.purchaseOrderNumber}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Supplier</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {asnData.supplierName || asnData.supplierId}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Expected Arrival</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {asnData.expectedArrivalDate
                  ? new Date(asnData.expectedArrivalDate).toLocaleDateString()
                  : 'N/A'}
              </dd>
            </div>
            {asnData.actualArrivalDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Actual Arrival</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {new Date(asnData.actualArrivalDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {asnData.carrier && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Carrier</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{asnData.carrier}</dd>
              </div>
            )}
            {asnData.trackingNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Tracking</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {asnData.trackingNumber}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Notes */}
        {asnData.notes && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Notes</h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{asnData.notes}</p>
          </Card>
        )}
      </div>

      {/* Lines Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Lines</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Line
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  SKU
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Product
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Expected
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Received
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  UoM
                </th>
              </tr>
            </thead>
            <tbody>
              {asnData.lines?.map((line: any, index: number) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                    {line.lineNumber || index + 1}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                    {line.sku}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                    {line.productName || line.name || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                    {line.expectedQuantity || line.quantity}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                    {line.receivedQuantity || 0}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {line.unitOfMeasure || 'EA'}
                  </td>
                </tr>
              ))}
              {(!asnData.lines || asnData.lines.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No lines found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
