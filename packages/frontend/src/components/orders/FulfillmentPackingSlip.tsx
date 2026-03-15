import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import type { Address, Order } from '@opsui/shared';
import { resolveProductImage } from '@/lib/resolve-product-image';
import { getSkuLookupKey } from '@/lib/sku-lookup';
import { formatBinLocation } from '@/lib/utils';

const fulfillmentSlipAccentColor = '#1e3a5f';
const fulfillmentSlipHeaderColor = '#16324f';
const fulfillmentSlipLogoUrl = '/arrowhead-logo.png';

const code39Patterns: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

export const FULFILLMENT_SLIP_PRINT_STYLES = `
  @page { size: A4 landscape; margin: 10mm; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body.fulfillment-slip-print-preview {
    overflow: hidden !important;
  }
  #fulfillment-slip-actions,
  .print-hide {
    display: none !important;
  }
  .fulfillment-slip-root {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    background: white !important;
  }
  .fulfillment-slip-root,
  .fulfillment-slip-root * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body.fulfillment-slip-print-preview .fulfillment-slip-page {
    margin-bottom: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    break-after: page;
    page-break-after: always;
  }
  body.fulfillment-slip-print-preview .fulfillment-slip-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  body.fulfillment-slip-print-preview .fulfillment-slip-item-image img {
    display: block !important;
  }
`;

