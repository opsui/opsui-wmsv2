/**
 * Request validation middleware using Joi
 *
 * Validates request bodies, query parameters, and route parameters
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@opsui/shared';
import { logger } from '../config/logger';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against a Joi schema
 */
export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.debug('Validation failed', { details });

      throw new ValidationError('Validation failed', details);
    }

    // Replace request body with validated and sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate request query parameters against a Joi schema
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.debug('Query validation failed', { details });

      throw new ValidationError('Query validation failed', details);
    }

    req.query = value;
    next();
  };
}

/**
 * Validate request route parameters against a Joi schema
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.debug('Params validation failed', { details });

      throw new ValidationError('Params validation failed', details);
    }

    req.params = value;
    next();
  };
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const commonSchemas = {
  // ID validation
  id: Joi.string().required().min(1).max(100),

  // Order ID - accepts both SO{number} and ORD-YYYYMMDD-XXX formats
  orderId: Joi.string()
    .pattern(/^(SO[1-9][0-9]{3,4}|ORD-[0-9]{8}-[0-9]{3})$/)
    .required()
    .messages({
      'string.pattern.base': 'Order ID must match format SO{number} or ORD-YYYYMMDD-XXX',
    }),

  // SKU
  sku: Joi.string()
    .pattern(/^[A-Z0-9-]{2,50}$/)
    .required()
    .messages({
      'string.pattern.base': 'SKU must be 2-50 alphanumeric characters (A-Z, 0-9, hyphens)',
    }),

  // Bin location
  binLocation: Joi.string()
    .pattern(/^[A-Z]-[0-9]{1,3}-[0-9]{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Bin location must match format ZONE-AISLE-SHELF (e.g., A-12-03)',
    }),

  // Email
  email: Joi.string()
    .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Must be a valid email address',
    }),

  // Quantity
  quantity: Joi.number().integer().positive().required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be a whole number',
    'number.positive': 'Quantity must be greater than 0',
  }),

  // Priority
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').required(),

  // Status
  status: Joi.string()
    .valid('PENDING', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED', 'CANCELLED', 'BACKORDER')
    .required(),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  },
};

// ============================================================================
// SPECIFIC VALIDATION SCHEMAS
// ============================================================================

export const schemas = {
  // Create order
  createOrder: Joi.object({
    customerId: Joi.string().required(),
    customerName: Joi.string().required().min(2).max(255),
    priority: commonSchemas.priority,
    items: Joi.array()
      .items(
        Joi.object({
          sku: commonSchemas.sku,
          quantity: commonSchemas.quantity,
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'Order must have at least one item',
      }),
  }),

  // Claim order
  claimOrder: Joi.object({
    pickerId: commonSchemas.id,
  }),

  // Pick item
  pickItem: Joi.object({
    sku: commonSchemas.sku,
    quantity: commonSchemas.quantity,
    binLocation: commonSchemas.binLocation,
    pickTaskId: commonSchemas.id,
  }).custom((value, helpers) => {
    // Handle both camelCase and snake_case
    const binLocation = value.binLocation || value.bin_location;
    const pickTaskId = value.pickTaskId || value.pick_task_id;

    if (!binLocation) {
      return helpers.error('binLocation is required');
    }
    if (!pickTaskId) {
      return helpers.error('pickTaskId is required');
    }

    return value;
  }),

  // Complete order
  completeOrder: Joi.object({
    orderId: commonSchemas.orderId,
    pickerId: commonSchemas.id,
  }),

  // Cancel order
  cancelOrder: Joi.object({
    orderId: commonSchemas.orderId,
    userId: commonSchemas.id,
    reason: Joi.string().required().min(5).max(500),
  }),

  // Create user
  createUser: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: commonSchemas.email,
    password: Joi.string().required().min(8).max(100),
    role: Joi.string().valid('PICKER', 'PACKER', 'SUPERVISOR', 'ADMIN').required(),
  }),

  // Update user
  updateUser: Joi.object({
    name: Joi.string().min(2).max(100),
    email: commonSchemas.email,
    role: Joi.string().valid('PICKER', 'PACKER', 'SUPERVISOR', 'ADMIN'),
    active: Joi.boolean(),
  }),

  // Login
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),

  // Query params for order list
  orderQuery: Joi.object({
    status: commonSchemas.status,
    priority: commonSchemas.priority,
    pickerId: commonSchemas.id,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Query params for SKU list
  skuQuery: Joi.object({
    category: Joi.string(),
    active: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

// ============================================================================
// VALIDATION MIDDLEWARE FACTORIES
// ============================================================================

export const validate = {
  createOrder: validateBody(schemas.createOrder),
  claimOrder: validateBody(schemas.claimOrder),
  pickItem: validateBody(schemas.pickItem),
  completeOrder: validateBody(schemas.completeOrder),
  cancelOrder: validateBody(schemas.cancelOrder),
  createUser: validateBody(schemas.createUser),
  updateUser: validateBody(schemas.updateUser),
  login: validateBody(schemas.login),
  orderQuery: validateQuery(schemas.orderQuery),
  skuQuery: validateQuery(schemas.skuQuery),
  orderId: validateParams(Joi.object({ orderId: commonSchemas.orderId })),
  sku: validateParams(Joi.object({ sku: commonSchemas.sku })),
  userId: validateParams(Joi.object({ userId: commonSchemas.id })),
};
