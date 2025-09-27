# ⚕️ AI-Powered Medical Document Amount Extractor

[![Node.js CI](https://github.com/actions/workflow_status.svg?branch=main)](https://github.com/<your-repo>/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent, production-grade backend service designed to extract, normalize, classify, and validate financial amounts from medical bills and receipts. This tool leverages the power of GPT-4o to handle noisy data from scanned or typed documents, providing a structured, reliable, and persistent JSON output.

## ✨ Features

- **Dual Input Modes**: Process documents from both raw text (`application/json`) and image files (`multipart/form-data`).
- **Modular Pipeline**: Break down extraction into individual steps (OCR, Normalization, Classification) or use the complete pipeline.
- **Advanced AI Processing**: Uses the `gpt-4o` model for direct, high-accuracy analysis from images and a robust multi-step pipeline for text.
- **Data Validation**: Employs **Zod** schemas to strictly validate all AI-generated and client-submitted data, ensuring type safety and data integrity.
- **Efficient Storage**: Uses an in-memory storage system with automatic file persistence and memory management:
  - Auto-saves to disk every 5 minutes
  - Maintains a maximum of 1000 items in memory
  - Recovers data from disk on restart
- **Full API**: Includes endpoints to create, retrieve, and update extraction results (`POST`, `GET`, `PUT`).
- **Robust Error Handling**: Implements a centralized error-handling middleware, guardrails for noisy documents, and automatic resource cleanup.
- **Interactive API Documentation**: Comes with a self-documenting API powered by **Swagger** for easy testing and integration.

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **AI**: OpenAI API (`gpt-4o`)
- **Storage**: In-memory with file persistence
- **Data Validation**: Zod
- **File Handling**: Multer
- **Development**: Nodemon
- **Logging**: Winston
- **API Documentation**: Swagger (via `swagger-jsdoc` and `swagger-ui-express`)
- **Environment Management**: `dotenv`

## ⚙️ How It Works

The service offers both modular and complete pipeline approaches:

### Modular Pipeline (3 Separate Steps)

1. **Step 1 - OCR/Text Extraction** (`/api/extract/step1/ocr`)
   - Extract raw numeric tokens from text or images
   - Handle OCR errors and currency detection
   - Output: Raw tokens with confidence scores

2. **Step 2 - Normalization** (`/api/extract/step2/normalize`)
   - Fix OCR digit errors (e.g., 'l' → '1', 'O' → '0')
   - Convert tokens to clean numeric values
   - Output: Normalized amounts with confidence scores

3. **Step 3 - Classification** (`/api/extract/step3/classify`)
   - Use context to classify amounts (total, paid, due, etc.)
   - Analyze surrounding text for semantic meaning
   - Output: Classified amounts with confidence scores

### Complete Pipeline (`/api/extract`)

- **For Images**: Single API call to `gpt-4o` for OCR, correction, normalization, classification, and structuring
- **For Text**: Multi-step AI pipeline with validation and storage
- **Storage**: Valid results are stored in memory and persisted to disk

## 📂 Project Structure

```
/
├── src/
│   ├── api/
│   │   └── extract.js                # All API endpoints (modular + complete pipeline)
│   ├── data/
│   │   └── extraction-results.json   # Persistent storage file for extraction results
│   ├── middleware/
│   │   └── errorHandler.js           # Centralized middleware for handling all application errors
│   ├── services/
│   │   └── aiService.js              # Handles all interactions with the OpenAI API
│   └── utils/
│       ├── storage.js                # Manages in-memory storage with file persistence
│       ├── logger.js                 # Winston configuration for structured logging
│       ├── swagger.js                # Configuration for Swagger API documentation
│       └── validationSchemas.js      # Zod schemas for data validation
├── .env                              # Environment variables (API Keys)
├── .gitignore                        # Specifies files to be ignored by Git
├── index.js                          # Main server entry point
├── package.json                      # Project dependencies and scripts
└── README.md                         # You are here!
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- An OpenAI API Key

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root and add your configuration:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the server:**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000` with auto-reload enabled.

## 📖 API Documentation & Usage

This project uses Swagger for interactive API documentation. Once the server is running, access it at:

**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

From the Swagger UI, you can test all endpoints directly from your browser.

## 🔧 API Endpoints

### Modular Pipeline Endpoints

#### Step 1: OCR/Text Extraction
**`POST /api/extract/step1/ocr`**

Extract raw numeric tokens from text or images.

**Text Input:**
```bash
curl -X POST http://localhost:3000/api/extract/step1/ocr \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: INR 1200 | Paid: 1000 | Due: 200"}'
```

**Image Input:**
```bash
curl -X POST http://localhost:3000/api/extract/step1/ocr \
  -F "document=@/path/to/medical-bill.png"
```

**Response:**
```json
{
  "raw_tokens": ["1200", "1000", "200"],
  "currency_hint": "INR",
  "confidence": 0.85
}
```

#### Step 2: Normalization
**`POST /api/extract/step2/normalize`**

Fix OCR errors and convert tokens to numbers.

```bash
curl -X POST http://localhost:3000/api/extract/step2/normalize \
  -H "Content-Type: application/json" \
  -d '{"raw_tokens": ["l200", "1000", "2O0"]}'
```

**Response:**
```json
{
  "normalized_amounts": [1200, 1000, 200],
  "normalization_confidence": 0.92
}
```

#### Step 3: Classification
**`POST /api/extract/step3/classify`**

Classify amounts based on context.

```bash
curl -X POST http://localhost:3000/api/extract/step3/classify \
  -H "Content-Type: application/json" \
  -d '{
    "original_text": "Total: INR 1200 | Paid: 1000 | Due: 200",
    "normalized_amounts": [1200, 1000, 200]
  }'
```

**Response:**
```json
{
  "amounts": [
    {"type": "total_bill", "value": 1200},
    {"type": "paid", "value": 1000},
    {"type": "due", "value": 200}
  ],
  "confidence": 0.88
}
```

### Complete Pipeline Endpoint

#### `POST /api/extract`

Processes a document through the complete pipeline and saves the result.

**Text Input:**
```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: INR 1200 | Paid: 1000 | Due: 200"}'
```

**Image Input:**
```bash
curl -X POST http://localhost:3000/api/extract \
  -F "document=@/path/to/your/medical-bill.png"
```

**Response:**
```json
{
  "_id": 1,
  "currency": "INR",
  "amounts": [
    {
      "type": "total_bill",
      "value": 1200,
      "source": "text: 'Total: INR 1200'"
    },
    {
      "type": "paid", 
      "value": 1000,
      "source": "text: 'Paid: 1000'"
    },
    {
      "type": "due",
      "value": 200, 
      "source": "text: 'Due: 200'"
    }
  ],
  "status": "ok",
  "createdAt": "2025-09-27T10:00:00.000Z"
}
```

### Database Operations

#### `GET /api/extract/last`

Retrieves the most recently processed extraction result.

```bash
curl -X GET http://localhost:3000/api/extract/last
```

#### `PUT /api/extract/{id}`

Updates an existing extraction result.

```bash
curl -X PUT http://localhost:3000/api/extract/1 \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "amounts": [
      {
        "type": "total_bill",
        "value": 150.75,
        "source": "text: '\''Total: $150.75'\''"
      }
    ]
  }'
```

## 🔄 Workflow Examples

### Sequential Processing (Modular Approach)
```bash
# Step 1: Extract raw tokens
curl -X POST http://localhost:3000/api/extract/step1/ocr \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: INR 1300 | Consultation: Rs 1200 | Paid: 1000"}'

# Step 2: Normalize amounts (using output from Step 1)
curl -X POST http://localhost:3000/api/extract/step2/normalize \
  -H "Content-Type: application/json" \
  -d '{"raw_tokens": ["1300","1200","1000"]}'

# Step 3: Classify amounts (using original text + Step 2 output)
curl -X POST http://localhost:3000/api/extract/step3/classify \
  -H "Content-Type: application/json" \
  -d '{
    "original_text": "Total: INR 1300 | Consultation: Rs 1200 | Paid: 1000",
    "normalized_amounts": [1300,1200,1000]
  }'
```

### Complete Pipeline (All-in-One)
```bash
# Process everything in one call and save to database
curl -X POST http://localhost:3000/api/extract \
  -F "document=@medical_bill.png"
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.