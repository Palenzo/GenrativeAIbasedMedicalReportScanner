const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI-Powered Amount Detection API',
      version: '1.0.0',
      description: 'A production-ready API that extracts, normalizes, and classifies financial amounts from medical documents using advanced AI techniques. Supports both text and image inputs with automatic data persistence.',
      contact: {
        name: 'API Support',
        url: 'https://github.com/<your-username>/<your-repo-name>/issues'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message describing what went wrong',
              example: 'An error occurred during processing.'
            }
          }
        },
        ExtractionResult: {
          type: 'object',
          description: 'The result of a successful extraction process with validated and normalized data.',
          properties: {
            id: {
              type: 'integer',
              description: 'The unique numeric ID for the result.',
              example: 1,
            },
            currency: {
              type: 'string',
              description: 'The detected currency code.',
              example: 'INR',
            },
            amounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    description: 'The classification of the amount.',
                    example: 'total_bill',
                  },
                  value: {
                    type: 'number',
                    description: 'The normalized numeric value.',
                    example: 1200,
                  },
                  source: {
                    type: 'string',
                    description: 'The snippet of text from which the amount was extracted.',
                    example: "text: 'Total: INR 1200'",
                  },
                },
              },
            },
            status: {
              type: 'string',
              description: 'The final status of the extraction.',
              example: 'ok',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'The timestamp when the result was created.',
              example: '2025-09-27T10:00:00.000Z',
            },
          },
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Extraction',
        description: 'Financial amount extraction operations'
      }
    ],
  },
  apis: ['./src/api/*.js'], // files containing annotations as above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

