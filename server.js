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
const VEHICLE_REGISTRY_DATA_PATH = path.join(__dirname, "src/data/vehicle_registry.json");

// 1. PARTIAL UPDATE for customer_master.json
app.post("/update-customer", (req, res) => {
  try {
    // Expecting { customerId, updatedData: {...fields...} }
    const { customerId, updatedData } = req.body;

    fs.readFile(CUSTOMER_DATA_PATH, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading customer_master.json:", err);
        return res.status(500).json({ message: "Failed to read data." });
      }

      let customers = JSON.parse(data);
      const index = customers.findIndex((c) => c.customerId === customerId);

      if (index === -1) {
        return res.status(404).json({ message: "Customer not found." });
      }

      // Merge updated fields
      customers[index] = { ...customers[index], ...updatedData };

      fs.writeFile(CUSTOMER_DATA_PATH, JSON.stringify(customers, null, 2), "utf8", (writeErr) => {
        if (writeErr) {
          console.error("Error writing to customer_master.json:", writeErr);
          return res.status(500).json({ message: "Failed to update customer data." });
        }
        res.status(200).json({ message: "Customer updated successfully." });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// 2. Update lots_master.json
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
        res.status(200).json({ message: "Lot updated successfully." });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// 3. Update or add lot pricing
app.post("/update-lot-pricing", (req, res) => {
  try {
    const newPricing = req.body;

    fs.readFile(PRICING_DATA_PATH, "utf8", (err, data) => {
      let lotPricingData = [];
      if (!err) {
        try {
          lotPricingData = JSON.parse(data);
        } catch (parseError) {
          console.error("Error parsing lot_pricing.json:", parseError);
        }
      }

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
        res.status(200).json({ message: "Lot pricing updated successfully." });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// 4. Get all customers
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

// 5. Get all lots
app.get("/get-lots", (req, res) => {
  try {
    fs.readFile(LOTS_DATA_PATH, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading lots_master.json:", err);
        return res.status(500).json({ message: "Failed to read data." });
      }
      res.json(JSON.parse(data));
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// 6. Vehicle registry endpoints (optional)
app.get("/get-vehicle-registry", (req, res) => {
  try {
    fs.readFile(VEHICLE_REGISTRY_DATA_PATH, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading vehicle_registry.json:", err);
        return res.status(500).json({ message: "Failed to read data." });
      }
      res.json(JSON.parse(data));
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/update-vehicle-registry", (req, res) => {
  try {
    const newRegistry = req.body;
    fs.writeFile(VEHICLE_REGISTRY_DATA_PATH, JSON.stringify(newRegistry, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing to vehicle_registry.json:", err);
        return res.status(500).json({ message: "Failed to update data." });
      }
      res.status(200).json({ message: "Vehicle registry updated successfully." });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// 7. Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