export const FULFILLMENT_SLIP_SCREEN_STYLES = `
  .fulfillment-slip-page {
    background: white;
    margin-bottom: 1.5rem;
    box-shadow: 0 25px 50px -12px rgba(15, 76, 129, 0.12);
    border-radius: 16px;
    overflow: hidden;
  }
  .fulfillment-slip-page:last-child {
    margin-bottom: 0;
  }
  .opsui-accent-bar {
    background: linear-gradient(90deg, #3b82a6 0%, #0f4c81 25%, #16324f 50%, #0f4c81 75%, #3b82a6 100%);
  }
  .opsui-badge {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border: 1px solid #cbd5e1;
  }
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    html, body {
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

type BarcodeModel = ReturnType<typeof buildCode39Barcode>;
type BarcodeSize = ReturnType<typeof renderBarcodeDimensions>;

interface AddressLine {
  label: string;
  value: string;
}

export interface FulfillmentPackingSlipProps {
  order: Order & {
    netsuiteOrderDate?: string | null;
    shippingMethod?: string | null;
  };
  pickedByLabel: string;
  packedByLabel?: string | null;
  salesOrderBarcodeImage?: string | null;
  itemImageMap?: Record<string, string>;
  itemBarcodeImageMap?: Record<string, string>;
  containerId?: string;
}

const buildCode39Barcode = (value?: string | null) => {
  const normalizedValue = value?.trim().toUpperCase() || '';
  if (!normalizedValue) return null;
  const encodedValue = `*${normalizedValue}*`;
  const segments: Array<{ isBar: boolean; width: number }> = [];

  for (const [charIndex, char] of Array.from(encodedValue).entries()) {
    const pattern = code39Patterns[char];
    if (!pattern) return null;

    for (const [elementIndex, token] of Array.from(pattern).entries()) {
      segments.push({ isBar: elementIndex % 2 === 0, width: token === 'w' ? 3 : 1 });
    }

    if (charIndex < encodedValue.length - 1) {
      segments.push({ isBar: false, width: 1 });
    }
  }

  const quietZone = 10;
  const totalWidth = segments.reduce((sum, segment) => sum + segment.width, quietZone * 2);
  return { displayValue: normalizedValue, quietZone, segments, totalWidth };
};

const extractNetSuiteAccountNumber = (customerName?: string | null, customerId?: string | null) => {
  const trimmedCustomerName = customerName?.trim() || '';
  const accountMatch = trimmedCustomerName.match(/^(\d{3,})\b/);
  if (accountMatch) {
    return { accountNumber: accountMatch[1], caption: 'NetSuite customer number' };
  }
  return { accountNumber: customerId?.trim() || '-', caption: 'NetSuite internal customer ID' };
};

const chunkFulfillmentSlipItems = <T,>(
  items: T[],
  firstPageSize: number,
  continuationPageSize: number
): T[][] => {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  let cursor = 0;
  pages.push(items.slice(cursor, cursor + firstPageSize));
  cursor += firstPageSize;
  while (cursor < items.length) {
    pages.push(items.slice(cursor, cursor + continuationPageSize));
    cursor += continuationPageSize;
  }
  return pages;
};

const renderBarcodeDimensions = (
  totalWidth: number,
  _barHeight: number,
  moduleWidthMm: number,
  heightMm: number
) => {
  const widthMmValue = Number((totalWidth * moduleWidthMm).toFixed(2));
  return {
    widthPx: Math.round(widthMmValue * 3.78),
    heightPx: Math.round(heightMm * 3.78),
    widthMm: `${widthMmValue}mm`,
    heightMm: `${heightMm}mm`,
  };
};

const getOrderItemDisplayName = (item?: any | null) =>
  item?.itemName || item?.item_name || item?.name || item?.sku || 'Item';

const getOrderItemDescription = (item?: any | null) => {
  const description = item?.description || item?.itemDescription || item?.item_description || null;
  const displayName = getOrderItemDisplayName(item);
  if (!description || description === displayName || description === item?.sku) {
    return null;
  }
  return description;
};

const formatNetSuiteDisplayText = (value?: string | null): string => {
  if (!value) return '';
  return value
    .trim()
    .replace(/^_+/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

const formatFulfillmentActorTimestamp = (value?: string | Date | null) => {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAddressLines = (address?: Address | null): AddressLine[] => {
  if (!address) return [];
  const a = address as any;
  const lines: { label: string; value: string | undefined | null }[] = [
    { label: 'Name', value: a.name },
    { label: 'Company', value: a.company },
    { label: 'Address', value: a.addressLine1 || a.street1 },
    { label: '', value: a.addressLine2 || a.street2 },
    { label: 'City', value: a.city },
    { label: 'State', value: a.state },
    { label: 'Postal Code', value: a.postalCode },
    { label: 'Country', value: formatNetSuiteDisplayText(a.country) },
  ];
  return lines
    .map(line => ({
      label: line.label,
      value: typeof line.value === 'string' ? line.value.trim() : '',
    }))
    .filter(line => line.value);
};

function BarcodeGraphic({
  barcode,
  size,
  image,
  height,
  rectKeyPrefix,
}: {
  barcode: BarcodeModel | null;
  size: BarcodeSize | null;
  image?: string | null;
  height: number;
  rectKeyPrefix: string;
}) {
  if (!barcode) return null;

  if (image && size) {
    return (
      <img
        src={image}
        alt={`Barcode ${barcode.displayValue}`}
        className="block"
        style={{ width: size.widthMm, height: size.heightMm }}
      />
    );
  }

  return (
    <svg
      aria-label={`Barcode ${barcode.displayValue}`}
      className="block"
      width={size?.widthMm}
      height={size?.heightMm}
      style={{ width: size?.widthMm, height: size?.heightMm }}
      viewBox={`0 0 ${barcode.totalWidth} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      shapeRendering="crispEdges"
    >
      {(() => {
        let currentX = barcode.quietZone;
        return barcode.segments.map((segment, index) => {
          const rect = segment.isBar ? (
            <rect
              key={`${rectKeyPrefix}-${index}`}
              x={currentX}
              y={0}
              width={segment.width}
              height={height}
              fill="#111827"
            />
          ) : null;
          currentX += segment.width;
          return rect;
        });
      })()}
    </svg>
  );
}

