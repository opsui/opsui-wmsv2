/**
 * OpenTelemetry Configuration and Instrumentation
 *
 * Provides distributed tracing and metrics instrumentation
 * for the Warehouse Management System.
 *
 * @see https://opentelemetry.io/docs/instrumentation/js/
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  SemanticResourceAttributes,
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  OTLPTraceExporter,
} from '@opentelemetry/exporter-trace-otlp-grpc';
import {
  OTLPMetricExporter,
} from '@opentelemetry/exporter-metrics-otlp-grpc';
import {
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import * as diag from '@opentelemetry/api';
import config from '../config';

// ============================================================================
// RESOURCE ATTRIBUTES
// ============================================================================

const resourceAttributes = {
  'service.name': config.otel.serviceName || 'wms-backend',
  'service.version': process.env.npm_package_version || '1.0.0',
  'deployment.environment': process.env.NODE_ENV || 'development',
  'process.pid': process.pid.toString(),
  'host.name': require('os').hostname(),
};

// ============================================================================
// EXPORTERS
// ============================================================================

/**
 * Trace exporter - sends traces to OTLP collector (e.g., Jaeger, Tempo)
 */
const traceExporter = new OTLPTraceExporter({
  url: config.otel.collectorUrl || 'http://localhost:4317',
  headers: {},
});

/**
 * Metrics exporter - sends metrics to OTLP collector (e.g., Prometheus)
 */
const metricExporter = new OTLPMetricExporter({
  url: config.otel.collectorUrl || 'http://localhost:4317',
  headers: {},
});

// ============================================================================
// METRICS READER
// ============================================================================

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60000, // Export metrics every 60 seconds
  exportTimeoutMillis: 30000,
});

// ============================================================================
// OPENTELEMETRY SDK
// ============================================================================

/**
 * Initialize OpenTelemetry SDK
 * Call this before importing any other application code
 */
export function initializeTelemetry(): NodeSDK {
  const sdk = new NodeSDK({
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable some instrumentations if not needed
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  // Initialize the SDK
  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry', error));
  });

  console.log('OpenTelemetry initialized successfully');
  return sdk;
}

// ============================================================================
// TRACING UTILITIES
// ============================================================================

const tracer = diag.trace.getTracer(
  'wms-backend',
  '1.0.0'
);

/**
 * Wrap an async function with a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: diag.Span) => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes as Record<string, string | number | boolean | undefined>);
      }
      const result = await fn(span);
      span.setStatus({ code: diag.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: diag.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, unknown>): void {
  try {
    const activeSpan = diag.trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes as Record<string, string | number | boolean | undefined>);
    }
  } catch (error) {
    // Silently fail - tracing should not break the application
    console.error('[OpenTelemetry] Failed to add span attributes:', error);
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, unknown>): void {
  try {
    const activeSpan = diag.trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes as Record<string, string | number | boolean | undefined> | undefined);
    }
  } catch (error) {
    // Silently fail - tracing should not break the application
    console.error('[OpenTelemetry] Failed to add span event:', error);
  }
}

/**
 * Record exception on current span
 */
export function recordException(error: Error): void {
  try {
    const activeSpan = diag.trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error);
    }
  } catch (err) {
    // Silently fail - tracing should not break the application
    console.error('[OpenTelemetry] Failed to record exception:', err);
  }
}

// ============================================================================
// METRICS UTILITIES
// ============================================================================

const meter = diag.metrics.getMeter('wms-backend', '1.0.0');

/**
 * Create a counter metric
 */
export function createCounter(name: string, options?: {
  description?: string;
  unit?: string;
}) {
  return meter.createCounter(name, {
    description: options?.description,
    unit: options?.unit || '1',
  });
}

/**
 * Create a histogram metric
 */
export function createHistogram(name: string, options?: {
  description?: string;
  unit?: string;
}) {
  return meter.createHistogram(name, {
    description: options?.description,
    unit: options?.unit || 'ms',
  });
}

/**
 * Create a gauge metric
 */
export function createGauge(name: string, options?: {
  description?: string;
  unit?: string;
}) {
  return meter.createObservableGauge(name, {
    description: options?.description,
    unit: options?.unit || '1',
  });
}

// ============================================================================
// PRE-DEFINED METRICS
// ============================================================================

// Request metrics
export const httpRequestDuration = createHistogram('http_request_duration', {
  description: 'Duration of HTTP requests',
  unit: 'ms',
});

export const httpRequestSize = createHistogram('http_request_size', {
  description: 'Size of HTTP requests',
  unit: 'By',
});

export const httpResponseSize = createHistogram('http_response_size', {
  description: 'Size of HTTP responses',
  unit: 'By',
});

// Database metrics
export const dbQueryDuration = createHistogram('db_query_duration', {
  description: 'Duration of database queries',
  unit: 'ms',
});

// Business metrics
export const ordersProcessed = createCounter('orders_processed_total', {
  description: 'Total number of orders processed',
  unit: '1',
});

export const picksCompleted = createCounter('picks_completed_total', {
  description: 'Total number of picks completed',
  unit: '1',
});

export const inventoryTransactions = createCounter('inventory_transactions_total', {
  description: 'Total number of inventory transactions',
  unit: '1',
});

// Error metrics
export const errorsTotal = createCounter('errors_total', {
  description: 'Total number of errors',
  unit: '1',
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializeTelemetry,
  withSpan,
  addSpanAttributes,
  addSpanEvent,
  recordException,
  createCounter,
  createHistogram,
  createGauge,
  httpRequestDuration,
  httpRequestSize,
  httpResponseSize,
  dbQueryDuration,
  ordersProcessed,
  picksCompleted,
  inventoryTransactions,
  errorsTotal,
  tracer,
  meter,
};
