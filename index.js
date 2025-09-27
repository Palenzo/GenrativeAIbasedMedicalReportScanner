require('dotenv').config();
const express = require('express');
const multer = require('multer');
const extractRouter = require('./src/api/extract');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/utils/swagger');

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error('FATAL ERROR: OPENAI_API_KEY is not set in the .env file.');
    console.error('Please set your OpenAI API key in the .env file and restart the server.');
    process.exit(1); // Exit the application with an error code
}

const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the extract endpoint
app.use('/api/extract', extractRouter);

// Simple route for testing
app.get('/', (req, res) => {
  res.send('AI-Powered Amount Detection API is running!');
});

const startServer = async () => {
  try {
    // First, connect to the database

    // Then, start the Express server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API documentation available at http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start the server.', error);
    process.exit(1);
  }
};

// Start the server
startServer();
