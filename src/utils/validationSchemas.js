// Add these schemas to your validationSchemas.js file

const { z } = require('zod');

// Main API Response Schema for complete pipeline
const apiResponseSchema = z.union([
  z.object({
    currency: z.string(),
    amounts: z.array(z.object({
      type: z.string(),
      value: z.number(),
      source: z.string().optional()
    })),
    status: z.literal("ok")
  }),
  z.object({
    status: z.literal("no_amounts_found"),
    reason: z.string(),
    confidence: z.number().min(0).max(1).optional()
  })
]);

// Update Extraction Body Schema
const updateResultSchema = z.object({
  currency: z.string().optional(),
  amounts: z.array(z.object({
    type: z.string(),
    value: z.number(),
    source: z.string().optional()
  })).optional(),
  status: z.string().optional()
});

// Step 1: OCR Extraction Schema
const ocrExtractionSchema = z.union([
  z.object({
    raw_tokens: z.array(z.string()).min(1, "At least one token required"),
    currency_hint: z.string().optional(),
    confidence: z.number().min(0).max(1)
  }),
  z.object({
    status: z.literal("no_amounts_found"),
    reason: z.string()
  })
]);

// Step 2: Normalization Schema
const normalizationSchema = z.object({
  normalized_amounts: z.array(z.number()).min(1, "At least one normalized amount required"),
  normalization_confidence: z.number().min(0).max(1)
});

// Step 3: Classification Schema
const classificationSchema = z.object({
  amounts: z.array(z.object({
    type: z.string(),
    value: z.number()
  })).min(1, "At least one classified amount required"),
  confidence: z.number().min(0).max(1)
});

module.exports = {
  apiResponseSchema,
  updateResultSchema,
  ocrExtractionSchema,
  normalizationSchema,
  classificationSchema
};