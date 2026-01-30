/**
 * OpenAPI/Swagger Configuration
 *
 * This file configures Swagger UI for API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { UserRole } from '@opsui/shared';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warehouse Management System API',
      version: '1.0.0',
      description: `
        # Warehouse Management System API

        A comprehensive REST API for managing warehouse operations including:
        - Order management and fulfillment
        - Inventory tracking and control
        - Picking and packing operations
        - Cycle counting and audits
        - User and role management
        - Real-time notifications

        ## Authentication

        This API uses JWT (JSON Web Token) authentication. Include your token in the Authorization header:

        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`

        ## Roles

        The API supports role-based access control:
        - **ADMIN**: Full system access
        - **SUPERVISOR**: Management oversight
        - **PICKER**: Order picking operations
        - **PACKER**: Order packing operations
        - **STOCK_CONTROLLER**: Inventory management
        - **INWARDS**: Receiving operations
        - **PRODUCTION**: Production management
        - **MAINTENANCE**: Equipment maintenance
        - **SALES**: Sales operations
        - **RMA**: Returns management

        ## Rate Limiting

        API requests are rate limited:
        - 100 requests per 15 minutes per IP
        - Includes rate limit headers in responses

        ## Pagination

        List endpoints support pagination:
        - \`page\`: Page number (default: 1)
        - \`limit\`: Items per page (default: 20, max: 100)

        ## Error Responses

        All endpoints may return these error codes:
        - **400**: Bad Request - Invalid input
        - **401**: Unauthorized - Missing or invalid token
        - **403**: Forbidden - Insufficient permissions
        - **404**: Not Found - Resource doesn't exist
        - **500**: Internal Server Error - Server error
      `,
      contact: {
        name: 'API Support',
        email: 'support@wms.local',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1 - Current stable version',
      },
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling',
            },
          },
          required: ['success', 'error'],
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {},
            },
            total: {
              type: 'number',
              description: 'Total number of items',
            },
            page: {
              type: 'number',
              description: 'Current page number',
            },
            limit: {
              type: 'number',
              description: 'Items per page',
            },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
            },
          },
        },
        PaginationParams: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              minimum: 1,
              default: 1,
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        },

        // User schemas
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: Object.values(UserRole),
              description: 'User role',
            },
            active: {
              type: 'boolean',
              description: 'Whether the user is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Order schemas
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Order ID (e.g., SO0001 or ORD-...)',
            },
            status: {
              type: 'string',
              enum: [
                'PENDING',
                'PICKING',
                'PICKED',
                'PACKING',
                'PACKED',
                'SHIPPED',
                'CANCELLED',
                'BACKORDER',
              ],
              description: 'Order status',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
              description: 'Order priority',
            },
            itemCount: {
              type: 'number',
              description: 'Number of items in order',
            },
            pickedCount: {
              type: 'number',
              description: 'Number of items picked',
            },
            pickerId: {
              type: 'string',
              description: 'Assigned picker user ID',
              nullable: true,
            },
            packerId: {
              type: 'string',
              description: 'Assigned packer user ID',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            shippedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },

        // SKU schemas
        SKU: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            sku: {
              type: 'string',
              description: 'SKU code',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            description: {
              type: 'string',
            },
            quantity: {
              type: 'number',
              description: 'Current stock quantity',
            },
            location: {
              type: 'string',
              description: 'Bin location (e.g., A-01-01)',
              nullable: true,
            },
          },
        },

        // Cycle Count schemas
        CycleCountPlan: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            planName: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['FULL', 'PARTIAL', 'SPOT', 'ABC'],
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            },
            scheduledDate: {
              type: 'string',
              format: 'date',
            },
            totalItems: {
              type: 'number',
            },
            countedItems: {
              type: 'number',
            },
            varianceCount: {
              type: 'number',
              description: 'Number of items with variance',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
