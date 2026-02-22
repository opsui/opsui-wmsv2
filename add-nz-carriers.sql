-- ============================================================================
-- Add New Zealand Carriers
-- ============================================================================

-- Insert NZ-based carriers (comprehensive list)
INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
VALUES
  -- Major NZ Couriers
  ('CARR-NZC', 'NZ Courier', 'NZC', ARRAY['STANDARD', 'EXPRESS', 'OVERNIGHT', 'SAME_DAY'], 'support@nzcourier.co.nz', '0800 800 800', 'https://api.nzcourier.co.nz', true, true, true, true),
  ('CARR-NZPOST', 'NZ Post', 'NZPOST', ARRAY['STANDARD', 'EXPRESS', 'INTERNATIONAL'], 'support@nzpost.co.nz', '0800 501 501', 'https://api.nzpost.co.nz', true, true, true, true),
  ('CARR-MF', 'Mainfreight', 'MAINFREIGHT', ARRAY['STANDARD', 'EXPRESS', 'OVERNIGHT', 'INTERNATIONAL'], 'support@mainfreight.co.nz', '0800 800 111', 'https://api.mainfreight.com', true, true, true, true),
  ('CARR-PB', 'Post Haste', 'POSTHASTE', ARRAY['STANDARD', 'EXPRESS', 'OVERNIGHT'], 'support@posthaste.co.nz', '0800 106 800', 'https://api.posthaste.co.nz', true, true, true, true),
  ('CARR-PBT', 'PBT Couriers', 'PBT', ARRAY['STANDARD', 'EXPRESS', 'OVERNIGHT'], 'support@pbt.co.nz', '0800 728 587', 'https://api.pbt.co.nz', true, true, true, true),
  ('CARR-CP', 'Castle Parcels', 'CASTLE', ARRAY['STANDARD', 'EXPRESS'], 'support@castleparcels.co.nz', '0800 800 818', 'https://api.castleparcels.co.nz', true, true, true, true),
  -- Additional NZ Freight Companies
  ('CARR-FP', 'First Logistics', 'FIRST', ARRAY['STANDARD', 'EXPRESS', 'FREIGHT'], 'support@firstlogistics.co.nz', '09 270 6700', 'https://api.firstlogistics.co.nz', true, true, true, true),
  ('CARR-SC', 'Streamline', 'STREAMLINE', ARRAY['STANDARD', 'EXPRESS'], 'support@streamline.co.nz', '0800 500 505', 'https://api.streamline.co.nz', true, true, true, true),
  ('CARR-OW', 'OW Logistics', 'OW', ARRAY['STANDARD', 'FREIGHT', 'BULK'], 'info@owlogistics.co.nz', '09 263 5700', 'https://api.owlogistics.co.nz', true, true, true, true),
  -- International carriers with NZ operations
  ('CARR-DHL', 'DHL Express NZ', 'DHL', ARRAY['EXPRESS', 'INTERNATIONAL'], 'support@dhl.co.nz', '0800 800 300', 'https://api.dhl.com', true, true, true, true),
  ('CARR-FEDEX', 'FedEx NZ', 'FEDEX', ARRAY['EXPRESS', 'INTERNATIONAL'], 'support@fedex.com', '0800 733 279', 'https://api.fedex.com', true, true, true, true),
  ('CARR-UPS', 'UPS NZ', 'UPS', ARRAY['EXPRESS', 'INTERNATIONAL'], 'support@ups.com', '09 972 2800', 'https://api.ups.com', true, true, true, true)
ON CONFLICT (carrier_id) DO NOTHING;
