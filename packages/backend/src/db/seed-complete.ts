/**
 * Complete Database Seed
 *
 * This script seeds all essential data:
 * 1. Users (pickers, packers, admins)
 * 2. SKUs
 * 3. Orders
 * 4. Order Items
 */

import 'dotenv/config';
import { getPool } from './client';
import * as bcrypt from 'bcrypt';

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

interface User {
  user_id: string;
  name: string;
  password: string;
  email: string;
  role: string;
}

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

// Generate dates spread over the past 45 days
function getDateDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Mock users
const MOCK_USERS: User[] = [
  {
    user_id: 'USR-ADMIN',
    name: 'System Administrator',
    password: 'admin123',
    email: 'admin@wms.local',
    role: 'ADMIN',
  },
  {
    user_id: 'USR-PICK01',
    name: 'John Picker',
    password: 'picker123',
    email: 'picker1@wms.local',
    role: 'PICKER',
  },
  {
    user_id: 'USR-JMSQXXDN',
    name: 'Jane Packer',
    password: 'packer123',
    email: 'packer1@wms.local',
    role: 'PACKER',
  },
];

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

  // Past 2 weeks orders (SHIPPED)
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

  // Past month orders (SHIPPED)
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

  // Cancelled orders
  {
    order_id: 'SO71015',
    customer_name: 'Vought Inc',
    status: 'CANCELLED',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(5),
    updated_at: getDateDaysAgo(5),
    picker_id: 'USR-PICK02',
    claimed_at: getDateDaysAgo(4.9),
    picked_at: undefined,
    packed_at: undefined,
    shipped_at: undefined,
    progress: 0,
  },
  {
    order_id: 'SO71016',
    customer_name: 'Global Dynamics',
    status: 'CANCELLED',
    priority: 'LOW',
    created_at: getDateDaysAgo(12),
    updated_at: getDateDaysAgo(12),
    picker_id: 'USR-PICK03',
    claimed_at: getDateDaysAgo(11.9),
    picked_at: getDateDaysAgo(11.5),
    packed_at: undefined,
    shipped_at: undefined,
    progress: 45,
  },

  // On Hold orders
  {
    order_id: 'SO71017',
    customer_name: 'Massive Dynamic',
    status: 'PENDING',
    priority: 'HIGH',
    created_at: getDateDaysAgo(3),
    updated_at: getDateDaysAgo(2),
    picker_id: 'USR-PICK04',
    claimed_at: getDateDaysAgo(2.5),
    picked_at: undefined,
    packed_at: undefined,
    shipped_at: undefined,
    progress: 20,
  },
  {
    order_id: 'SO71018',
    customer_name: 'Primatech',
    status: 'PENDING',
    priority: 'URGENT',
    created_at: getDateDaysAgo(8),
    updated_at: getDateDaysAgo(7),
    picker_id: 'USR-PICK01',
    claimed_at: getDateDaysAgo(7.8),
    picked_at: undefined,
    packed_at: undefined,
    shipped_at: undefined,
    progress: 0,
  },

  // Backordered items (orders that need more inventory)
  {
    order_id: 'SO71019',
    customer_name: 'Stark Solutions',
    status: 'PENDING',
    priority: 'NORMAL',
    created_at: getDateDaysAgo(1),
    updated_at: getDateDaysAgo(0.5),
    progress: 0,
  },

  // === Additional 50 orders spread across last 30 days for chart visualization ===
  // Day 1-5: Recent SHIPPED orders
  ...Array.from({ length: 10 }, (_, i) => ({
    order_id: `SO720${String(i + 1).padStart(2, '0')}`,
    customer_name: [
      'Acme Corp',
      'TechStart',
      'DataFlow',
      'CloudNet',
      'ByteWise',
      'NextGen',
      'ProLink',
      'SmartSys',
      'InnoTech',
      'CoreDev',
    ][i],
    status: 'SHIPPED' as OrderStatus,
    priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'][i % 4] as Priority,
    created_at: getDateDaysAgo(i + 1),
    updated_at: getDateDaysAgo(i + 0.8),
    picker_id: ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'][i % 4],
    packer_id: 'USR-JMSQXXDN',
    claimed_at: getDateDaysAgo(i + 0.95),
    picked_at: getDateDaysAgo(i + 0.9),
    packed_at: getDateDaysAgo(i + 0.85),
    shipped_at: getDateDaysAgo(i + 0.8),
    progress: 100,
  })),

  // Day 6-15: Mix of SHIPPED and PICKED orders
  ...Array.from({ length: 15 }, (_, i) => ({
    order_id: `SO721${String(i + 1).padStart(2, '0')}`,
    customer_name: [
      'Quantum Ltd',
      'Apex Solutions',
      'Vertex Inc',
      'Horizon Tech',
      'Pinnacle Corp',
      'Summit Systems',
      'Zenith Data',
      'Orbit Networks',
      'Pulse Tech',
      'Wave Systems',
      'Flux Corp',
      'Spark Inc',
      'Flow Dynamics',
      'Stream Tech',
      'River Systems',
    ][i],
    status: (i % 3 === 0 ? 'PICKED' : 'SHIPPED') as OrderStatus,
    priority: ['LOW', 'NORMAL', 'HIGH'][i % 3] as Priority,
    created_at: getDateDaysAgo(6 + i),
    updated_at: getDateDaysAgo(6 + i - 0.2),
    picker_id: ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'][i % 4],
    packer_id: i % 3 !== 0 ? 'USR-JMSQXXDN' : undefined,
    claimed_at: getDateDaysAgo(6 + i - 0.1),
    picked_at: getDateDaysAgo(6 + i - 0.15),
    packed_at: i % 3 !== 0 ? getDateDaysAgo(6 + i - 0.2) : undefined,
    shipped_at: i % 3 !== 0 ? getDateDaysAgo(6 + i - 0.25) : undefined,
    progress: i % 3 === 0 ? 75 : 100,
  })),

  // Day 16-25: More SHIPPED orders with some PICKED
  ...Array.from({ length: 15 }, (_, i) => ({
    order_id: `SO722${String(i + 1).padStart(2, '0')}`,
    customer_name: [
      'Alpha Tech',
      'Beta Systems',
      'Gamma Inc',
      'Delta Corp',
      'Epsilon Ltd',
      'Zeta Solutions',
      'Eta Networks',
      'Theta Data',
      'Iota Soft',
      'Kappa Labs',
      'Lambda Corp',
      'Mu Systems',
      'Nu Tech',
      'Xi Dynamics',
      'Omicron Inc',
    ][i],
    status: (i % 4 === 0 ? 'PICKED' : 'SHIPPED') as OrderStatus,
    priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'][i % 4] as Priority,
    created_at: getDateDaysAgo(16 + i),
    updated_at: getDateDaysAgo(16 + i - 0.3),
    picker_id: ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'][i % 4],
    packer_id: i % 4 !== 0 ? 'USR-JMSQXXDN' : undefined,
    claimed_at: getDateDaysAgo(16 + i - 0.1),
    picked_at: getDateDaysAgo(16 + i - 0.2),
    packed_at: i % 4 !== 0 ? getDateDaysAgo(16 + i - 0.25) : undefined,
    shipped_at: i % 4 !== 0 ? getDateDaysAgo(16 + i - 0.3) : undefined,
    progress: i % 4 === 0 ? 75 : 100,
  })),

  // Day 26-30: Older orders
  ...Array.from({ length: 10 }, (_, i) => ({
    order_id: `SO723${String(i + 1).padStart(2, '0')}`,
    customer_name: [
      'Sigma Corp',
      'Tau Systems',
      'Upsilon Tech',
      'Phi Networks',
      'Chi Data',
      'Psi Soft',
      'Omega Labs',
      'Prime Inc',
      'Nova Corp',
      'Stellar Systems',
    ][i],
    status: (i % 2 === 0 ? 'SHIPPED' : 'PICKED') as OrderStatus,
    priority: ['NORMAL', 'HIGH'][i % 2] as Priority,
    created_at: getDateDaysAgo(26 + i),
    updated_at: getDateDaysAgo(26 + i - 0.4),
    picker_id: ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'][i % 4],
    packer_id: i % 2 === 0 ? 'USR-JMSQXXDN' : undefined,
    claimed_at: getDateDaysAgo(26 + i - 0.1),
    picked_at: getDateDaysAgo(26 + i - 0.2),
    packed_at: i % 2 === 0 ? getDateDaysAgo(26 + i - 0.3) : undefined,
    shipped_at: i % 2 === 0 ? getDateDaysAgo(26 + i - 0.4) : undefined,
    progress: i % 2 === 0 ? 100 : 75,
  })),

  // === 50 PENDING orders for queue ===
  ...Array.from({ length: 50 }, (_, i) => ({
    order_id: `SO724${String(i + 1).padStart(2, '0')}`,
    customer_name: [
      'TechFlow Inc',
      'DataPrime',
      'CloudSoft',
      'NexGen Labs',
      'ByteSystems',
      'QuantumCore',
      'ApexDigital',
      'VertexTech',
      'HorizonData',
      'PinnacleSoft',
      'SummitTech',
      'ZenithCorp',
      'OrbitData',
      'PulseSystems',
      'WaveTech',
      'FluxInc',
      'SparkLabs',
      'FlowCorp',
      'StreamSoft',
      'RiverTech',
      'AlphaData',
      'BetaCorp',
      'GammaTech',
      'DeltaSoft',
      'EpsilonLabs',
      'ZetaCorp',
      'EtaTech',
      'ThetaData',
      'IotaSoft',
      'KappaLabs',
      'LambdaTech',
      'MuCorp',
      'NuSoft',
      'XiLabs',
      'OmicronTech',
      'PiCorp',
      'RhoTech',
      'SigmaSoft',
      'TauLabs',
      'UpsilonTech',
      'PhiCorp',
      'ChiTech',
      'PsiSoft',
      'OmegaLabs',
      'PrimeTech',
      'NovaCorp',
      'StellarTech',
      'CosmicSoft',
      'NebulaLabs',
      'GalaxyTech',
    ][i],
    status: 'PENDING' as OrderStatus,
    priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'][i % 4] as Priority,
    created_at: getDateDaysAgo((i % 10) * 0.1), // Spread across last day
    updated_at: getDateDaysAgo((i % 10) * 0.1),
    progress: 0,
  })),
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
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 4,
    picked_quantity: 4,
    bin_location: 'B-05-03',
    status: 'FULLY_PICKED',
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
  // SO71009 items (PACKING)
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
  // SO71010 (PACKED)
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
  // SO71011 (PACKED)
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
  // SO71012 (SHIPPED)
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
  // SO71013 (SHIPPED)
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
  // SO71014 (SHIPPED)
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
  // SO71015 items (CANCELLED - not picked)
  {
    order_item_id: 'OI71015-1',
    order_id: 'SO71015',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71015-2',
    order_id: 'SO71015',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  // SO71016 items (CANCELLED - partially picked)
  {
    order_item_id: 'OI71016-1',
    order_id: 'SO71016',
    sku: 'GADGET-B-002',
    name: 'Gadget B Type 2',
    quantity: 3,
    picked_quantity: 1,
    bin_location: 'B-05-03',
    status: 'PARTIAL_PICKED',
  },
  {
    order_item_id: 'OI71016-2',
    order_id: 'SO71016',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 2,
    picked_quantity: 1,
    bin_location: 'D-02-01',
    status: 'PARTIAL_PICKED',
  },
  // SO71017 items (ON_HOLD)
  {
    order_item_id: 'OI71017-1',
    order_id: 'SO71017',
    sku: 'COMP-E-005',
    name: 'Component E Type 5',
    quantity: 1,
    picked_quantity: 0,
    bin_location: 'E-08-02',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71017-2',
    order_id: 'SO71017',
    sku: 'MATERIAL-F-006',
    name: 'Material F Type 6',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'F-12-03',
    status: 'PENDING',
  },
  // SO71018 items (ON_HOLD)
  {
    order_item_id: 'OI71018-1',
    order_id: 'SO71018',
    sku: 'WIDGET-A-001',
    name: 'Widget A Type 1',
    quantity: 4,
    picked_quantity: 0,
    bin_location: 'A-01-01',
    status: 'PENDING',
  },
  {
    order_item_id: 'OI71018-2',
    order_id: 'SO71018',
    sku: 'TOOL-C-003',
    name: 'Tool C Type 3',
    quantity: 2,
    picked_quantity: 0,
    bin_location: 'C-10-05',
    status: 'PENDING',
  },
  // SO71019 items (PENDING - backorder candidate)
  {
    order_item_id: 'OI71019-1',
    order_id: 'SO71019',
    sku: 'PART-D-004',
    name: 'Part D Type 4',
    quantity: 5,
    picked_quantity: 0,
    bin_location: 'D-02-01',
    status: 'PENDING',
  },

  // === Order items for the additional 50 orders ===
  // Generate 2-3 items per order
  ...Array.from({ length: 50 }, (_, orderIdx) => {
    const orderId =
      orderIdx < 10
        ? `SO720${String(orderIdx + 1).padStart(2, '0')}`
        : orderIdx < 25
          ? `SO721${String(orderIdx - 9).padStart(2, '0')}`
          : orderIdx < 40
            ? `SO722${String(orderIdx - 24).padStart(2, '0')}`
            : `SO723${String(orderIdx - 39).padStart(2, '0')}`;
    const numItems = 2 + (orderIdx % 2); // 2 or 3 items per order
    const orderStatus =
      orderIdx < 10
        ? 'FULLY_PICKED'
        : orderIdx < 25
          ? orderIdx % 3 === 0
            ? 'PENDING'
            : 'FULLY_PICKED'
          : orderIdx < 40
            ? orderIdx % 4 === 0
              ? 'PENDING'
              : 'FULLY_PICKED'
            : orderIdx % 2 === 0
              ? 'FULLY_PICKED'
              : 'PENDING';

    return Array.from({ length: numItems }, (_, itemIdx) => {
      const skus = [
        'WIDGET-A-001',
        'GADGET-B-002',
        'TOOL-C-003',
        'PART-D-004',
        'COMP-E-005',
        'MATERIAL-F-006',
      ];
      const names = [
        'Widget A Type 1',
        'Gadget B Type 2',
        'Tool C Type 3',
        'Part D Type 4',
        'Component E Type 5',
        'Material F Type 6',
      ];
      const bins = ['A-01-01', 'B-02-03', 'C-10-05', 'D-02-01', 'E-05-02', 'A-03-04'];

      return {
        order_item_id: `OI${orderId.slice(2)}-${itemIdx + 1}`,
        order_id: orderId,
        sku: skus[(orderIdx + itemIdx) % skus.length],
        name: names[(orderIdx + itemIdx) % names.length],
        quantity: 1 + (orderIdx % 4),
        picked_quantity: orderStatus === 'FULLY_PICKED' ? 1 + (orderIdx % 4) : 0,
        bin_location: bins[(orderIdx + itemIdx) % bins.length],
        status: orderStatus as ItemStatus,
      };
    });
  }).flat(),

  // === Order items for the 50 PENDING orders ===
  ...Array.from({ length: 50 }, (_, orderIdx) => {
    const orderId = `SO724${String(orderIdx + 1).padStart(2, '0')}`;
    const numItems = 2 + (orderIdx % 2); // 2 or 3 items per order

    return Array.from({ length: numItems }, (_, itemIdx) => {
      const skus = [
        'WIDGET-A-001',
        'GADGET-B-002',
        'TOOL-C-003',
        'PART-D-004',
        'COMP-E-005',
        'MATERIAL-F-006',
      ];
      const names = [
        'Widget A Type 1',
        'Gadget B Type 2',
        'Tool C Type 3',
        'Part D Type 4',
        'Component E Type 5',
        'Material F Type 6',
      ];
      const bins = ['A-01-01', 'B-02-03', 'C-10-05', 'D-02-01', 'E-05-02', 'A-03-04'];

      return {
        order_item_id: `OI724${String(orderIdx + 1).padStart(2, '0')}-${itemIdx + 1}`,
        order_id: orderId,
        sku: skus[(orderIdx + itemIdx) % skus.length],
        name: names[(orderIdx + itemIdx) % names.length],
        quantity: 1 + (orderIdx % 4),
        picked_quantity: 0,
        bin_location: bins[(orderIdx + itemIdx) % bins.length],
        status: 'PENDING' as ItemStatus,
      };
    });
  }).flat(),
];

