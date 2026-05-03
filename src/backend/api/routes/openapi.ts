/**
 * @fileoverview OpenAPI documentation routes
 */

import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import { apiReference } from '@scalar/hono-api-reference';

const openapiRouter = new Hono<{ Bindings: Env }>();

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Core Template API',
    version: '1.0.0',
    description: 'API documentation for the Cloudflare Workers template',
  },
  servers: [
    {
      url: '/api',
      description: 'API Server',
    },
  ],
  paths: {
    '/auth/session': {
      post: {
        summary: 'Create an authenticated session from the WORKER_API_KEY secret',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  apiKey: { type: 'string' },
                },
                required: ['apiKey'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Session created successfully',
          },
        },
      },
    },
    '/dashboard/metrics': {
      get: {
        summary: 'Get dashboard metrics',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100 },
          },
        ],
        responses: {
          '200': {
            description: 'Metrics retrieved successfully',
          },
        },
      },
    },
    '/threads': {
      get: {
        summary: 'List session threads',
        tags: ['AI Threads'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Threads retrieved successfully',
          },
        },
      },
      post: {
        summary: 'Create a new thread',
        tags: ['AI Threads'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1 },
                },
                required: ['title'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Thread created successfully',
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'System is healthy',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};

openapiRouter.get('/openapi.json', (c) => c.json(openApiSpec));
openapiRouter.get('/swagger', swaggerUI({ url: '/openapi.json' }));

const scalarReference = apiReference({
  spec: {
    url: '/openapi.json',
  },
  theme: 'dark',
});

openapiRouter.get('/scalar', scalarReference);
openapiRouter.get('/scaler', scalarReference);
openapiRouter.get('/docs', (c) => c.redirect('/scalar'));

export { openapiRouter };
