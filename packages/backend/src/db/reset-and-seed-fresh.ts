/**
 * Reset Database and Seed Fresh Mock Data
 *
 * This script:
 * 1. Clears ALL data from tables (audit_logs, orders, order_items, etc.)
 * 2. Creates fresh mock orders in various states
 * 3. Creates mock order items
 */

import { getPool } from './client';

// Priority enum values (from database)
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type OrderStatus =
  | 'PENDING'
  | 'PICKING'
  | 'PICKED'
  | 'PACKING'
  | 'PACKED'
  | 'SHIPPED'
  | 'CANCELLED'
  | 'BACKORDER';
type ItemStatus = 'PENDING' | 'PARTIAL_PICKED' | 'FULLY_PICKED';

interface Order {
  order_id: string;
  customer_name: string;
  status: OrderStatus;
  priority: Priority;
  created_at: Date;
  updated_at: Date;
  picker_id?: string;
  packer_id?: string;
  claimed_at?: Date;
  picked_at?: Date;
  packed_at?: Date;
  shipped_at?: Date;
  progress: number;
}

interface OrderItem {
  order_item_id: string;
  order_id: string;
  sku: string;
  name: string;
  quantity: number;
  picked_quantity: number;
  bin_location: string;
  status: ItemStatus;
  verified_quantity?: number;
  skip_reason?: string;
}

