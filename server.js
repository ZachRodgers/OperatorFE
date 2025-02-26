const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const CUSTOMER_DATA_PATH = path.join(__dirname, "src/data/customer_master.json");
const LOTS_DATA_PATH = path.join(__dirname, "src/data/lots_master.json");
const PRICING_DATA_PATH = path.join(__dirname, "src/data/lot_pricing.json");

// ✅ Endpoint to update customer_master.json
app.post("/update-customer", (req, res) => {
  try {
    const updatedCustomers = req.body;
    fs.writeFile(CUSTOMER_DATA_PATH, JSON.stringify(updatedCustomers, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing to customer_master.json:", err);
        return res.status(500).json({ message: "Failed to update data." });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Endpoint to update lots_master.json
app.post("/update-lot", (req, res) => {
  try {
    const { lotId, updatedData } = req.body;

    fs.readFile(LOTS_DATA_PATH, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading lots_master.json:", err);
        return res.status(500).json({ message: "Failed to read data." });
      }

      let lots = JSON.parse(data);
      const lotIndex = lots.findIndex((lot) => lot.lotId === lotId);

      if (lotIndex === -1) {
        return res.status(404).json({ message: "Lot not found." });
      }

      lots[lotIndex] = { ...lots[lotIndex], ...updatedData };

      fs.writeFile(LOTS_DATA_PATH, JSON.stringify(lots, null, 2), "utf8", (writeErr) => {
        if (writeErr) {
          console.error("Error writing to lots_master.json:", writeErr);
          return res.status(500).json({ message: "Failed to update lot data." });
        }
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Endpoint to update or add lot pricing
app.post("/update-lot-pricing", (req, res) => {
  try {
    const newPricing = req.body;

    // Read current pricing data
    fs.readFile(PRICING_DATA_PATH, "utf8", (err, data) => {
      let lotPricingData = [];
      if (!err) {
        try {
          lotPricingData = JSON.parse(data);
        } catch (parseError) {
          console.error("Error parsing lot_pricing.json:", parseError);
        }
      }

      // Find existing lot entry
      const lotIndex = lotPricingData.findIndex((entry) => entry.lotId === newPricing.lotId);

      if (lotIndex > -1) {
        lotPricingData[lotIndex] = { ...lotPricingData[lotIndex], ...newPricing };
      } else {
        lotPricingData.push(newPricing);
      }

      fs.writeFile(PRICING_DATA_PATH, JSON.stringify(lotPricingData, null, 2), "utf8", (writeErr) => {
        if (writeErr) {
          console.error("Error writing to lot_pricing.json:", writeErr);
          return res.status(500).json({ message: "Failed to update data." });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Ensure the server only listens once
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// ✅ Endpoint to fetch customer data (Lot Settings)
app.get("/get-customer", (req, res) => {
  try {
    fs.readFile(CUSTOMER_DATA_PATH, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading customer_master.json:", err);
        return res.status(500).json({ message: "Failed to read data." });
      }
      res.json(JSON.parse(data));
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});