function FulfillmentSlipItemRow({
  item,
  index,
  rowKey,
  itemImageMap,
  itemBarcodeImageMap,
  barcodeKeyPrefix,
}: {
  item: any;
  index: number;
  rowKey: string;
  itemImageMap: Record<string, string>;
  itemBarcodeImageMap: Record<string, string>;
  barcodeKeyPrefix: string;
}) {
  const itemImage = resolveProductImage(
    item.image || itemImageMap[getSkuLookupKey(item.sku)] || itemImageMap[item.sku] || null
  );
  const itemBarcode = buildCode39Barcode(item.barcode);
  const itemBarcodeSize = itemBarcode
    ? renderBarcodeDimensions(itemBarcode.totalWidth, 20, 0.19, 5.5)
    : null;
  const itemBarcodeImage = itemBarcodeImageMap[String(item.orderItemId)] || null;

  return (
    <div
      key={rowKey}
      className={`grid grid-cols-12 gap-2 px-2 py-1 text-sm ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} print:bg-white`}
    >
      <div className="col-span-4 flex items-start gap-2">
        <div className="fulfillment-slip-item-image h-7 w-7 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50 print:border-gray-400 print:bg-white">
          {itemImage ? (
            <img
              src={itemImage}
              alt={item.name || item.sku}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400 print:text-gray-500">
              No Image
            </div>
          )}
        </div>
        <div className="fulfillment-slip-item-meta min-w-0">
          <p className="font-mono font-bold text-slate-900 print:text-black">{item.sku}</p>
          <p className="mt-0.5 text-xs text-slate-600 print:text-black">
            Bin: {formatBinLocation(item.binLocation)}
          </p>
        </div>
      </div>
      <div className="col-span-5">
        {getOrderItemDescription(item) && (
          <p className="text-xs leading-snug text-slate-700 print:text-black">
            {getOrderItemDescription(item)}
          </p>
        )}
        {item.barcode && (
          <div className="mt-1 inline-flex flex-col rounded border border-slate-200 bg-white px-2 py-1 print:border-gray-400">
            {itemBarcode ? (
              <>
                <BarcodeGraphic
                  barcode={itemBarcode}
                  size={itemBarcodeSize}
                  image={itemBarcodeImage}
                  height={20}
                  rectKeyPrefix={barcodeKeyPrefix}
                />
                <p className="mt-1 text-center font-mono text-[10px] text-slate-600 print:text-black">
                  {itemBarcode.displayValue}
                </p>
              </>
            ) : (
              <p className="font-mono text-xs text-slate-600 print:text-black">
                Barcode: {item.barcode}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="col-span-1 text-center font-semibold text-slate-800 print:text-black">
        {item.quantity}
      </div>
      <div className="col-span-1 text-center text-slate-600 print:text-black">
        {Math.max(0, item.quantity - (item.pickedQuantity || 0))}
      </div>
      <div className="col-span-1 text-center">
        <span
          className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold fulfillment-slip-print-color"
          style={{ backgroundColor: '#d1d5db', color: '#111827' }}
        >
          {item.pickedQuantity}
        </span>
      </div>
    </div>
  );
}

function FulfillmentSlipItemsTable({
  items,
  itemImageMap,
  itemBarcodeImageMap,
  summary,
  pageNumber,
}: {
  items: any[];
  itemImageMap: Record<string, string>;
  itemBarcodeImageMap: Record<string, string>;
  summary?: { totalItems: number; skuCount: number };
  pageNumber: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:rounded-none print:border-gray-400">
      <div
        className="fulfillment-slip-print-color"
        style={{ backgroundColor: fulfillmentSlipHeaderColor }}
      >
        <div
          className="grid grid-cols-12 gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ color: '#ffffff' }}
        >
          <span className="col-span-4">Item / SKU</span>
          <span className="col-span-5">Description</span>
          <span className="col-span-1 text-center">Ord</span>
          <span className="col-span-1 text-center">B/O</span>
          <span className="col-span-1 text-center">Shipped</span>
        </div>
      </div>
      <div className="divide-y divide-slate-200 print:divide-gray-300">
        {items.map((item: any, index: number) => (
          <FulfillmentSlipItemRow
            key={`${item.orderItemId || item.sku}-${pageNumber}-${index}`}
            item={item}
            index={index}
            rowKey={`${item.orderItemId || item.sku}-${pageNumber}-${index}`}
            itemImageMap={itemImageMap}
            itemBarcodeImageMap={itemBarcodeImageMap}
            barcodeKeyPrefix={`item-barcode-${item.orderItemId || item.sku}-${pageNumber}`}
          />
        ))}
      </div>
      {summary && (
        <div className="border-t border-slate-200 px-4 py-1 print:border-gray-400">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-800 print:text-black">
              <ClipboardDocumentListIcon className="h-4 w-4" />
              <span>Total Items:</span>
              <span className="font-bold text-slate-900 print:text-black">
                {summary.totalItems}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 print:text-black">
              <span>SKUs:</span>
              <span className="font-bold text-slate-900 print:text-black">{summary.skuCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FulfillmentPackingSlip({
  order,
  pickedByLabel,
  packedByLabel = null,
  salesOrderBarcodeImage = null,
  itemImageMap = {},
  itemBarcodeImageMap = {},
  containerId = 'fulfillment-slip-print',
}: FulfillmentPackingSlipProps) {
  const extendedOrder = order as Order & {
    netsuiteOrderDate?: string | null;
    shippingMethod?: string | null;
  };
  const previewAddressLines = formatAddressLines(order.shippingAddress);
  const billToLines = formatAddressLines(order.billingAddress || order.shippingAddress);
  const orderDate = extendedOrder.netsuiteOrderDate
    ? new Date(extendedOrder.netsuiteOrderDate).toLocaleDateString('en-NZ')
    : new Date().toLocaleDateString('en-NZ');
  const shippingMethodLabel = formatNetSuiteDisplayText(
    extendedOrder.shippingMethod || order.carrier || 'Not specified'
  );
  const accountNumberDetails = extractNetSuiteAccountNumber(order.customerName, order.customerId);
  const salesOrderBarcode = buildCode39Barcode(order.netsuiteSoTranId || order.orderId);
  const salesOrderBarcodeSize = salesOrderBarcode
    ? renderBarcodeDimensions(salesOrderBarcode.totalWidth, 24, 0.28, 8.5)
    : null;
  const pickedAtLabel =
    formatFulfillmentActorTimestamp(order.pickedAt) || formatFulfillmentActorTimestamp(new Date());
  const packedAtLabel = formatFulfillmentActorTimestamp(order.packedAt);
  const allFulfillmentItems = order.items || [];
  const slipPages = chunkFulfillmentSlipItems(allFulfillmentItems, 7, 12);
  const totalSlipPages = slipPages.length;
  const summary = {
    totalItems: allFulfillmentItems.reduce(
      (sum: number, item: any) => sum + (item.pickedQuantity || 0),
      0
    ),
    skuCount: allFulfillmentItems.length,
  };

  return (
    <>
      <style>{FULFILLMENT_SLIP_SCREEN_STYLES}</style>
      <div id={containerId} className="fulfillment-slip-root bg-white text-slate-900">
        <section className="fulfillment-slip-page">
          <div className="relative">
            <div className="opsui-accent-bar h-2" />
            <div className="px-6 py-3">
              <div className="flex items-start justify-between gap-8">
                <div className="flex items-start gap-5">
                  <img
                    src={fulfillmentSlipLogoUrl}
                    alt="Arrowhead Alarm Products"
                    className="fulfillment-slip-brand-logo w-24 h-auto"
                  />
                  <div className="pt-1 text-sm leading-relaxed">
                    <p className="font-bold text-gray-900 print:text-black">
                      Arrowhead Alarm Products
                    </p>
                    <p className="text-gray-600 print:text-black">1A Emirali Road</p>
                    <p className="text-gray-600 print:text-black">Silverdale 0932, Auckland</p>
                    <p className="text-gray-600 print:text-black">New Zealand</p>
                  </div>
                  {salesOrderBarcode && (
                    <div className="flex flex-col items-center justify-center pt-1">
                      <BarcodeGraphic
                        barcode={salesOrderBarcode}
                        size={salesOrderBarcodeSize}
                        image={salesOrderBarcodeImage}
                        height={24}
                        rectKeyPrefix="sales-order-barcode"
                      />
                      <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-tight text-slate-900 print:text-black">
                        {salesOrderBarcode.displayValue}
                      </p>
                    </div>
                  )}
                </div>
                <div className="ml-auto min-w-[20rem] max-w-[24rem]">
                  <div className="flex items-start justify-between gap-6">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sky-900 text-xs font-bold uppercase tracking-wider print:bg-slate-50 print:text-sky-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-800 print:bg-sky-900" />
                        Fulfillment Document
                      </div>
                      <h1 className="mt-1 text-2xl font-black tracking-tight bg-gradient-to-r from-sky-950 via-slate-700 to-sky-900 bg-clip-text text-transparent print:text-sky-950">
                        Packing Slip
                      </h1>
                      <div className="mt-1 flex justify-center">
                        <div className="opsui-badge inline-flex items-center gap-2 rounded-full px-4 py-2 print:bg-slate-50 print:border-slate-300">
                          <CalendarDaysIcon className="h-4 w-4 text-sky-800 print:text-sky-900" />
                          <span className="text-sm font-semibold text-sky-950 print:text-sky-950">
                            {orderDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider print:bg-slate-50 print:text-slate-700">
                        {`Page 1 of ${totalSlipPages}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-1.5 border-b border-slate-200 print:bg-white">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-500 print:text-black">
                  SO:{' '}
                </span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  {order.netsuiteSoTranId || order.orderId}
                </span>
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-500 print:text-black">
                  Customer PO:{' '}
                </span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  {order.customerPoNumber || '—'}
                </span>
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-500 print:text-black">
                  Account:{' '}
                </span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  {accountNumberDetails.accountNumber}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-1 border-b border-slate-200">
            <div className="grid md:grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0 print:text-black">
                  Ship To
                </p>
                <div className="text-[10px] leading-[1.3]">
                  {previewAddressLines.length > 0 ? (
                    previewAddressLines.map((line, index) => (
                      <p key={`ship-${index}`} className="text-black">
                        {line.value}
                      </p>
                    ))
                  ) : (
                    <p className="italic text-gray-500">No shipping details available</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0 print:text-black">
                  Bill To
                </p>
                <div className="text-[10px] leading-[1.3]">
                  {billToLines.length > 0 ? (
                    billToLines.map((line, index) => (
                      <p key={`bill-${index}`} className="text-black">
                        {line.value}
                      </p>
                    ))
                  ) : (
                    <p className="italic text-gray-500">Same as shipping address</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 print:text-black">
                Via:
              </span>
              <span className="text-[10px] font-semibold text-slate-800 print:text-black">
                {shippingMethodLabel}
              </span>
            </div>
          </div>

          <div className="px-6 pb-3">
            <FulfillmentSlipItemsTable
              items={slipPages[0]}
              itemImageMap={itemImageMap}
              itemBarcodeImageMap={itemBarcodeImageMap}
              summary={totalSlipPages === 1 ? summary : undefined}
              pageNumber={1}
            />
          </div>

          {totalSlipPages === 1 && (
            <FulfillmentSlipFooter
              pickedByLabel={pickedByLabel}
              packedByLabel={packedByLabel}
              pickedAtLabel={pickedAtLabel}
              packedAtLabel={packedAtLabel}
            />
          )}
        </section>

        {slipPages.slice(1).map((pageItems: any[], continuationIndex: number) => {
          const pageNumber = continuationIndex + 2;
          const isLastPage = pageNumber === totalSlipPages;
          return (
            <section key={`continuation-page-${pageNumber}`} className="fulfillment-slip-page">
              <div className="relative border-b-2 border-slate-200">
                <div
                  className="h-2 fulfillment-slip-print-color"
                  style={{
                    background: `linear-gradient(to right, ${fulfillmentSlipAccentColor}, ${fulfillmentSlipHeaderColor}, ${fulfillmentSlipAccentColor})`,
                  }}
                />
                <div className="px-6 py-3">
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex items-start gap-5">
                      <img
                        src={fulfillmentSlipLogoUrl}
                        alt="Arrowhead Alarm Products"
                        className="fulfillment-slip-brand-logo w-24 h-auto"
                      />
                      <div className="pt-1 text-sm leading-relaxed">
                        <p className="font-semibold text-gray-900 print:text-black">
                          Arrowhead Alarm Products
                        </p>
                        <p className="text-gray-800 print:text-black">1A Emirali Road</p>
                        <p className="text-gray-800 print:text-black">Silverdale 0932, Auckland</p>
                        <p className="text-gray-800 print:text-black">New Zealand</p>
                      </div>
                    </div>
                    <div className="ml-auto min-w-[20rem] max-w-[24rem]">
                      <div className="flex items-start justify-between gap-6">
                        <div className="text-center">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-900 print:text-sky-950">
                            Fulfillment Document
                          </p>
                          <h1 className="mt-1 text-2xl font-black tracking-tight text-sky-950 print:text-sky-950">
                            Packing Slip
                          </h1>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-slate-700">
                            Continued
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 print:text-black">
                            {`Page ${pageNumber} of ${totalSlipPages}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3">
                <FulfillmentSlipItemsTable
                  items={pageItems}
                  itemImageMap={itemImageMap}
                  itemBarcodeImageMap={itemBarcodeImageMap}
                  summary={isLastPage ? summary : undefined}
                  pageNumber={pageNumber}
                />
              </div>
              {isLastPage && (
                <FulfillmentSlipFooter
                  pickedByLabel={pickedByLabel}
                  packedByLabel={packedByLabel}
                  pickedAtLabel={pickedAtLabel}
                  packedAtLabel={packedAtLabel}
                />
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function FulfillmentSlipFooter({
  pickedByLabel,
  packedByLabel,
  pickedAtLabel,
  packedAtLabel,
}: {
  pickedByLabel: string;
  packedByLabel?: string | null;
  pickedAtLabel?: string | null;
  packedAtLabel?: string | null;
}) {
  return (
    <>
      <div className="px-6 py-2 border-t-2 border-slate-200 print:border-gray-400">
        <div className="flex items-center gap-8 text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold uppercase tracking-wider text-slate-500 print:text-black">
              Picked By:
            </span>
            <span className="font-semibold text-slate-900 print:text-black">{pickedByLabel}</span>
            {pickedAtLabel && (
              <span className="text-slate-500 print:text-black">· {pickedAtLabel}</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold uppercase tracking-wider text-slate-500 print:text-black">
              Packed By:
            </span>
            {packedByLabel ? (
              <>
                <span className="font-semibold text-slate-900 print:text-black">
                  {packedByLabel}
                </span>
                {packedAtLabel && (
                  <span className="text-slate-500 print:text-black">· {packedAtLabel}</span>
                )}
              </>
            ) : (
              <span className="w-32 inline-block border-b border-slate-400 print:border-gray-500" />
            )}
          </div>
        </div>
      </div>
      <div className="px-6 py-2 border-t border-slate-200 print:border-gray-400">
        <p className="text-center text-xs text-slate-600 print:text-black">
          This document was generated electronically from OpsUI Warehouse Management System
        </p>
      </div>
    </>
  );
}

export async function printFulfillmentSlipElement(
  elementId: string,
  title = 'Fulfillment Packing Slip'
) {
  const slipElement = document.getElementById(elementId);
  if (!slipElement) {
    throw new Error('Packing slip preview is not ready yet');
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      throw new Error('Unable to open print document');
    }

    // Extract already-loaded CSS inline to avoid re-fetching external stylesheets
    const inlinedCss = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText);
        } catch {
          return [];
        }
      })
      .join('\n');

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>${inlinedCss}</style>
          <style>${FULFILLMENT_SLIP_PRINT_STYLES}</style>
        </head>
        <body class="fulfillment-slip-print-preview">
          ${slipElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      const images = Array.from(iframeDoc?.querySelectorAll('img') ?? []) as HTMLImageElement[];
      const pending = images.filter(img => !img.complete);

      const doPrint = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      };

      if (pending.length === 0) {
        doPrint();
      } else {
        let remaining = pending.length;
        const onSettle = () => {
          remaining -= 1;
          if (remaining === 0) doPrint();
        };
        pending.forEach(img => {
          img.onload = onSettle;
          img.onerror = onSettle;
        });
      }
    };
  } catch (error) {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    throw error;
  }
}