// Mock orders
const MOCK_ORDERS: Order[] = [
  // Pending orders (not started)
  {
    order_id: 'SO71001',
    customer_name: 'Acme Corporation',
    status: 'PENDING',
    priority: 'HIGH',
    created_at: new Date(Date.now() - 1000 * 60 * 30),
    updated_at: new Date(Date.now() - 1000 * 60 * 30),
    progress: 0,
  },
  {
    order_id: 'SO71002',
    customer_name: 'Globex Industries',
    status: 'PENDING',
    priority: 'NORMAL',
    created_at: new Date(Date.now() - 1000 * 60 * 25),
    updated_at: new Date(Date.now() - 1000 * 60 * 25),
    progress: 0,
  },
  {
    order_id: 'SO71003',
    customer_name: 'Soylent Corp',
    status: 'PENDING',
    priority: 'LOW',
    created_at: new Date(Date.now() - 1000 * 60 * 20),
    updated_at: new Date(Date.now() - 1000 * 60 * 20),
    progress: 0,
  },
  {
    order_id: 'SO71004',
    customer_name: 'Initech',
    status: 'PENDING',
    priority: 'HIGH',
    created_at: new Date(Date.now() - 1000 * 60 * 15),
    updated_at: new Date(Date.now() - 1000 * 60 * 15),
    progress: 0,
  },
  {
    order_id: 'SO71005',
    customer_name: 'Umbrella Corporation',
    status: 'PENDING',
    priority: 'NORMAL',
    created_at: new Date(Date.now() - 1000 * 60 * 10),
    updated_at: new Date(Date.now() - 1000 * 60 * 10),
    progress: 0,
  },

  // Orders currently being picked
  {
    order_id: 'SO71006',
    customer_name: 'Cyberdyne Systems',
    status: 'PICKING',
    priority: 'HIGH',
    created_at: new Date(Date.now() - 1000 * 60 * 60),
    updated_at: new Date(Date.now() - 1000 * 60 * 45),
    picker_id: 'USR-PICK01',
    claimed_at: new Date(Date.now() - 1000 * 60 * 45),
    progress: 33,
  },
  {
    order_id: 'SO71007',
    customer_name: 'Stark Industries',
    status: 'PICKING',
    priority: 'URGENT',
    created_at: new Date(Date.now() - 1000 * 60 * 55),
    updated_at: new Date(Date.now() - 1000 * 60 * 40),
    picker_id: 'USR-PICK01',
    claimed_at: new Date(Date.now() - 1000 * 60 * 40),
    progress: 40,
  },

  // Orders picked but not packed
  {
    order_id: 'SO71008',
    customer_name: 'Wayne Enterprises',
    status: 'PICKED',
    priority: 'NORMAL',
    created_at: new Date(Date.now() - 1000 * 60 * 120),
    updated_at: new Date(Date.now() - 1000 * 60 * 90),
    picker_id: 'USR-PICK01',
    claimed_at: new Date(Date.now() - 1000 * 60 * 100),
    picked_at: new Date(Date.now() - 1000 * 60 * 90),
    progress: 100,
  },

  // Orders currently being packed
  {
    order_id: 'SO71009',
    customer_name: 'Massive Dynamic',
    status: 'PACKING',
    priority: 'HIGH',
    created_at: new Date(Date.now() - 1000 * 60 * 150),
    updated_at: new Date(Date.now() - 1000 * 60 * 110),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: new Date(Date.now() - 1000 * 60 * 130),
    picked_at: new Date(Date.now() - 1000 * 60 * 120),
    packed_at: null,
    progress: 100,
  },

  // Orders packed and ready to ship
  {
    order_id: 'SO71010',
    customer_name: 'Hooli',
    status: 'PACKED',
    priority: 'LOW',
    created_at: new Date(Date.now() - 1000 * 60 * 180),
    updated_at: new Date(Date.now() - 1000 * 60 * 140),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: new Date(Date.now() - 1000 * 60 * 170),
    picked_at: new Date(Date.now() - 1000 * 60 * 160),
    packed_at: new Date(Date.now() - 1000 * 60 * 140),
    progress: 100,
  },
  {
    order_id: 'SO71011',
    customer_name: 'Pied Piper',
    status: 'PACKED',
    priority: 'NORMAL',
    created_at: new Date(Date.now() - 1000 * 60 * 200),
    updated_at: new Date(Date.now() - 1000 * 60 * 160),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: new Date(Date.now() - 1000 * 60 * 190),
    picked_at: new Date(Date.now() - 1000 * 60 * 180),
    packed_at: new Date(Date.now() - 1000 * 60 * 160),
    progress: 100,
  },

  // Shipped orders
  {
    order_id: 'SO71012',
    customer_name: 'Aviato',
    status: 'SHIPPED',
    priority: 'NORMAL',
    created_at: new Date(Date.now() - 1000 * 60 * 300),
    updated_at: new Date(Date.now() - 1000 * 60 * 220),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: new Date(Date.now() - 1000 * 60 * 280),
    picked_at: new Date(Date.now() - 1000 * 60 * 270),
    packed_at: new Date(Date.now() - 1000 * 60 * 240),
    shipped_at: new Date(Date.now() - 1000 * 60 * 220),
    progress: 100,
  },
  {
    order_id: 'SO71013',
    customer_name: 'Endframe',
    status: 'SHIPPED',
    priority: 'LOW',
    created_at: new Date(Date.now() - 1000 * 60 * 360),
    updated_at: new Date(Date.now() - 1000 * 60 * 280),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: new Date(Date.now() - 1000 * 60 * 340),
    picked_at: new Date(Date.now() - 1000 * 60 * 330),
    packed_at: new Date(Date.now() - 1000 * 60 * 300),
    shipped_at: new Date(Date.now() - 1000 * 60 * 280),
    progress: 100,
  },
  {
    order_id: 'SO71014',
    customer_name: 'Bachmanity',
    status: 'SHIPPED',
    priority: 'HIGH',
    created_at: new Date(Date.now() - 1000 * 60 * 420),
    updated_at: new Date(Date.now() - 1000 * 60 * 340),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: new Date(Date.now() - 1000 * 60 * 400),
    picked_at: new Date(Date.now() - 1000 * 60 * 390),
    packed_at: new Date(Date.now() - 1000 * 60 * 360),
    shipped_at: new Date(Date.now() - 1000 * 60 * 340),
    progress: 100,
  },
];

