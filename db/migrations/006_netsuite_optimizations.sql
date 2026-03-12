-- NetSuite Optimization Tables
-- Run this migration to add caching and metrics support

-- ============================================================================
-- 1. NetSuite Item Cache
-- ============================================================================

CREATE TABLE IF NOT EXISTS netsuite_item_cache (
  id VARCHAR(50) PRIMARY KEY,
  item_id VARCHAR(100),
  display_name VARCHAR(255),
  upc_code VARCHAR(50),
  bin_number VARCHAR(50),
  description TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for UPC lookups (barcode scanning)
CREATE INDEX IF NOT EXISTS idx_netsuite_item_cache_upc
  ON netsuite_item_cache(upc_code)
  WHERE upc_code IS NOT NULL AND upc_code != '';

-- Index for item ID lookups
CREATE INDEX IF NOT EXISTS idx_netsuite_item_cache_item_id
  ON netsuite_item_cache(item_id);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_netsuite_item_cache_cached_at
  ON netsuite_item_cache(cached_at);

-- ============================================================================
-- 2. Sync Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_metrics (
  id SERIAL PRIMARY KEY,
  integration_id VARCHAR(100) NOT NULL,
  job_id VARCHAR(50),

  -- Timing
  sync_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sync_end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Counts
  orders_fetched INTEGER DEFAULT 0,
  orders_processed INTEGER DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  orders_updated INTEGER DEFAULT 0,
  orders_failed INTEGER DEFAULT 0,
  orders_skipped INTEGER DEFAULT 0,
  orders_cleaned INTEGER DEFAULT 0,

  -- API metrics
  api_calls_made INTEGER DEFAULT 0,
  api_latency_avg_ms INTEGER,
  api_latency_max_ms INTEGER,
  api_errors INTEGER DEFAULT 0,

  -- Database metrics
  db_operations INTEGER DEFAULT 0,
  db_latency_ms INTEGER,

  -- Cache metrics
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'running',
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for integration lookups
CREATE INDEX IF NOT EXISTS idx_sync_metrics_integration_id
  ON sync_metrics(integration_id, sync_start_time DESC);

-- Index for job lookups
CREATE INDEX IF NOT EXISTS idx_sync_metrics_job_id
  ON sync_metrics(job_id);

-- Index for recent metrics queries
CREATE INDEX IF NOT EXISTS idx_sync_metrics_recent
  ON sync_metrics(sync_start_time DESC)
  WHERE sync_start_time > NOW() - INTERVAL '7 days';

-- ============================================================================
-- 3. Webhook Events (for real-time updates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS netsuite_webhook_events (
  id SERIAL PRIMARY KEY,

  -- Event identification
  event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,

  -- NetSuite record info
  record_type VARCHAR(50) NOT NULL,
  record_internal_id VARCHAR(50) NOT NULL,
  record_tran_id VARCHAR(100),

  -- Processing status
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,

  -- Payload
  payload JSONB DEFAULT '{}',

  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Index for pending events
CREATE INDEX IF NOT EXISTS idx_webhook_events_pending
  ON netsuite_webhook_events(received_at)
  WHERE status = 'pending';

-- Index for retry processing
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry
  ON netsuite_webhook_events(next_retry_at)
  WHERE status = 'pending' AND attempts < max_attempts;

-- Index for deduplication
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id
  ON netsuite_webhook_events(event_id);

-- ============================================================================
-- 4. Webhook Signature Verification
-- ============================================================================

CREATE TABLE IF NOT EXISTS netsuite_webhook_secrets (
  id SERIAL PRIMARY KEY,
  integration_id VARCHAR(100) NOT NULL,
  secret_key VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(integration_id, secret_key)
);

-- ============================================================================
-- 5. Sync Configuration (for dynamic settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS netsuite_sync_config (
  id SERIAL PRIMARY KEY,
  integration_id VARCHAR(100) UNIQUE NOT NULL,

  -- Sync settings
  sync_interval_ms INTEGER DEFAULT 120000, -- 2 minutes
  batch_size INTEGER DEFAULT 50,
  max_concurrent INTEGER DEFAULT 5,

  -- Retry settings
  max_retries INTEGER DEFAULT 3,
  retry_base_delay_ms INTEGER DEFAULT 1000,

  -- Date range
  days_lookback INTEGER DEFAULT 7,

  -- Feature flags
  enable_parallel BOOLEAN DEFAULT true,
  enable_cache BOOLEAN DEFAULT true,
  enable_webhooks BOOLEAN DEFAULT false,

  -- Updated at
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- ============================================================================
-- 6. Views for Analytics
-- ============================================================================

-- Recent sync performance
CREATE OR REPLACE VIEW vw_sync_performance AS
SELECT
  integration_id,
  COUNT(*) as total_syncs,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  AVG(orders_processed) as avg_orders_processed,
  SUM(orders_failed) as total_failures,
  AVG(api_latency_avg_ms) as avg_api_latency_ms,
  SUM(api_errors) as total_api_errors,
  SUM(cache_hits) as total_cache_hits,
  SUM(cache_misses) as total_cache_misses,
  CASE
    WHEN SUM(cache_hits + cache_misses) > 0
    THEN ROUND(SUM(cache_hits)::numeric / SUM(cache_hits + cache_misses) * 100, 2)
    ELSE 0
  END as cache_hit_rate_pct,
  MAX(sync_start_time) as last_sync_at
FROM sync_metrics
WHERE sync_start_time > NOW() - INTERVAL '24 hours'
GROUP BY integration_id;

-- Sync health summary
CREATE OR REPLACE VIEW vw_sync_health AS
SELECT
  m.integration_id,
  m.sync_start_time,
  m.sync_end_time,
  m.duration_ms,
  m.status,
  m.orders_processed,
  m.orders_failed,
  m.api_errors,
  CASE
    WHEN m.status = 'completed' AND m.orders_failed = 0 THEN 'healthy'
    WHEN m.status = 'completed' AND m.orders_failed > 0 THEN 'degraded'
    WHEN m.status = 'failed' THEN 'unhealthy'
    ELSE 'unknown'
  END as health_status
FROM sync_metrics m
WHERE m.sync_start_time > NOW() - INTERVAL '1 hour'
ORDER BY m.sync_start_time DESC;

-- ============================================================================
-- 7. Functions
-- ============================================================================

-- Function to clean old metrics (call periodically)
CREATE OR REPLACE FUNCTION clean_old_sync_metrics(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_metrics
  WHERE sync_start_time < NOW() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get next pending webhook event
CREATE OR REPLACE FUNCTION get_next_webhook_event()
RETURNS TABLE (
  id INTEGER,
  event_id VARCHAR(100),
  event_type VARCHAR(50),
  record_type VARCHAR(50),
  record_internal_id VARCHAR(50),
  record_tran_id VARCHAR(100),
  payload JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nwe.id,
    nwe.event_id,
    nwe.event_type,
    nwe.record_type,
    nwe.record_internal_id,
    nwe.record_tran_id,
    nwe.payload
  FROM netsuite_webhook_events nwe
  WHERE nwe.status = 'pending'
    AND (nwe.next_retry_at IS NULL OR nwe.next_retry_at <= NOW())
  ORDER BY nwe.received_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON TABLE netsuite_item_cache IS 'Caches NetSuite item lookups to reduce API calls';
COMMENT ON TABLE sync_metrics IS 'Tracks detailed metrics for each sync operation';
COMMENT ON TABLE netsuite_webhook_events IS 'Stores webhook events from NetSuite for processing';
COMMENT ON TABLE netsuite_sync_config IS 'Per-integration sync configuration settings';
