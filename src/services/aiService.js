const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractRawTokens(text) {
    const prompt = `You are an expert at extracting financial information from noisy, OCR-processed text from medical documents.
Your task is to extract all potential numeric tokens and any currency hints from the following text.
Be robust to common OCR errors (e.g., 'l' for '1', 'O' for '0').

Text: "${text}"

Respond in a structured JSON format. The JSON object should have the following keys:
- "raw_tokens": A list of strings, where each string is a numeric token found in the text (e.g., "1200", "10.50", "5%").
- "currency_hint": A string representing the currency symbol or code found (e.g., "INR", "Rs", "$"). If no currency is found, use "unknown".
- "confidence": A float from 0.0 to 1.0 indicating your confidence in the extraction.

If no numeric tokens can be reliably extracted, respond with: {"status":"no_amounts_found","reason":"document too noisy or no numeric values present"}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Ensure confidence is always present
        if (result.status === 'no_amounts_found') {
            return result;
        }
        
        // Add fallback confidence if not provided
        if (!result.confidence) {
            result.confidence = result.raw_tokens && result.raw_tokens.length > 0 ? 0.75 : 0.3;
        }
        
        console.log('Step 1 - Extract Raw Tokens Result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error in extractRawTokens:', error);
        return { 
            status: 'no_amounts_found', 
            reason: 'processing_error',
            confidence: 0.0 
        };
    }
}

async function normalizeAmounts(rawTokens) {
    const prompt = `You are a data normalization expert. Your task is to correct OCR errors in a list of raw numeric tokens and convert them into clean, usable numbers.
The tokens are from a medical bill and may contain errors like letters instead of digits. Ignore non-numeric tokens like percentages for now.

Raw Tokens: ${JSON.stringify(rawTokens)}

Respond in a structured JSON format with the following keys:
- "normalized_amounts": A list of numbers.
- "normalization_confidence": A float from 0.0 to 1.0 indicating your confidence in the normalization quality.

IMPORTANT: Always include the "normalization_confidence" field in your response.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Add fallback confidence if not provided
        if (!result.normalization_confidence) {
            result.normalization_confidence = result.normalized_amounts && result.normalized_amounts.length > 0 ? 0.8 : 0.3;
        }
        
        console.log('Step 2 - Normalize Amounts Result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error in normalizeAmounts:', error);
        return { 
            normalized_amounts: [], 
            normalization_confidence: 0.0 
        };
    }
}

async function classifyAmounts(fullText, normalizedAmounts) {
    const prompt = `You are an AI assistant specializing in financial document analysis.
Based on the full context of the provided text and a list of normalized amounts, your task is to classify each amount.
Common classifications include 'total_bill', 'paid', 'due', 'discount', 'tax', 'service_charge', 'consultation', 'charge', 'sub_total', etc.

Full Text: "${fullText}"
Normalized Amounts: ${JSON.stringify(normalizedAmounts)}

Respond in a structured JSON format with the following keys:
- "amounts": A list of objects, where each object has "type" (string) and "value" (number).
- "confidence": A float from 0.0 to 1.0 indicating your confidence in the classification accuracy.

IMPORTANT: Always include the "confidence" field in your response.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Add fallback confidence if not provided
        if (!result.confidence) {
            result.confidence = result.amounts && result.amounts.length > 0 ? 0.85 : 0.3;
        }
        
        console.log('Step 3 - Classify Amounts Result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error in classifyAmounts:', error);
        return { 
            amounts: [], 
            confidence: 0.0 
        };
    }
}

async function processImageForOCR(imageBase64, mimeType) {
    const prompt = `You are an expert OCR system specializing in reading text from images of medical documents and bills.
Your task is to extract ALL text content from the provided image, correcting for any blur, skew, rotation, or common OCR-like errors.
Be robust to various image qualities and document layouts.

Focus on:
- Extracting all visible text accurately
- Correcting common OCR errors (e.g., 'l' for '1', 'O' for '0', 'S' for '5')
- Preserving the structure and context of the text
- Including all numeric values and currency symbols

Respond with a JSON object containing:
- "text": The complete extracted and corrected text from the image
- "confidence": A float from 0.0 to 1.0 indicating your confidence in the OCR accuracy

If the image is too blurry, damaged, or illegible to extract reliable text, respond with:
{"text": "", "confidence": 0.0, "error": "image_illegible"}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Add fallback confidence if not provided
        if (!result.confidence) {
            result.confidence = result.text && result.text.length > 0 ? 0.8 : 0.2;
        }
        
        console.log('OCR Processing Result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error in processImageForOCR:', error);
        return { 
            text: '', 
            confidence: 0.0,
            error: 'processing_error'
        };
    }
}

function generateFinalOutput(currency, classifiedAmounts, rawText) {
    const amountsWithSource = classifiedAmounts.map(amount => {
        // Improved regex to find the source text around the value, ignoring non-digit characters
        const valueStr = String(amount.value).split('').join('[^\\d\\n]*');
        const regex = new RegExp(`([\\w\\s,.:-]+${valueStr}[\\w\\s,.:-]*)`, 'i');
        const match = rawText.match(regex);
        
        let source = 'source not found';
        if (match) {
            // Clean up the matched source text
            source = `text: '${match[0].replace(/\s+/g, ' ').trim()}'`;
        }

        return { ...amount, source };
    });

    return {
        currency: currency || 'not_found',
        amounts: amountsWithSource,
        status: 'ok'
    };
}

async function processImageDirectly(imageBase64, mimeType) {
    const prompt = `You are an expert AI specializing in extracting structured financial data from images of medical documents.
Analyze the provided image of a bill or receipt and perform the following tasks in one step:
1.  Read all text from the image, correcting for any blur, skew, or OCR-like errors.
2.  Identify all financial amounts.
3.  Classify each amount by its context (e.g., 'total_bill', 'paid', 'due', 'tax').
4.  Determine the currency (e.g., 'INR', 'USD').
5.  For each amount, find the snippet of text in the image that it came from.
6.  Provide an overall confidence score for the extraction process.

Respond with a single, structured JSON object with the following format:
{
  "currency": "...",
  "amounts": [
    {"type": "...", "value": ..., "source": "text: '...'"},
    ...
  ],
  "confidence": 0.85,
  "status": "ok"
}

If the image does not contain any discernible financial information, respond with:
{"status":"no_amounts_found","reason":"document is illegible or contains no financial data", "confidence": 0.0}

IMPORTANT: Always include a "confidence" field in your response.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Add fallback confidence if not provided
        if (!result.confidence) {
            result.confidence = result.amounts && result.amounts.length > 0 ? 0.8 : 0.3;
        }
        
        console.log('Image Processing Result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error in processImageDirectly:', error);
        return { 
            status: 'no_amounts_found', 
            reason: 'processing_error',
            confidence: 0.0 
        };
    }
}

module.exports = {
    extractRawTokens,
    normalizeAmounts,
    classifyAmounts,
    generateFinalOutput,
    processImageDirectly,
    processImageForOCR,  // Added the new method for Step 1 OCR
};