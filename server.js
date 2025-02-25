const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const DATA_PATH = path.join(__dirname, "src/data/customer_master.json");

// Endpoint to update customer_master.json
app.post("/update-customer", (req, res) => {
  try {
    const updatedCustomers = req.body;

    fs.writeFile(DATA_PATH, JSON.stringify(updatedCustomers, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing to customer_master.json:", err);
        return res.status(500).json({ message: "Failed to update data." });
      }
      res.json({ message: "Customer data updated successfully." });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const LOTS_DATA_PATH = path.join(__dirname, "src/data/lots_master.json");

// Endpoint to update lots_master.json
app.post("/update-lot", (req, res) => {
  try {
    const { lotId, updatedData } = req.body;

    // Read the existing file
    fs.readFile(LOTS_DATA_PATH, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading lots_master.json:", err);
        return res.status(500).json({ message: "Failed to read data." });
      }

      let lots = JSON.parse(data);

      // Find and update the lot
      const lotIndex = lots.findIndex((lot) => lot.lotId === lotId);
      if (lotIndex === -1) {
        return res.status(404).json({ message: "Lot not found." });
      }

      // Merge updated data into the existing lot
      lots[lotIndex] = { ...lots[lotIndex], ...updatedData };

      // Write the updated data back to the file
      fs.writeFile(LOTS_DATA_PATH, JSON.stringify(lots, null, 2), "utf8", (writeErr) => {
        if (writeErr) {
          console.error("Error writing to lots_master.json:", writeErr);
          return res.status(500).json({ message: "Failed to update lot data." });
        }
        res.json({ message: "Lot updated successfully." });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error." });
  }
});
