/**
 * Packing Queue Page
 *
 * Thin re-export that renders the unified OrderQueuePage in packing mode.
 * All logic lives in OrderQueuePage.tsx.
 */

import { OrderQueuePage } from './OrderQueuePage';

export function PackingQueuePage() {
  return <OrderQueuePage mode="packing" />;
}
