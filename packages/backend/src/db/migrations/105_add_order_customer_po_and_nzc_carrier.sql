ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_po_number VARCHAR(100);

INSERT INTO carriers (
  carrier_id,
  name,
  carrier_code,
  service_types,
  contact_email,
  api_endpoint,
  is_active,
  requires_account_number,
  requires_package_dimensions,
  requires_weight
)
VALUES (
  'CARR-NZC',
  'NZ Couriers',
  'NZC',
  ARRAY['Courier', 'CourierPost', 'Overnight', 'Rural'],
  'support@nzcouriers.co.nz',
  'https://api.freightways.co.nz',
  true,
  false,
  true,
  true
)
ON CONFLICT (carrier_code) DO UPDATE SET
  name = EXCLUDED.name,
  service_types = EXCLUDED.service_types,
  contact_email = EXCLUDED.contact_email,
  api_endpoint = EXCLUDED.api_endpoint,
  is_active = EXCLUDED.is_active,
  requires_package_dimensions = EXCLUDED.requires_package_dimensions,
  requires_weight = EXCLUDED.requires_weight,
  updated_at = NOW();
