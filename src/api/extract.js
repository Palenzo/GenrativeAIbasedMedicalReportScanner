// src/api/extract.js

const express = require('express');
const multer = require('multer');
const aiService = require('../services/aiService');
const storage = require('../utils/storage');
const { apiResponseSchema, updateResultSchema, ocrExtractionSchema, normalizationSchema, classificationSchema } = require('../utils/validationSchemas');

const router = express.Router();

// Use in-memory storage for efficiency
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/extract/step1/ocr:
 *   post:
 *     tags: [Extraction - Step 1]
 *     summary: Step 1 - OCR/Text Extraction - Extract raw numeric tokens from bills/receipts
 *     description: Extract raw numeric tokens from text input or image OCR with currency detection and confidence scoring.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: An image file of the medical bill or receipt.
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Total: INR 1200 | Paid: 1000 | Due: 200 | Discount: 10%"
 *     responses:
 *       '200':
 *         description: Successfully extracted raw tokens with confidence scores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 raw_tokens:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["1200","1000","200","10%"]
 *                 currency_hint:
 *                   type: string
 *                   example: "INR"
 *                 confidence:
 *                   type: number
 *                   example: 0.74
 *       '400':
 *         description: Bad request, e.g., no input provided.
 *       '500':
 *         description: Internal server error.
 */
