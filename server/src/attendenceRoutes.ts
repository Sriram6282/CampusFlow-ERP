
import { Router } from "express";
import { supabase } from "./superbase";

const router = Router();


router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .order("attendance_date", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      attendance: data,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch attendance",
    });
  }
});

// POST: Mark attendance for a student
router.post("/", async (req, res) => {
  try {
    const {
      student_id,
      attendance_date,
      subject,
      semester,
      status,
    } = req.body;

    if (
      !student_id ||
      !attendance_date ||
      !subject ||
      !semester ||
      !["Present", "Absent"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing attendance details",
      });
    }

    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        {
          student_id,
          attendance_date,
          subject,
          semester,
          status,
        },
        {
          onConflict: "student_id,attendance_date,subject",
        }
      )
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Attendance saved successfully",
      record: data,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save attendance",
    });
  }
});

export default router;