async function seedCompleteDatabase() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Starting complete database seed...');

    // Begin transaction
    await client.query('BEGIN');

    // Insert users first
    console.log('👤 Inserting users...');
    for (const user of MOCK_USERS) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await client.query(
          `INSERT INTO users (user_id, name, email, password_hash, role, active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role`,
          [user.user_id, user.name, user.email, hashedPassword, user.role, true]
        );
      } catch (err: any) {
        // Ignore duplicate key errors
        if (!err.code || err.code !== '23505') {
          throw err;
        }
      }
    }
    console.log(`  ✅ Inserted ${MOCK_USERS.length} users`);

    // Insert additional pickers for historical tasks
    const ADDITIONAL_PICKERS = [
      {
        user_id: 'USR-PICK02',
        name: 'Mike Johnson',
        password: 'picker123',
        email: 'mike.johnson@wms.local',
        role: 'PICKER',
      },
      {
        user_id: 'USR-PICK03',
        name: 'Sarah Williams',
        password: 'picker123',
        email: 'sarah.williams@wms.local',
        role: 'PICKER',
      },
      {
        user_id: 'USR-PICK04',
        name: 'David Chen',
        password: 'picker123',
        email: 'david.chen@wms.local',
        role: 'PICKER',
      },
    ];

    for (const user of ADDITIONAL_PICKERS) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await client.query(
          `INSERT INTO users (user_id, name, email, password_hash, role, active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role`,
          [user.user_id, user.name, user.email, hashedPassword, user.role, true]
        );
      } catch (err: any) {
        if (!err.code || err.code !== '23505') {
          throw err;
        }
      }
    }
    console.log(`  ✅ Inserted ${ADDITIONAL_PICKERS.length} additional pickers`);

    // Insert SKUs
    console.log('📦 Inserting SKUs...');
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
        `INSERT INTO skus (sku, name, description, category, barcode, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           barcode = EXCLUDED.barcode,
           active = EXCLUDED.active,
           updated_at = NOW()`,
        [sku.sku, sku.name, sku.description, sku.category, sku.barcode, sku.active]
      );
    }
    console.log(`  ✅ Inserted ${MOCK_SKUS.length} SKUs`);

    // Insert bin locations
    console.log('📍 Inserting bin locations...');
    const MOCK_BIN_LOCATIONS = [
      // Zone A - Fast Moving Items
      { bin_id: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: 'SHELF' },
      { bin_id: 'A-01-02', zone: 'A', aisle: '01', shelf: '02', type: 'SHELF' },
      { bin_id: 'A-01-03', zone: 'A', aisle: '01', shelf: '03', type: 'SHELF' },
      { bin_id: 'A-02-01', zone: 'A', aisle: '02', shelf: '01', type: 'SHELF' },
      { bin_id: 'A-02-02', zone: 'A', aisle: '02', shelf: '02', type: 'SHELF' },
      { bin_id: 'A-02-03', zone: 'A', aisle: '02', shelf: '03', type: 'SHELF' },
      // Zone B - Medium Moving Items
      { bin_id: 'B-05-01', zone: 'B', aisle: '005', shelf: '01', type: 'SHELF' },
      { bin_id: 'B-05-02', zone: 'B', aisle: '005', shelf: '02', type: 'SHELF' },
      { bin_id: 'B-05-03', zone: 'B', aisle: '005', shelf: '03', type: 'SHELF' },
      // Zone C - Slow Moving Items
      { bin_id: 'C-10-01', zone: 'C', aisle: '010', shelf: '01', type: 'SHELF' },
      { bin_id: 'C-10-02', zone: 'C', aisle: '010', shelf: '02', type: 'SHELF' },
      { bin_id: 'C-10-03', zone: 'C', aisle: '010', shelf: '03', type: 'SHELF' },
      { bin_id: 'C-10-04', zone: 'C', aisle: '010', shelf: '04', type: 'SHELF' },
      { bin_id: 'C-10-05', zone: 'C', aisle: '010', shelf: '05', type: 'SHELF' },
      // Zone D - Bulk Storage
      { bin_id: 'D-02-01', zone: 'D', aisle: '002', shelf: '01', type: 'BIN' },
      { bin_id: 'D-02-02', zone: 'D', aisle: '002', shelf: '02', type: 'BIN' },
      // Zone E - Components
      { bin_id: 'E-08-01', zone: 'E', aisle: '008', shelf: '01', type: 'SHELF' },
      { bin_id: 'E-08-02', zone: 'E', aisle: '008', shelf: '02', type: 'SHELF' },
      // Zone F - Materials
      { bin_id: 'F-12-01', zone: 'F', aisle: '012', shelf: '01', type: 'SHELF' },
      { bin_id: 'F-12-02', zone: 'F', aisle: '012', shelf: '02', type: 'SHELF' },
      { bin_id: 'F-12-03', zone: 'F', aisle: '012', shelf: '03', type: 'SHELF' },
    ];

    for (const bin of MOCK_BIN_LOCATIONS) {
      await client.query(
        `INSERT INTO bin_locations (bin_id, zone, aisle, shelf, type, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (bin_id) DO NOTHING`,
        [bin.bin_id, bin.zone, bin.aisle, bin.shelf, bin.type, true]
      );
    }
    console.log(`  ✅ Inserted ${MOCK_BIN_LOCATIONS.length} bin locations`);

    // Insert orders
    console.log('📦 Inserting orders...');
    for (const order of MOCK_ORDERS) {
      const customer_id = 'CUST-' + order.order_id.substring(2, 7);
      await client.query(
        `INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at, updated_at, picker_id, packer_id, claimed_at, picked_at, packed_at, shipped_at, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (order_id) DO UPDATE SET
           status = EXCLUDED.status,
           priority = EXCLUDED.priority,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           picker_id = EXCLUDED.picker_id,
           packer_id = EXCLUDED.packer_id,
           claimed_at = EXCLUDED.claimed_at,
           picked_at = EXCLUDED.picked_at,
           packed_at = EXCLUDED.packed_at,
           shipped_at = EXCLUDED.shipped_at,
           progress = EXCLUDED.progress`,
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

    // Disable the trigger to preserve timestamps (skip if no permission)
    console.log('  🔧 Disabling trigger_update_order_progress...');
    try {
      await client.query('SAVEPOINT before_trigger_drop');
      await client.query('DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items');
      await client.query('RELEASE SAVEPOINT before_trigger_drop');
    } catch (triggerError) {
      await client.query('ROLLBACK TO SAVEPOINT before_trigger_drop');
      console.log('  ⚠️ Could not disable trigger (continuing anyway)');
    }

    // Insert order items
    console.log('📦 Inserting order items...');
    for (const item of MOCK_ORDER_ITEMS) {
      await client.query(
        `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (order_item_id) DO NOTHING`,
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

    // Re-enable the trigger (skip if no permission)
    console.log('  🔧 Re-enabling trigger_update_order_progress...');
    try {
      await client.query('SAVEPOINT before_trigger_create');
      await client.query(`
        CREATE TRIGGER trigger_update_order_progress
        AFTER INSERT OR UPDATE ON order_items
        FOR EACH ROW
        EXECUTE FUNCTION update_order_progress()
      `);
      await client.query('RELEASE SAVEPOINT before_trigger_create');
    } catch (triggerError) {
      await client.query('ROLLBACK TO SAVEPOINT before_trigger_create');
      console.log('  ⚠️ Could not re-enable trigger (continuing anyway)');
    }

    // Create pick_tasks for PICKING orders
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
          `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, picker_id, sku, name, target_bin, quantity, picked_quantity, status, started_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (pick_task_id) DO NOTHING`,
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
    console.log(`  ✅ Created pick tasks for ${pickingOrders.length} PICKING orders`);

    // Create historical COMPLETED pick_tasks for past orders (within last 30 days)
    // This data populates the Weekly Picker Performance and Top SKUs charts
    console.log('📦 Creating historical completed pick tasks...');
    const completedOrders = MOCK_ORDERS.filter(o =>
      ['PICKED', 'PACKING', 'PACKED', 'SHIPPED'].includes(o.status)
    );

    // Pickers to assign historical tasks to
    const historicalPickers = ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'];

    let pickTaskCount = 0;
    for (const order of completedOrders) {
      const orderItems = MOCK_ORDER_ITEMS.filter(i => i.order_id === order.order_id);
      // Assign picker if not already assigned
      const pickerId =
        order.picker_id || historicalPickers[Math.floor(Math.random() * historicalPickers.length)];
      const orderDate = order.updated_at;

      for (const item of orderItems) {
        const pickTaskId =
          'PT-HIST-' +
          order.order_id +
          '-' +
          item.order_item_id.substring(item.order_item_id.lastIndexOf('-') + 1);

        // Random completion time between 2-8 minutes
        const completionMinutes = 2 + Math.floor(Math.random() * 6);
        const startedAt = new Date(orderDate.getTime() - completionMinutes * 60 * 1000);
        const completedAt = orderDate;

        await client.query(
          `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, picker_id, sku, name, target_bin, quantity, picked_quantity, status, started_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (pick_task_id) DO NOTHING`,
          [
            pickTaskId,
            order.order_id,
            item.order_item_id,
            pickerId,
            item.sku,
            item.name,
            item.bin_location,
            item.quantity,
            item.quantity,
            'COMPLETED',
            startedAt,
            completedAt,
          ]
        );
        pickTaskCount++;
      }
    }
    console.log(`  ✅ Created ${pickTaskCount} historical completed pick tasks`);

    // Insert inventory_units (stock in bins)
    console.log('📦 Inserting inventory units...');
    const MOCK_INVENTORY_UNITS = [
      { unit_id: 'IU-A-01-01-001', sku: 'WIDGET-A-001', bin_location: 'A-01-01', quantity: 50 },
      { unit_id: 'IU-A-01-02-001', sku: 'WIDGET-A-001', bin_location: 'A-01-02', quantity: 50 },
      { unit_id: 'IU-A-01-03-001', sku: 'WIDGET-A-001', bin_location: 'A-01-03', quantity: 50 },
      { unit_id: 'IU-B-05-01-001', sku: 'GADGET-B-002', bin_location: 'B-05-01', quantity: 30 },
      { unit_id: 'IU-B-05-02-001', sku: 'GADGET-B-002', bin_location: 'B-05-02', quantity: 30 },
      { unit_id: 'IU-B-05-03-001', sku: 'GADGET-B-002', bin_location: 'B-05-03', quantity: 40 },
      { unit_id: 'IU-C-10-01-001', sku: 'TOOL-C-003', bin_location: 'C-10-01', quantity: 25 },
      { unit_id: 'IU-C-10-02-001', sku: 'TOOL-C-003', bin_location: 'C-10-02', quantity: 25 },
      { unit_id: 'IU-C-10-03-001', sku: 'TOOL-C-003', bin_location: 'C-10-03', quantity: 25 },
      { unit_id: 'IU-C-10-04-001', sku: 'TOOL-C-003', bin_location: 'C-10-04', quantity: 25 },
      { unit_id: 'IU-C-10-05-001', sku: 'TOOL-C-003', bin_location: 'C-10-05', quantity: 25 },
      { unit_id: 'IU-D-02-01-001', sku: 'PART-D-004', bin_location: 'D-02-01', quantity: 100 },
      { unit_id: 'IU-D-02-02-001', sku: 'PART-D-004', bin_location: 'D-02-02', quantity: 100 },
      { unit_id: 'IU-E-08-01-001', sku: 'COMP-E-005', bin_location: 'E-08-01', quantity: 40 },
      { unit_id: 'IU-E-08-02-001', sku: 'COMP-E-005', bin_location: 'E-08-02', quantity: 60 },
      { unit_id: 'IU-F-12-01-001', sku: 'MATERIAL-F-006', bin_location: 'F-12-01', quantity: 80 },
      { unit_id: 'IU-F-12-02-001', sku: 'MATERIAL-F-006', bin_location: 'F-12-02', quantity: 70 },
      { unit_id: 'IU-F-12-03-001', sku: 'MATERIAL-F-006', bin_location: 'F-12-03', quantity: 50 },
    ];

    for (const unit of MOCK_INVENTORY_UNITS) {
      await client.query(
        `INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (unit_id) DO NOTHING`,
        [unit.unit_id, unit.sku, unit.bin_location, unit.quantity]
      );
    }
    console.log(`  ✅ Inserted ${MOCK_INVENTORY_UNITS.length} inventory units`);

    // Insert inventory_transactions for turnover analytics
    console.log('📦 Inserting inventory transactions...');
    const transactionTypes = ['RECEIPT', 'DEDUCTION', 'ADJUSTMENT'];
    const transactionSkus = [
      'WIDGET-A-001',
      'GADGET-B-002',
      'TOOL-C-003',
      'PART-D-004',
      'COMP-E-005',
      'MATERIAL-F-006',
    ];
    const binLocations = ['A-01-01', 'B-05-03', 'C-10-05', 'D-02-01', 'E-08-02', 'F-12-03'];

    let transactionCount = 0;
    // Generate transactions spread over the past 30 days
    for (let day = 0; day < 30; day++) {
      const numTransactionsPerDay = 3 + Math.floor(Math.random() * 5); // 3-7 transactions per day
      for (let t = 0; t < numTransactionsPerDay; t++) {
        const sku = transactionSkus[Math.floor(Math.random() * transactionSkus.length)];
        const binLocation = binLocations[Math.floor(Math.random() * binLocations.length)];
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}-${day}-${t}`;
        const timestamp = new Date(Date.now() - day * 24 * 60 * 60 * 1000 - t * 60 * 60 * 1000);
        const quantity =
          type === 'RECEIPT'
            ? 10 + Math.floor(Math.random() * 50)
            : type === 'DEDUCTION'
              ? -(5 + Math.floor(Math.random() * 20))
              : Math.floor(Math.random() * 10) - 5;

        try {
          await client.query('SAVEPOINT insert_transaction');
          await client.query(
            `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, reason, bin_location, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (transaction_id) DO NOTHING`,
            [
              transactionId,
              type,
              sku,
              quantity,
              type === 'RECEIPT'
                ? 'Stock receipt from supplier'
                : type === 'DEDUCTION'
                  ? 'Stock picked for order'
                  : 'Inventory adjustment',
              binLocation,
              timestamp,
            ]
          );
          await client.query('RELEASE SAVEPOINT insert_transaction');
          transactionCount++;
        } catch (err: any) {
          await client.query('ROLLBACK TO SAVEPOINT insert_transaction');
          // Continue with next transaction
        }
      }
    }
    console.log(`  ✅ Inserted ${transactionCount} inventory transactions`);

    // Insert location_capacities for bin utilization analytics
    console.log('📦 Inserting location capacities...');
    const locationCapacities = [
      // Zone A - Fast Moving Items
      {
        bin_location: 'A-01-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 100,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'A-01-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 100,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'A-01-03',
        capacity_type: 'QUANTITY',
        maximum_capacity: 100,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'A-02-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 100,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'A-02-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 100,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'A-02-03',
        capacity_type: 'QUANTITY',
        maximum_capacity: 100,
        capacity_unit: 'UNITS',
      },
      // Zone B - Medium Moving Items
      {
        bin_location: 'B-05-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 80,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'B-05-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 80,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'B-05-03',
        capacity_type: 'QUANTITY',
        maximum_capacity: 80,
        capacity_unit: 'UNITS',
      },
      // Zone C - Slow Moving Items
      {
        bin_location: 'C-10-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 50,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'C-10-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 50,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'C-10-03',
        capacity_type: 'QUANTITY',
        maximum_capacity: 50,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'C-10-04',
        capacity_type: 'QUANTITY',
        maximum_capacity: 50,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'C-10-05',
        capacity_type: 'QUANTITY',
        maximum_capacity: 50,
        capacity_unit: 'UNITS',
      },
      // Zone D - Bulk Storage
      {
        bin_location: 'D-02-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 200,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'D-02-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 200,
        capacity_unit: 'UNITS',
      },
      // Zone E - Components
      {
        bin_location: 'E-08-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 120,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'E-08-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 120,
        capacity_unit: 'UNITS',
      },
      // Zone F - Materials
      {
        bin_location: 'F-12-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: 150,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'F-12-02',
        capacity_type: 'QUANTITY',
        maximum_capacity: 150,
        capacity_unit: 'UNITS',
      },
      {
        bin_location: 'F-12-03',
        capacity_type: 'QUANTITY',
        maximum_capacity: 150,
        capacity_unit: 'UNITS',
      },
    ];

    let capacityCount = 0;
    for (const cap of locationCapacities) {
      // Get current inventory in this bin
      const invResult = await client.query(
        'SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_units WHERE bin_location = $1',
        [cap.bin_location]
      );
      const currentUtilization = parseInt(invResult.rows[0].total) || 0;
      const utilizationPercent =
        Math.round((currentUtilization / cap.maximum_capacity) * 100 * 100) / 100;
      const availableCapacity = cap.maximum_capacity - currentUtilization;

      const capacityId = `CAP-${cap.bin_location}`;

      try {
        await client.query('SAVEPOINT insert_capacity');
        await client.query(
          `INSERT INTO location_capacities (capacity_id, bin_location, capacity_type, maximum_capacity, current_utilization, available_capacity, utilization_percent, capacity_unit, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (bin_location) DO UPDATE SET
             current_utilization = EXCLUDED.current_utilization,
             available_capacity = EXCLUDED.available_capacity,
             utilization_percent = EXCLUDED.utilization_percent,
             status = EXCLUDED.status,
             last_updated = NOW()`,
          [
            capacityId,
            cap.bin_location,
            cap.capacity_type,
            cap.maximum_capacity,
            currentUtilization,
            availableCapacity,
            utilizationPercent,
            cap.capacity_unit,
            utilizationPercent > 100 ? 'EXCEEDED' : utilizationPercent >= 80 ? 'WARNING' : 'ACTIVE',
          ]
        );
        await client.query('RELEASE SAVEPOINT insert_capacity');
        capacityCount++;
      } catch (err: any) {
        await client.query('ROLLBACK TO SAVEPOINT insert_capacity');
        console.log(`  ⚠️ Skipping capacity insert for ${cap.bin_location}: ${err.message}`);
      }
    }
    console.log(`  ✅ Inserted ${capacityCount} location capacities`);

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database seed completed successfully!');

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`  Users: ${MOCK_USERS.length + ADDITIONAL_PICKERS.length}`);
    console.log(`  SKUs: ${MOCK_SKUS.length}`);
    console.log(`  Bin Locations: ${MOCK_BIN_LOCATIONS.length}`);
    console.log(`  Inventory Units: ${MOCK_INVENTORY_UNITS.length}`);
    console.log(`  Orders: ${MOCK_ORDERS.length}`);
    console.log(`  Order Items: ${MOCK_ORDER_ITEMS.length}`);
    console.log(`  Inventory Transactions: ${transactionCount}`);
    console.log(`  Location Capacities: ${capacityCount}`);

    console.log('\n👤 Users:');
    MOCK_USERS.forEach(u => console.log(`  - ${u.name} (${u.role}): ${u.password}`));

    console.log('\n📋 Order Status Breakdown:');
    const statusCounts: Record<string, number> = {};
    MOCK_ORDERS.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database seed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
seedCompleteDatabase().catch(console.error);
