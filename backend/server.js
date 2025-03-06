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

        const { openAQLocationId, iqAir } = cityConfig[city];

        // Step 1: Fetch Sensor Names from OpenAQ
        const locationUrl = `https://api.openaq.org/v3/locations/${openAQLocationId}`;
        const locationResponse = await fetch(locationUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.OPENAQ_API_KEY,
            },
        });

        if (!locationResponse.ok) {
            throw new Error(`OpenAQ API responded with status: ${locationResponse.status}`);
        }

        const locationData = await locationResponse.json();

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
        const latestResponse = await fetch(latestUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.OPENAQ_API_KEY,
            },
        });

        if (!latestResponse.ok) {
            throw new Error(`OpenAQ API responded with status: ${latestResponse.status}`);
        }

        const latestData = await latestResponse.json();

        if (!latestData.results || latestData.results.length === 0) {
            throw new Error("No air quality data found in OpenAQ API response.");
        }

        // Step 3: Fetch IQAir Data
        const iqAirUrl = `http://api.airvisual.com/v2/city?city=${iqAir.city}&state=${iqAir.state}&country=${iqAir.country}&key=${process.env.IQAIR_API_KEY}`;
        const iqAirResponse = await fetch(iqAirUrl);

        if (!iqAirResponse.ok) {
            throw new Error(`IQAir API responded with status: ${iqAirResponse.status}`);
        }

        const iqAirData = await iqAirResponse.json();

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

        res.json(formattedData);

    } catch (error) {
        console.error("Error fetching air quality data:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`OpenAQ API Key configured: ${process.env.OPENAQ_API_KEY ? "Yes" : "No"}`);
    console.log(`IQAir API Key configured: ${process.env.IQAIR_API_KEY ? "Yes" : "No"}`);
});