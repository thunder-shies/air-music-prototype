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

// Validate API key exists
if (!process.env.OPENAQ_API_KEY) {
    console.error("ERROR: OPENAQ_API_KEY is not defined in environment variables");
    console.error("Make sure you have a .env file with OPENAQ_API_KEY defined");
}

// API Endpoint: Fetch Data for Hong Kong or Bangkok
app.get("/api/get-latest", async (req, res) => {
    try {
        if (!process.env.OPENAQ_API_KEY) {
            return res.status(500).json({ error: "API key not configured" });
        }

        // Get city parameter from query (default to HK if not specified)
        const city = req.query.city || "HongKong";
        const locationIds = {
            HongKong: "7732",
            Bangkok: "225643",
        };

        if (!locationIds[city]) {
            return res.status(400).json({ error: "Invalid city parameter. Use 'HongKong' or 'Bangkok'." });
        }

        const locationId = locationIds[city];

        // Step 1: Fetch Sensor Names
        const locationUrl = `https://api.openaq.org/v3/locations/${locationId}`;
        const locationResponse = await fetch(locationUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.OPENAQ_API_KEY,
            },
        });

        if (!locationResponse.ok) {
            throw new Error(`API responded with status: ${locationResponse.status}`);
        }

        const locationData = await locationResponse.json();

        if (!locationData.results || locationData.results.length === 0 || !locationData.results[0].sensors) {
            throw new Error("No sensor data found in API response.");
        }

        // Create a mapping of sensorId → displayName
        const sensorMapping = {};
        locationData.results[0].sensors.forEach((sensor) => {
            sensorMapping[sensor.id] = sensor.parameter.displayName;
        });

        console.log("Sensor Mapping:", sensorMapping);

        // Step 2: Fetch Latest Data
        const latestUrl = `https://api.openaq.org/v3/locations/${locationId}/latest`;
        const latestResponse = await fetch(latestUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.OPENAQ_API_KEY,
            },
        });

        if (!latestResponse.ok) {
            throw new Error(`API responded with status: ${latestResponse.status}`);
        }

        const latestData = await latestResponse.json();

        if (!latestData.results || latestData.results.length === 0) {
            throw new Error("No air quality data found in API response.");
        }

        // Step 3: Merge displayName with latest values
        const formattedData = latestData.results.map(entry => ({
            datetime: entry.datetime.local,
            sensorId: entry.sensorsId,
            displayName: sensorMapping[entry.sensorsId] || "Unknown", // Match with mapping
            value: entry.value
        }));

        // console.log(`Latest air quality data for ${city}:`, JSON.stringify(formattedData, null, 2));
        res.json(formattedData);

    } catch (error) {
        console.error("Error fetching latest air quality data:", error);
        res.status(500).json({ error: error.message });
    }
});






// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Key configured: ${process.env.OPENAQ_API_KEY ? "Yes" : "No"}`);
});
