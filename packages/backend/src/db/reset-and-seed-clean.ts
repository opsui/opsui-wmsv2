import { getPool } from './client';

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
}

// Generate dates spread over the past 45 days for chart visibility
function getDateDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const MOCK_ORDERS: Order[] = [
  // Recent orders (today - 2 days ago)
  {
    order_id: 'SO71001',
    customer_name: 'Acme Corporation',
    status: 'PENDING',
    priority: 'HIGH',
    created_at: getDateDaysAgo(0.5),
    updated_at: getDateDaysAgo(0.5),
    progress: 0,
  },
  {
    order_id: 'SO71002',
    customer_name: 'Globex Industries',
    status: 'PENDING',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(1),
    updated_at: getDateDaysAgo(1),
    progress: 0,
  },
  {
    order_id: 'SO71003',
    customer_name: 'Soylent Corp',
    status: 'PENDING',
    priority: 'LOW',
    created_at: getDateDaysAgo(1.5),
    updated_at: getDateDaysAgo(1.5),
    progress: 0,
  },
  {
    order_id: 'SO71004',
    customer_name: 'Initech',
    status: 'PENDING',
    priority: 'HIGH',
    created_at: getDateDaysAgo(2),
    updated_at: getDateDaysAgo(2),
    progress: 0,
  },
  {
    order_id: 'SO71005',
    customer_name: 'Umbrella Corporation',
    status: 'PICKING',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(0.3),
    updated_at: getDateDaysAgo(0.2),
    picker_id: 'USR-PICK01',
    claimed_at: getDateDaysAgo(0.2),
    progress: 60,
  },

  // Active picking orders
  {
    order_id: 'SO71006',
    customer_name: 'Cyberdyne Systems',
    status: 'PICKING',
    priority: 'HIGH',
    created_at: getDateDaysAgo(0.25),
    updated_at: getDateDaysAgo(0.1),
    picker_id: 'USR-PICK01',
    claimed_at: getDateDaysAgo(0.1),
    progress: 33,
  },
  {
    order_id: 'SO71007',
    customer_name: 'Stark Industries',
    status: 'PICKING',
    priority: 'URGENT',
    created_at: getDateDaysAgo(0.4),
    updated_at: getDateDaysAgo(0.3),
    picker_id: 'USR-PICK01',
    claimed_at: getDateDaysAgo(0.3),
    progress: 40,
  },

  // Yesterday's orders
  {
    order_id: 'SO71008',
    customer_name: 'Wayne Enterprises',
    status: 'PICKED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(1.2),
    updated_at: getDateDaysAgo(1),
    picker_id: 'USR-PICK01',
    claimed_at: getDateDaysAgo(1.1),
    picked_at: getDateDaysAgo(1),
    progress: 100,
  },
  {
    order_id: 'SO71009',
    customer_name: 'Massive Dynamic',
    status: 'PACKING',
    priority: 'HIGH',
    created_at: getDateDaysAgo(1.5),
    updated_at: getDateDaysAgo(1.3),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(1.4),
    picked_at: getDateDaysAgo(1.35),
    progress: 100,
  },

  // Past week orders
  {
    order_id: 'SO71010',
    customer_name: 'Hooli',
    status: 'PACKED',
    priority: 'LOW',
    created_at: getDateDaysAgo(3),
    updated_at: getDateDaysAgo(2.5),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(2.9),
    picked_at: getDateDaysAgo(2.8),
    packed_at: getDateDaysAgo(2.5),
    progress: 100,
  },
  {
    order_id: 'SO71011',
    customer_name: 'Pied Piper',
    status: 'PACKED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(4),
    updated_at: getDateDaysAgo(3.5),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(3.9),
    picked_at: getDateDaysAgo(3.8),
    packed_at: getDateDaysAgo(3.5),
    progress: 100,
  },

  // Past 2 weeks orders (SHIPPED - these will appear in throughput charts)
  {
    order_id: 'SO71012',
    customer_name: 'Aviato',
    status: 'SHIPPED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(7),
    updated_at: getDateDaysAgo(6),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(6.8),
    picked_at: getDateDaysAgo(6.5),
    packed_at: getDateDaysAgo(6.2),
    shipped_at: getDateDaysAgo(6),
    progress: 100,
  },
  {
    order_id: 'SO71013',
    customer_name: 'Endframe',
    status: 'SHIPPED',
    priority: 'LOW',
    created_at: getDateDaysAgo(10),
    updated_at: getDateDaysAgo(9),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(9.8),
    picked_at: getDateDaysAgo(9.5),
    packed_at: getDateDaysAgo(9.2),
    shipped_at: getDateDaysAgo(9),
    progress: 100,
  },

  // Past month orders (SHIPPED - for monthly chart data)
  {
    order_id: 'SO71014',
    customer_name: 'Bachmanity',
    status: 'SHIPPED',
    priority: 'HIGH',
    created_at: getDateDaysAgo(20),
    updated_at: getDateDaysAgo(19),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(19.8),
    picked_at: getDateDaysAgo(19.5),
    packed_at: getDateDaysAgo(19.2),
    shipped_at: getDateDaysAgo(19),
    progress: 100,
  },
  {
    order_id: 'SO71015',
    customer_name: 'Hooli 2',
    status: 'SHIPPED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(25),
    updated_at: getDateDaysAgo(24),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(24.8),
    picked_at: getDateDaysAgo(24.5),
    packed_at: getDateDaysAgo(24.2),
    shipped_at: getDateDaysAgo(24),
    progress: 100,
  },
  {
    order_id: 'SO71016',
    customer_name: 'Pied Piper 2',
    status: 'SHIPPED',
    priority: 'LOW',
    created_at: getDateDaysAgo(30),
    updated_at: getDateDaysAgo(29),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(29.8),
    picked_at: getDateDaysAgo(29.5),
    packed_at: getDateDaysAgo(29.2),
    shipped_at: getDateDaysAgo(29),
    progress: 100,
  },

  // More orders spread across the past 40 days for daily/weekly chart visibility
  {
    order_id: 'SO71017',
    customer_name: 'SeeFrame',
    status: 'SHIPPED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(14),
    updated_at: getDateDaysAgo(13),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(13.8),
    picked_at: getDateDaysAgo(13.5),
    packed_at: getDateDaysAgo(13.2),
    shipped_at: getDateDaysAgo(13),
    progress: 100,
  },
  {
    order_id: 'SO71018',
    customer_name: 'Aviato 2',
    status: 'SHIPPED',
    priority: 'HIGH',
    created_at: getDateDaysAgo(17),
    updated_at: getDateDaysAgo(16),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(16.8),
    picked_at: getDateDaysAgo(16.5),
    packed_at: getDateDaysAgo(16.2),
    shipped_at: getDateDaysAgo(16),
    progress: 100,
  },
  {
    order_id: 'SO71019',
    customer_name: 'Endframe 2',
    status: 'SHIPPED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(21),
    updated_at: getDateDaysAgo(20),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(20.8),
    picked_at: getDateDaysAgo(20.5),
    packed_at: getDateDaysAgo(20.2),
    shipped_at: getDateDaysAgo(20),
    progress: 100,
  },
  {
    order_id: 'SO71020',
    customer_name: 'Bachmanity 2',
    status: 'SHIPPED',
    priority: 'LOW',
    created_at: getDateDaysAgo(28),
    updated_at: getDateDaysAgo(27),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(27.8),
    picked_at: getDateDaysAgo(27.5),
    packed_at: getDateDaysAgo(27.2),
    shipped_at: getDateDaysAgo(27),
    progress: 100,
  },
  {
    order_id: 'SO71021',
    customer_name: 'Raviga',
    status: 'SHIPPED',
    priority: 'HIGH',
    created_at: getDateDaysAgo(35),
    updated_at: getDateDaysAgo(34),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(34.8),
    picked_at: getDateDaysAgo(34.5),
    packed_at: getDateDaysAgo(34.2),
    shipped_at: getDateDaysAgo(34),
    progress: 100,
  },
  {
    order_id: 'SO71022',
    customer_name: 'Goolybib',
    status: 'SHIPPED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(38),
    updated_at: getDateDaysAgo(37),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(37.8),
    picked_at: getDateDaysAgo(37.5),
    packed_at: getDateDaysAgo(37.2),
    shipped_at: getDateDaysAgo(37),
    progress: 100,
  },
  {
    order_id: 'SO71023',
    customer_name: 'Massive Dynamic 2',
    status: 'SHIPPED',
    priority: 'URGENT',
    created_at: getDateDaysAgo(42),
    updated_at: getDateDaysAgo(41),
    picker_id: 'USR-PICK01',
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(41.8),
    picked_at: getDateDaysAgo(41.5),
    packed_at: getDateDaysAgo(41.2),
    shipped_at: getDateDaysAgo(41),
    progress: 100,
  },
];

