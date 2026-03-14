import { mapOrderItem } from '../OrderQueries';

describe('OrderQueries.mapOrderItem', () => {
  it('normalizes numeric on-hand quantities from Postgres strings', () => {
    const item = mapOrderItem({
      order_item_id: 'ITEM-1',
      order_id: 'ORD-1',
      sku: 'SKU-1',
      name: 'Test Item',
      quantity: 1,
      picked_quantity: 0,
      verified_quantity: 0,
      status: 'PENDING',
      on_hand_quantity: '120.000',
    });

    expect(item.onHandQuantity).toBe(120);
  });

  it('preserves meaningful decimal on-hand quantities', () => {
    const item = mapOrderItem({
      order_item_id: 'ITEM-2',
      order_id: 'ORD-2',
      sku: 'SKU-2',
      name: 'Test Item 2',
      quantity: 1,
      picked_quantity: 0,
      verified_quantity: 0,
      status: 'PENDING',
      on_hand_quantity: '120.500',
    });

    expect(item.onHandQuantity).toBe(120.5);
  });
});
