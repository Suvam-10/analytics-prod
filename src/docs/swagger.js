const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analytics Backend API',
      version: '1.0.0',
      description: 'Comprehensive analytics platform with event tracking, user statistics, and URL shortening',
      license: {
        name: 'MIT'
      },
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      },
      schemas: {
        Event: {
          type: 'object',
          required: ['event_type'],
          properties: {
            event: { type: 'string', description: 'Event type name' },
            event_type: { type: 'string', description: 'Event classification' },
            url: { type: 'string', description: 'Page URL where event occurred' },
            referrer: { type: 'string', description: 'Referring URL' },
            device: { type: 'string', enum: ['desktop', 'mobile', 'tablet', 'unknown'] },
            userId: { type: 'string', description: 'User identifier' },
            user_id: { type: 'string', description: 'User identifier' },
            metadata: { type: 'object', description: 'Custom metadata' },
            timestamp: { type: 'string', format: 'date-time', description: 'Event timestamp (ISO 8601)' }
          }
        },
        App: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Application ID' },
            name: { type: 'string', description: 'Application name' },
            owner_email: { type: 'string', format: 'email', description: 'Owner email' },
            metadata: { type: 'object', description: 'Application metadata' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            app_id: { type: 'string', format: 'uuid' },
            key_id: { type: 'string', description: 'Unique key identifier' },
            token: { type: 'string', description: 'API token (full key, only shown at creation)' },
            status: { type: 'string', enum: ['active', 'revoked'] },
            created_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time' }
          }
        },
        EventSummary: {
          type: 'object',
          properties: {
            event: { type: 'string', description: 'Event type or "all"' },
            count: { type: 'integer', description: 'Total event count' },
            uniqueUsers: { type: 'integer', description: 'Unique user count' },
            deviceData: {
              type: 'object',
              additionalProperties: { type: 'integer' },
              description: 'Event count by device type'
            }
          }
        },
        UserStats: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            totalEvents: { type: 'integer' },
            recentEvents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  event: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  metadata: { type: 'object' }
                }
              }
            },
            deviceDetails: { type: 'object' }
          }
        },
        ShortUrl: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            app_id: { type: 'string', format: 'uuid' },
            short_code: { type: 'string', description: 'Short URL code' },
            target_url: { type: 'string', format: 'uri', description: 'Target URL' },
            clicks: { type: 'integer', description: 'Click count' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
            status: { type: 'integer', description: 'HTTP status code' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const spec = swaggerJSDoc(options);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new application
 *     description: Create a new analytics application and receive an API key
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - owner_email
 *             properties:
 *               name:
 *                 type: string
 *                 example: My App
 *               owner_email:
 *                 type: string
 *                 format: email
 *                 example: owner@example.com
 *               meta:
 *                 type: object
 *                 example: { company: "ACME Inc" }
 *     responses:
 *       201:
 *         description: Application registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 app:
 *                   $ref: '#/components/schemas/App'
 *                 apiKey:
 *                   $ref: '#/components/schemas/ApiKey'
 *       400:
 *         description: Missing required fields
 */

/**
 * @swagger
 * /auth/api-key:
 *   get:
 *     summary: Get API key for application
 *     description: Retrieve API key details for a specific application
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: app_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: API key details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       400:
 *         description: app_id is required
 *       404:
 *         description: No API key found
 */

/**
 * @swagger
 * /auth/revoke:
 *   post:
 *     summary: Revoke API key
 *     description: Revoke an existing API key to prevent further access
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key_id
 *             properties:
 *               key_id:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 revoked:
 *                   type: boolean
 *       400:
 *         description: key_id is required
 */

/**
 * @swagger
 * /auth/regenerate:
 *   post:
 *     summary: Regenerate API key
 *     description: Generate a new API key for an application
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key_id
 *             properties:
 *               key_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: New API key generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *       400:
 *         description: key_id is required
 */

/**
 * @swagger
 * /analytics/collect:
 *   post:
 *     summary: Collect analytics events
 *     description: Submit single or multiple events for tracking
 *     tags:
 *       - Analytics
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Event'
 *               - type: object
 *                 properties:
 *                   events:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Event'
 *           examples:
 *             single:
 *               summary: Single event
 *               value:
 *                 event_type: page_view
 *                 url: /dashboard
 *                 device: desktop
 *             multiple:
 *               summary: Multiple events
 *               value:
 *                 events:
 *                   - event_type: page_view
 *                     url: /dashboard
 *                   - event_type: button_click
 *                     url: /dashboard
 *                     metadata: { button_id: submit }
 *     responses:
 *       201:
 *         description: Events accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accepted:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Missing or invalid API key
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @swagger
 * /analytics/event-summary:
 *   get:
 *     summary: Get event summary statistics
 *     description: Retrieve aggregated event statistics for a date range
 *     tags:
 *       - Analytics
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: event
 *         schema:
 *           type: string
 *         description: Filter by event type (optional)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO 8601, defaults to 7 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO 8601, defaults to now)
 *       - in: query
 *         name: app_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Override app_id from API key (admin only)
 *     responses:
 *       200:
 *         description: Event summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventSummary'
 *       401:
 *         description: Missing or invalid API key
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @swagger
 * /analytics/user-stats:
 *   get:
 *     summary: Get user statistics
 *     description: Retrieve user activity and recent events
 *     tags:
 *       - Analytics
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve stats for
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStats'
 *       400:
 *         description: userId is required
 *       401:
 *         description: Missing or invalid API key
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @swagger
 * /short/create:
 *   post:
 *     summary: Create shortened URL
 *     description: Generate a short URL code for tracking redirects
 *     tags:
 *       - URL Shortener
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *               - target_url
 *             properties:
 *               app_id:
 *                 type: string
 *                 format: uuid
 *               target_url:
 *                 type: string
 *                 format: uri
 *               short_code:
 *                 type: string
 *                 description: Custom short code (optional, auto-generated if omitted)
 *     responses:
 *       201:
 *         description: Short URL created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShortUrl'
 *       400:
 *         description: Missing required fields
 */

/**
 * @swagger
 * /short/stats:
 *   get:
 *     summary: Get short URL statistics
 *     description: Retrieve click count and details for a short URL
 *     tags:
 *       - URL Shortener
 *     parameters:
 *       - in: query
 *         name: short_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Short URL code
 *     responses:
 *       200:
 *         description: Short URL statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 short:
 *                   $ref: '#/components/schemas/ShortUrl'
 *                 clicks:
 *                   type: integer
 *       400:
 *         description: short_code is required
 *       404:
 *         description: Short URL not found
 */

/**
 * @swagger
 * /short/r/{short_code}:
 *   get:
 *     summary: Redirect short URL
 *     description: Redirect to target URL and track the click
 *     tags:
 *       - URL Shortener
 *     parameters:
 *       - in: path
 *         name: short_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Short URL code
 *     responses:
 *       302:
 *         description: Redirect to target URL
 *       404:
 *         description: Short URL not found
 */

router.use('/', swaggerUi.serve, swaggerUi.setup(spec, { 
  customCss: '.topbar { display: none }',
  customSiteTitle: 'Analytics API Docs'
}));

module.exports = router;