const MOCK_ORDER_ITEMS: OrderItem[] = [
  // SO71001 items
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
  // SO71002 items
  {
    order_item_id: 'OI71002-1',
    order_id: 'SO71002',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71002-2',
    order_id: 'SO71002',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71002-3',
    order_id: 'SO71002',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },
  // SO71003 items
  {
    order_item_id: 'OI71003-1',
    order_id: 'SO71003',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71003-2',
    order_id: 'SO71003',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },
  // SO71004 items
  {
    order_item_id: 'OI71004-1',
    order_id: 'SO71004',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-2',
    order_id: 'SO71004',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-3',
    order_id: 'SO71004',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71004-4',
    order_id: 'SO71004',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },
  // SO71005 items (PICKING - some picked)
  {
    order_item_id: 'OI71005-1',
    order_id: 'SO71005',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71005-2',
    order_id: 'SO71005',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'B-05-03',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71005-3',
    order_id: 'SO71005',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71005-4',
    order_id: 'SO71005',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  // SO71006 items (PICKING - in progress)
  {
    order_item_id: 'OI71006-1',
    order_id: 'SO71006',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71006-2',
    order_id: 'SO71006',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71006-3',
    order_id: 'SO71006',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  // SO71007 items (PICKING - in progress)
  {
    order_item_id: 'OI71007-1',
    order_id: 'SO71007',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71007-2',
    order_id: 'SO71007',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71007-3',
    order_id: 'SO71007',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 3,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71007-4',
    order_id: 'SO71007',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71007-5',
    order_id: 'SO71007',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },
  // SO71008 items (PICKED)
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
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71008-3',
    order_id: 'SO71008',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'C-10-05',
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
  // SO71009 items (PACKING)
  {
    order_item_id: 'OI71009-1',
    order_id: 'SO71009',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71009-2',
    order_id: 'SO71009',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71009-3',
    order_id: 'SO71009',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  // Remaining orders all have similar item patterns (simplified for brevity)
  // SO71010 (PACKED)
  {
    order_item_id: 'OI71010-1',
    order_id: 'SO71010',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71010-2',
    order_id: 'SO71010',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  // SO71011 (PACKED)
  {
    order_item_id: 'OI71011-1',
    order_id: 'SO71011',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71011-2',
    order_id: 'SO71011',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71011-3',
    order_id: 'SO71011',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  // SO71012 (SHIPPED - 7 days ago)
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
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  // SO71013 (SHIPPED - 10 days ago)
  {
    order_item_id: 'OI71013-1',
    order_id: 'SO71013',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'D-02-01',
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
  // SO71014 (SHIPPED - 20 days ago)
  {
    order_item_id: 'OI71014-1',
    order_id: 'SO71014',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-2',
    order_id: 'SO71014',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71014-3',
    order_id: 'SO71014',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  // SO71015 (SHIPPED - 25 days ago)
  {
    order_item_id: 'OI71015-1',
    order_id: 'SO71015',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71015-2',
    order_id: 'SO71015',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71015-3',
    order_id: 'SO71015',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  // SO71016 (SHIPPED - 30 days ago)
  {
    order_item_id: 'OI71016-1',
    order_id: 'SO71016',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71016-2',
    order_id: 'SO71016',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  // SO71017 (SHIPPED - 14 days ago)
  {
    order_item_id: 'OI71017-1',
    order_id: 'SO71017',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71017-2',
    order_id: 'SO71017',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71017-3',
    order_id: 'SO71017',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  // SO71018 (SHIPPED - 17 days ago)
  {
    order_item_id: 'OI71018-1',
    order_id: 'SO71018',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71018-2',
    order_id: 'SO71018',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  // SO71019 (SHIPPED - 21 days ago)
  {
    order_item_id: 'OI71019-1',
    order_id: 'SO71019',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71019-2',
    order_id: 'SO71019',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  // SO71020 (SHIPPED - 28 days ago)
  {
    order_item_id: 'OI71020-1',
    order_id: 'SO71020',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71020-2',
    order_id: 'SO71020',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71020-3',
    order_id: 'SO71020',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  // SO71021 (SHIPPED - 35 days ago)
  {
    order_item_id: 'OI71021-1',
    order_id: 'SO71021',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71021-2',
    order_id: 'SO71021',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'D-02-01',
    status: 'FULLY_PICKED',
  },
  // SO71022 (SHIPPED - 38 days ago)
  {
    order_item_id: 'OI71022-1',
    order_id: 'SO71022',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 3,
    picked_quantity: 3,
    bin_location: 'E-08-02',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71022-2',
    order_id: 'SO71022',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'F-12-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71022-3',
    order_id: 'SO71022',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'A-01-01',
    status: 'FULLY_PICKED',
  },
  // SO71023 (SHIPPED - 42 days ago)
  {
    order_item_id: 'OI71023-1',
    order_id: 'SO71023',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 2,
    picked_quantity: 2,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
  },
  {
    order_item_id: 'OI71023-2',
    order_id: 'SO71023',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 1,
    bin_location: 'C-10-05',
    status: 'FULLY_PICKED',
  },
];

async function resetAndSeedDatabase() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database reset and seed...');
    await client.query('BEGIN');
    console.log('🗑️  Clearing existing data...');
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
    await client.query('TRUNCATE TABLE audit_logs CASCADE');
    console.log('  ✅ Cleared audit_logs');
    await client.query('TRUNCATE TABLE skus CASCADE');
    console.log('  ✅ Cleared skus');

    console.log('📦 Inserting mock SKUs...');
    const MOCK_SKUS = [
      {
        sku: 'WIDGET-A-001',
        name: 'Widget A Type 1',
        category: 'Widgets',
        description: 'Standard widget type A',
        barcode: '10000001',
        active: true,
      },
      {
        sku: 'GADGET-B-002',
        name: 'Gadget B Type 2',
        category: 'Gadgets',
        description: 'Standard gadget type B',
        barcode: '10000002',
        active: true,
      },
      {
        sku: 'TOOL-C-003',
        name: 'Tool C Type 3',
        category: 'Tools',
        description: 'Standard tool type C',
        barcode: '10000003',
        active: true,
      },
      {
        sku: 'PART-D-004',
        name: 'Part D Type 4',
        category: 'Parts',
        description: 'Standard part type D',
        barcode: '10000004',
        active: true,
      },
      {
        sku: 'COMP-E-005',
        name: 'Component E Type 5',
        category: 'Components',
        description: 'Standard component type E',
        barcode: '10000005',
        active: true,
      },
      {
        sku: 'MATERIAL-F-006',
        name: 'Material F Type 6',
        category: 'Materials',
        description: 'Standard material type F',
        barcode: '10000006',
        active: true,
      },
    ];
    for (const sku of MOCK_SKUS) {
      await client.query(
        'INSERT INTO skus (sku, name, description, category, barcode, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [sku.sku, sku.name, sku.description, sku.category, sku.barcode, sku.active]
      );
    }
    console.log('  ✅ Inserted 6 SKUs');

    console.log('📦 Inserting mock orders...');
    for (const order of MOCK_ORDERS) {
      const customer_id = 'CUST-' + order.order_id.substring(2, 7);
      await client.query(
        'INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at, updated_at, picker_id, packer_id, claimed_at, picked_at, packed_at, shipped_at, progress) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
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
    console.log('  ✅ Inserted ' + MOCK_ORDERS.length + ' orders');

    // Disable the trigger that updates orders' updated_at when order_items are inserted
    // This preserves our historical updated_at values
    console.log('  🔧 Disabling trigger_update_order_progress...');
    await client.query('DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items');

    console.log('📦 Inserting mock order items...');
    for (const item of MOCK_ORDER_ITEMS) {
      await client.query(
        'INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
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
    console.log('  ✅ Inserted ' + MOCK_ORDER_ITEMS.length + ' order items');

    // Re-enable the trigger
    console.log('  🔧 Re-enabling trigger_update_order_progress...');
    await client.query(`
      CREATE TRIGGER trigger_update_order_progress
      AFTER INSERT OR UPDATE ON order_items
      FOR EACH ROW
      EXECUTE FUNCTION update_order_progress()
    `);

    console.log('📦 Creating pick tasks for PICKING orders...');
    const pickingOrders = MOCK_ORDERS.filter(o => o.status === 'PICKING');
    for (const order of pickingOrders) {
      const orderItems = MOCK_ORDER_ITEMS.filter(i => i.order_id === order.order_id);
      for (const item of orderItems) {
        const pickTaskId =
          'PT-' +
          order.order_id +
          '-' +
          item.order_item_id.substring(item.order_item_id.lastIndexOf('-') + 1);
        const pickedQty = item.picked_quantity || 0;
        const status =
          pickedQty >= item.quantity ? 'COMPLETED' : pickedQty > 0 ? 'IN_PROGRESS' : 'PENDING';

        // Calculate timestamps based on order claimed_at time
        const startedAt = order.claimed_at || new Date();
        const completedAt =
          status === 'COMPLETED' ? new Date(startedAt.getTime() + 5 * 60 * 1000) : null; // 5 min after start

        await client.query(
          'INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, picker_id, sku, name, target_bin, quantity, picked_quantity, status, started_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            pickTaskId,
            order.order_id,
            item.order_item_id,
            order.picker_id,
            item.sku,
            item.name,
            item.bin_location,
            item.quantity,
            pickedQty,
            status,
            startedAt,
            completedAt,
          ]
        );
      }
    }
    console.log('  ✅ Created pick tasks for ' + pickingOrders.length + ' PICKING orders');

    await client.query('COMMIT');
    console.log('✅ Database reset and seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  Orders: ' + MOCK_ORDERS.length);
    console.log('  Order Items: ' + MOCK_ORDER_ITEMS.length);
    console.log('\n📋 Order Status Breakdown:');
    const statusCounts: Record<string, number> = {};
    MOCK_ORDERS.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log('  ' + status + ': ' + count);
    });
    console.log('\n📈 Orders span the past 45 days for chart visibility');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database reset:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetAndSeedDatabase().catch(console.error);