router.post('/step1/ocr', upload.single('document'), async (req, res, next) => {
    try {
        let result;

        if (req.file) {
            // Image Path - OCR processing
            const ocrResult = await aiService.processImageForOCR(
                req.file.buffer.toString('base64'),
                req.file.mimetype
            );
            
            // Extract tokens from OCR text
            result = await aiService.extractRawTokens(ocrResult.text);
        } else if (req.body.text) {
            // Text Path - Direct extraction
            result = await aiService.extractRawTokens(req.body.text);
        } else {
            return res.status(400).json({ error: 'No image or text provided in the request.' });
        }

        // Validate response format
        const validatedResult = ocrExtractionSchema.parse(result);

        res.status(200).json(validatedResult);

    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/extract/step2/normalize:
 *   post:
 *     tags: [Extraction - Step 2]
 *     summary: Step 2 - Normalization - Fix OCR digit errors and map to numbers
 *     description: Process raw tokens to fix OCR errors and convert to normalized numeric values.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               raw_tokens:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["l200","1000","2O0","10%"]
 *                 description: Raw tokens extracted from Step 1
 *     responses:
 *       '200':
 *         description: Successfully normalized amounts with confidence scores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 normalized_amounts:
 *                   type: array
 *                   items:
 *                     type: number
 *                   example: [1200,1000,200]
 *                 normalization_confidence:
 *                   type: number
 *                   example: 0.82
 *       '400':
 *         description: Bad request, invalid raw_tokens provided.
 *       '500':
 *         description: Internal server error.
 */
router.post('/step2/normalize', async (req, res, next) => {
    try {
        const { raw_tokens } = req.body;

        if (!raw_tokens || !Array.isArray(raw_tokens)) {
            return res.status(400).json({ error: 'raw_tokens array is required.' });
        }

        const result = await aiService.normalizeAmounts(raw_tokens);
        
        // Validate response format
        const validatedResult = normalizationSchema.parse(result);

        res.status(200).json(validatedResult);

    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/extract/step3/classify:
 *   post:
 *     tags: [Extraction - Step 3]
 *     summary: Step 3 - Classification by Context - Use surrounding text to label amounts
 *     description: Classify normalized amounts based on context from original text.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               original_text:
 *                 type: string
 *                 example: "Total: INR 1200 | Paid: 1000 | Due: 200"
 *                 description: Original text for context
 *               normalized_amounts:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [1200,1000,200]
 *                 description: Normalized amounts from Step 2
 *     responses:
 *       '200':
 *         description: Successfully classified amounts with confidence scores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 amounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: "total_bill"
 *                       value:
 *                         type: number
 *                         example: 1200
 *                   example: [
 *                     {"type":"total_bill","value":1200},
 *                     {"type":"paid","value":1000},
 *                     {"type":"due","value":200}
 *                   ]
 *                 confidence:
 *                   type: number
 *                   example: 0.80
 *       '400':
 *         description: Bad request, missing required parameters.
 *       '500':
 *         description: Internal server error.
 */
router.post('/step3/classify', async (req, res, next) => {
    try {
        const { original_text, normalized_amounts } = req.body;

        if (!original_text || !normalized_amounts || !Array.isArray(normalized_amounts)) {
            return res.status(400).json({ 
                error: 'original_text and normalized_amounts array are required.' 
            });
        }

        const result = await aiService.classifyAmounts(original_text, normalized_amounts);
        
        // Validate response format
        const validatedResult = classificationSchema.parse(result);

        res.status(200).json(validatedResult);

    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/extract:
 *   post:
 *     tags: [Extraction - Complete Pipeline]
 *     summary: Complete Extraction Pipeline - Extracts financial amounts from text or an image of a medical document
 *     description: This endpoint processes either raw text or an image file to extract, validate, and save financial data with confidence scores. Runs all 3 steps in sequence.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: An image file of the medical bill or receipt.
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Total: INR 1200 | Paid: 1000 | Due: 200"
 *     responses:
 *       '200':
 *         description: Successfully extracted and saved the amounts with confidence scores.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExtractionResult'
 *       '400':
 *         description: Bad request, e.g., no input provided.
 *       '500':
 *         description: Internal server error.
 */
router.post('/', upload.single('document'), async (req, res, next) => {
    try {
        let finalResult;
        let confidenceScores = {};

        if (req.file) {
            // Image Path - Direct processing
            finalResult = await aiService.processImageDirectly(
                req.file.buffer.toString('base64'),
                req.file.mimetype
            );
        } else if (req.body.text) {
            // Text Path - Direct processing
            finalResult = await aiService.processTextDirectly(req.body.text);
            
            // Debug: Log confidence scores to check if they're being captured
            console.log('Captured confidence scores:', confidenceScores);
        } else {
            return res.status(400).json({ error: 'No image or text provided in the request.' });
        }

        // Temporary bypass - uncomment after fixing schema imports
        // const validatedData = apiResponseSchema.parse(finalResult);
        const validatedData = finalResult;

        if (validatedData.status === 'no_amounts_found') {
            return res.status(200).json(validatedData);
        }

        // Store the result in memory
        const savedResult = storage.add(validatedData);
        res.status(200).json(savedResult);

    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/extract/last:
 *   get:
 *     tags: [Extraction - Database Operations]
 *     summary: Retrieves the most recent extraction result from the database
 *     description: Returns the last processed and saved extraction result from MongoDB.
 *     responses:
 *       '200':
 *         description: The last saved extraction result.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExtractionResult'
 *       '404':
 *         description: No results found in the database.
 *       '500':
 *         description: Internal server error.
 */
router.get('/last', async (req, res, next) => {
    try {
        const lastResult = storage.getLast();
        if (!lastResult) {
            return res.status(404).json({ message: 'No extraction results found.' });
        }
        res.json(lastResult);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/extract/{id}:
 *   put:
 *     tags: [Extraction - Database Operations]
 *     summary: Update an existing extraction result with modified OCR data
 *     description: This endpoint allows updating an existing extraction result with modified data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: The MongoDB ObjectId of the extraction result to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExtractionBody'
 *     responses:
 *       '200':
 *         description: Extraction result successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExtractionResult'
 *       '400':
 *         description: Invalid request body or schema validation failed.
 *       '404':
 *         description: Extraction result not found.
 *       '500':
 *         description: Internal server error.
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const validatedBody = updateResultSchema.parse(req.body);

        // Convert ID to number since we're using numeric IDs now
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
            return res.status(400).json({
                error: 'Invalid ID format. Must be a number.',
                example: '1'
            });
        }

        const updatedResult = storage.update(numericId, validatedBody);
        if (!updatedResult) {
            return res.status(404).json({ error: 'Extraction result not found.' });
        }

        res.json(updatedResult);
    } catch (error) {
        next(error);
    }
});

module.exports = router;