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
