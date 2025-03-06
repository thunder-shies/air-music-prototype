import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get the equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, ".env") });

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Validate API keys exist
if (!process.env.OPENAQ_API_KEY) {
    console.error("ERROR: OPENAQ_API_KEY is not defined in environment variables");
    console.error("Make sure you have a .env file with OPENAQ_API_KEY defined");
}

if (!process.env.IQAIR_API_KEY) {
    console.error("ERROR: IQAIR_API_KEY is not defined in environment variables");
    console.error("Make sure you have a .env file with IQAIR_API_KEY defined");
}

// Simple in-memory cache
const cache = {
    data: {},
    timestamps: {}
};

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000; // 10 minutes in milliseconds

// Rate limiting configuration
const rateLimits = {
    openAQ: {
        lastRequest: 0,
        minInterval: 2000 // 2 seconds between requests
    },
    iqAir: {
        lastRequest: 0,
        minInterval: 5000 // 5 seconds between requests
    }
};

// Helper function to check and enforce rate limits
const checkRateLimit = async (service) => {
    const now = Date.now();
    const timeSinceLastRequest = now - rateLimits[service].lastRequest;

    if (timeSinceLastRequest < rateLimits[service].minInterval) {
        // Need to wait before making another request
        const waitTime = rateLimits[service].minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update last request time
    rateLimits[service].lastRequest = Date.now();
};

// Helper function to fetch with retry
const fetchWithRetry = async (url, options, service, maxRetries = 3, initialDelay = 1000) => {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Check rate limit before making request
            await checkRateLimit(service);

            const response = await fetch(url, options);

            // If we get a 429 (Too Many Requests), wait and retry
            if (response.status === 429) {
                console.log(`Rate limit hit for ${service}, waiting before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt + 1} failed for ${service}: ${error.message}`);

            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }

    throw lastError || new Error(`Failed after ${maxRetries} attempts`);
};

// API Endpoint: Fetch Data for Hong Kong or Bangkok
app.get("/api/get-latest", async (req, res) => {
    try {
        if (!process.env.OPENAQ_API_KEY) {
            return res.status(500).json({ error: "OpenAQ API key not configured" });
        }

        if (!process.env.IQAIR_API_KEY) {
            return res.status(500).json({ error: "IQAir API key not configured" });
        }

        // Get city parameter from query (default to HK if not specified)
        const city = req.query.city || "HongKong";

        // Configuration for different cities
        const cityConfig = {
            HongKong: {
                openAQLocationId: "7732",
                iqAir: {
                    city: "Hong Kong",
                    state: "Hong Kong",
                    country: "Hong Kong"
                }
            },
            Bangkok: {
                openAQLocationId: "225643",
                iqAir: {
                    city: "Bangkok",
                    state: "Bangkok",
                    country: "Thailand"
                }
            }
        };

        if (!cityConfig[city]) {
            return res.status(400).json({ error: "Invalid city parameter. Use 'HongKong' or 'Bangkok'." });
        }

        // Check if we have valid cached data
        const cacheKey = `airdata_${city}`;
        const now = Date.now();

        if (cache.data[cacheKey] && (now - cache.timestamps[cacheKey] < CACHE_DURATION)) {
            // console.log(`Serving cached data for ${city}`);
            return res.json(cache.data[cacheKey]);
        }

        const { openAQLocationId, iqAir } = cityConfig[city];

        // Step 1: Fetch Sensor Names from OpenAQ
        const locationUrl = `https://api.openaq.org/v3/locations/${openAQLocationId}`;
        const locationData = await fetchWithRetry(
            locationUrl,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.OPENAQ_API_KEY,
                },
            },
            'openAQ'
        );

        if (!locationData.results || locationData.results.length === 0 || !locationData.results[0].sensors) {
            throw new Error("No sensor data found in OpenAQ API response.");
        }

        // Create a mapping of sensorId → name
        const sensorMapping = {};
        locationData.results[0].sensors.forEach((sensor) => {
            sensorMapping[sensor.id] = sensor.parameter.name;
        });

        // Step 2: Fetch Latest Data from OpenAQ
        const latestUrl = `https://api.openaq.org/v3/locations/${openAQLocationId}/latest`;
        const latestData = await fetchWithRetry(
            latestUrl,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.OPENAQ_API_KEY,
                },
            },
            'openAQ'
        );

        if (!latestData.results || latestData.results.length === 0) {
            throw new Error("No air quality data found in OpenAQ API response.");
        }

        // Step 3: Fetch IQAir Data
        const iqAirUrl = `http://api.airvisual.com/v2/city?city=${iqAir.city}&state=${iqAir.state}&country=${iqAir.country}&key=${process.env.IQAIR_API_KEY}`;
        const iqAirData = await fetchWithRetry(iqAirUrl, {}, 'iqAir');

        if (iqAirData.status !== 'success' || !iqAirData.data) {
            throw new Error("No air quality data found in IQAir API response.");
        }

        // Step 4: Merge data from OpenAQ with names
        const formattedData = latestData.results.map(entry => ({
            name: sensorMapping[entry.sensorsId] || "Unknown", // Match with mapping
            value: entry.value
        }));

        // Step 5: Add AQIUS from IQAir
        if (iqAirData.data.current && iqAirData.data.current.pollution && iqAirData.data.current.pollution.aqius !== undefined) {
            formattedData.push({
                name: "aqius",
                value: iqAirData.data.current.pollution.aqius
            });
        }

        // Step 6: Sort the data alphabetically by name
        formattedData.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        // Store in cache
        cache.data[cacheKey] = formattedData;
        cache.timestamps[cacheKey] = now;

        console.log(`Cached new data for ${city}`);
        res.json(formattedData);

    } catch (error) {
        console.error("Error fetching air quality data:", error);

        // If we have cached data, return it even if it's expired
        const cacheKey = `airdata_${req.query.city || "HongKong"}`;
        if (cache.data[cacheKey]) {
            console.log(`Serving stale cached data due to error`);
            return res.json(cache.data[cacheKey]);
        }

        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`OpenAQ API Key configured: ${process.env.OPENAQ_API_KEY ? "Yes" : "No"}`);
    console.log(`IQAir API Key configured: ${process.env.IQAIR_API_KEY ? "Yes" : "No"}`);
});