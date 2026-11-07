
import { Router } from "express";
import { supabase } from "./superbase";

const router = Router();

// GET: Fetch all students
router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      students: data,
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch students",
    });
  }
});

// GET: Fetch one student by database ID
router.get("/:id", async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student: data,
    });
  } catch (error) {
    console.error("Get student error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch student",
    });
  }
});

// POST: Add a new student
router.post("/", async (req, res) => {
  try {
    const {
      roll_number,
      full_name,
      email,
      department = "CSE",
      programme = "B.Tech CSE",
      attendance = 0,
      internal_marks = 0,
    } = req.body;

    if (!roll_number || !full_name || !email) {
      return res.status(400).json({
        success: false,
        message: "Roll number, full name and email are required",
      });
    }

    const attendanceValue = Number(attendance);
    const marksValue = Number(internal_marks);

    if (
      !Number.isFinite(attendanceValue) ||
      attendanceValue < 0 ||
      attendanceValue > 100 ||
      !Number.isFinite(marksValue) ||
      marksValue < 0 ||
      marksValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Attendance and marks must be between 0 and 100",
      });
    }

    const { data, error } = await supabase
      .from("students")
      .insert({
        roll_number,
        full_name,
        email,
        department,
        programme,
        attendance: attendanceValue,
        internal_marks: marksValue,
      })
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
      message: "Student added successfully",
      student: data,
    });
  } catch (error) {
    console.error("Add student error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add student",
    });
  }
});

// PUT: Update an existing student
router.put("/:id", async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid student database ID",
      });
    }

    const {
      roll_number,
      full_name,
      email,
      programme,
      attendance,
      internal_marks,
    } = req.body;

    if (!roll_number || !full_name || !email || !programme) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required student details",
      });
    }

    const attendanceValue = Number(attendance);
    const marksValue = Number(internal_marks);

    if (
      !Number.isFinite(attendanceValue) ||
      attendanceValue < 0 ||
      attendanceValue > 100 ||
      !Number.isFinite(marksValue) ||
      marksValue < 0 ||
      marksValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Attendance and marks must be between 0 and 100",
      });
    }

    const { data, error } = await supabase
      .from("students")
      .update({
        roll_number,
        full_name,
        email,
        programme,
        attendance: attendanceValue,
        internal_marks: marksValue,
      })
      .eq("id", studentId)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student not found or update was not permitted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: data,
    });
  } catch (error) {
    console.error("Update student error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update student",
    });
  }
});

// DELETE: Delete a student
router.delete("/:id", async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid student database ID",
      });
    }

    const { data, error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student not found or deletion was not permitted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully",
      student: data,
    });
  } catch (error) {
    console.error("Delete student error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete student",
    });
  }
});

export default router;
