import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Validate API key exists
if (!process.env.OPENAQ_API_KEY) {
    console.error("ERROR: OPENAQ_API_KEY is not defined in environment variables");
    console.error("Make sure you have a .env file with OPENAQ_API_KEY defined");
}

// Example API endpoint that uses the OpenAQ API
app.get('/api/air-quality', async (req, res) => {
    try {
        // Check if API key exists
        if (!process.env.OPENAQ_API_KEY) {
            return res.status(500).json({ error: "API key not configured" });
        }

        const response = await fetch('https://api.openaq.org/v3/locations/8118', {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.OPENAQ_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching from OpenAQ API:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Key configured: ${process.env.OPENAQ_API_KEY ? 'Yes' : 'No'}`);
});