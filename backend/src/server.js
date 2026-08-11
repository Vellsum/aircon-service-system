const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "AirCon Care backend is running!"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`AirCon Care backend running on http://localhost:${PORT}`);
});