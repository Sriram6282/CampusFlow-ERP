
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import internalMarksRoutes from "./internalMarksRoutes";
import studentRoutes from "./studentRoutes";
import attendanceRoutes from "./attendenceRoutes";
import feeRoutes from "./feeRoutes";
import adminRoutes from "./adminRoutes";
import { supabase } from "./superbase";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to CampusFlow ERP Backend!");
});

// Backend health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CampusFlow ERP backend is running!"
  });
});

// Supabase database connection check
app.get("/api/database-health", async (req, res) => {
  try {
    const { error } = await supabase
      .from("students")
      .select("id")
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      message: "Supabase connected successfully!"
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

// CONNECT STUDENT ROUTES
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/internals", internalMarksRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/admin", adminRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`CampusFlow backend running at http://localhost:${PORT}`);
});