// Mock order items
const MOCK_ORDER_ITEMS: OrderItem[] = [
  // SO71001 - Acme Corporation (5 items)
  {
    order_item_id: 'OI71001-1',
    order_id: 'SO71001',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71001-2',
    order_id: 'SO71001',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71001-3',
    order_id: 'SO71001',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71001-4',
    order_id: 'SO71001',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71001-5',
    order_id: 'SO71001',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },

  // SO71002 - Globex Industries (3 items)
  {
    order_item_id: 'OI71002-1',
    order_id: 'SO71002',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71002-2',
    order_id: 'SO71002',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71002-3',
    order_id: 'SO71002',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },

  // SO71003 - Soylent Corp (2 items)
  {
    order_item_id: 'OI71003-1',
    order_id: 'SO71003',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71003-2',
    order_id: 'SO71003',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },

  // SO71004 - Initech (6 items)
  {
    order_item_id: 'OI71004-1',
    order_id: 'SO71004',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-2',
    order_id: 'SO71004',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-3',
    order_id: 'SO71004',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-4',
    order_id: 'SO71004',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-5',
    order_id: 'SO71004',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-6',
    order_id: 'SO71004',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },

  // SO71005 - Umbrella Corp (4 items)
  {
    order_item_id: 'OI71005-1',
    order_id: 'SO71005',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 4,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71005-2',
    order_id: 'SO71005',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71005-3',
    order_id: 'SO71005',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71005-4',
    order_id: 'SO71005',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },

  // SO71006 - Cyberdyne (PICKING) - 3 items, 1 picked
  {
    order_item_id: 'OI71006-1',
    order_id: 'SO71006',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71006-2',
    order_id: 'SO71006',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71006-3',
    order_id: 'SO71006',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },

  // SO71007 - Stark Industries (PICKING) - 5 items, 2 picked
  {
    order_item_id: 'OI71007-1',
    order_id: 'SO71007',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71007-2',
    order_id: 'SO71007',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71007-3',
    order_id: 'SO71007',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71007-4',
    order_id: 'SO71007',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71007-5',
    order_id: 'SO71007',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },

  // SO71008 - Wayne Enterprises (PICKED) - 4 items all picked
  {
    order_item_id: 'OI71008-1',
    order_id: 'SO71008',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71008-2',
    order_id: 'SO71008',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71008-3',
    order_id: 'SO71008',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71008-4',
    order_id: 'SO71008',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },

  // SO71009 - Massive Dynamic (PACKING) - 3 items all picked
  {
    order_item_id: 'OI71009-1',
    order_id: 'SO71009',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71009-2',
    order_id: 'SO71009',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71009-3',
    order_id: 'SO71009',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },

  // SO71010 - Hooli (PACKED) - 2 items
  {
    order_item_id: 'OI71010-1',
    order_id: 'SO71010',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71010-2',
    order_id: 'SO71010',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },

  // SO71011 - Pied Piper (PACKED) - 4 items
  {
    order_item_id: 'OI71011-1',
    order_id: 'SO71011',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71011-2',
    order_id: 'SO71011',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71011-3',
    order_id: 'SO71011',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71011-4',
    order_id: 'SO71011',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },

  // SO71012 - Aviato (SHIPPED) - 3 items
  {
    order_item_id: 'OI71012-1',
    order_id: 'SO71012',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71012-2',
    order_id: 'SO71012',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71012-3',
    order_id: 'SO71012',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },

  // SO71013 - Endframe (SHIPPED) - 5 items
  {
    order_item_id: 'OI71013-1',
    order_id: 'SO71013',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71013-2',
    order_id: 'SO71013',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71013-3',
    order_id: 'SO71013',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71013-4',
    order_id: 'SO71013',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71013-5',
    order_id: 'SO71013',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },

  // SO71014 - Bachmanity (SHIPPED) - 6 items
  {
    order_item_id: 'OI71014-1',
    order_id: 'SO71014',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-2',
    order_id: 'SO71014',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-3',
    order_id: 'SO71014',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-4',
    order_id: 'SO71014',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-5',
    order_id: 'SO71014',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-6',
    order_id: 'SO71014',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
];

async function resetAndSeedDatabase() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database reset and seed...');

    // Begin transaction
    await client.query('BEGIN');

    // Clear all data (in correct order due to foreign key constraints)
    console.log('🗑️  Clearing existing data...');

    // Clear order-related tables
    await client.query('TRUNCATE TABLE order_items CASCADE');
    console.log('  ✅ Cleared order_items');

    await client.query('TRUNCATE TABLE order_state_changes CASCADE');
    console.log('  ✅ Cleared order_state_changes');

    await client.query('TRUNCATE TABLE order_exceptions CASCADE');
    console.log('  ✅ Cleared order_exceptions');

    await client.query('TRUNCATE TABLE pick_tasks CASCADE');
    console.log('  ✅ Cleared pick_tasks');

    await client.query('TRUNCATE TABLE orders CASCADE');
    console.log('  ✅ Cleared orders');

    // Clear audit logs
    await client.query('TRUNCATE TABLE audit_logs CASCADE');
    console.log('  ✅ Cleared audit_logs');

    // Clear SKUs
    await client.query('TRUNCATE TABLE skus CASCADE');
    console.log('  ✅ Cleared skus');

    // Insert SKUs first (order_items depend on them)
    console.log('📦 Inserting mock SKUs...');
    const MOCK_SKUS = [
      {
        sku: 'WIDGET-A-001',
        name: 'Widget A Type 1',
        category: 'Widgets',
        description: 'Standard widget type A',
        active: true,
      },
      {
        sku: 'GADGET-B-002',
        name: 'Gadget B Type 2',
        category: 'Gadgets',
        description: 'Standard gadget type B',
        active: true,
      },
      {
        sku: 'TOOL-C-003',
        name: 'Tool C Type 3',
        category: 'Tools',
        description: 'Standard tool type C',
        active: true,
      },
      {
        sku: 'PART-D-004',
        name: 'Part D Type 4',
        category: 'Parts',
        description: 'Standard part type D',
        active: true,
      },
      {
        sku: 'COMP-E-005',
        name: 'Component E Type 5',
        category: 'Components',
        description: 'Standard component type E',
        active: true,
      },
      {
        sku: 'MATERIAL-F-006',
        name: 'Material F Type 6',
        category: 'Materials',
        description: 'Standard material type F',
        active: true,
      },
    ];

    for (const sku of MOCK_SKUS) {
      await client.query(
        `INSERT INTO skus (sku, name, description, category, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [sku.sku, sku.name, sku.description, sku.category, sku.active]
      );
    }
    console.log(`  ✅ Inserted ${MOCK_SKUS.length} SKUs`);

    // Insert mock orders
    console.log('📦 Inserting mock orders...');
    for (const order of MOCK_ORDERS) {
      // Generate a customer_id based on the order_id
      const customer_id = `CUST-${order.order_id.substring(2, 7)}`;

      await client.query(
        `INSERT INTO orders (
          order_id, customer_id, customer_name, status, priority,
          created_at, updated_at, picker_id, packer_id,
          claimed_at, picked_at, packed_at, shipped_at, progress
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          order.order_id,
          customer_id,
          order.customer_name,
          order.status,
          order.priority,
          order.created_at,
          order.updated_at,
          order.picker_id || null,
          order.packer_id || null,
          order.claimed_at || null,
          order.picked_at || null,
          order.packed_at || null,
          order.shipped_at || null,
          order.progress,
        ]
      );
    }
    console.log(`  ✅ Inserted ${MOCK_ORDERS.length} orders`);

    // Insert mock order items
    console.log('📦 Inserting mock order items...');
    for (const item of MOCK_ORDER_ITEMS) {
      await client.query(
        `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.order_item_id,
          item.order_id,
          item.sku,
          item.name,
          item.quantity,
          item.picked_quantity,
          item.bin_location,
          item.status,
        ]
      );
    }
    console.log(`  ✅ Inserted ${MOCK_ORDER_ITEMS.length} order items`);

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database reset and seed completed successfully!');

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`  Orders: ${MOCK_ORDERS.length}`);
    console.log(`  Order Items: ${MOCK_ORDER_ITEMS.length}`);
    console.log('\n📋 Order Status Breakdown:');
    const statusCounts: Record<string, number> = {};
    MOCK_ORDERS.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error during database reset:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset and seed
resetAndSeedDatabase().catch(console.error);
