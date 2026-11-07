
import { Router } from "express";
import { supabase } from "./superbase";

const router = Router();

// GET: Fetch all assessments
router.get("/assessments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      assessments: data,
    });
  } catch (error) {
    console.error("Fetch assessments error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessments",
    });
  }
});

// POST: Create a new assessment
router.post("/assessments", async (req, res) => {
  try {
    const { title, subject, semester, max_marks, assessment_date } =
      req.body;

    const maximum = Number(max_marks);
    const semesterNumber = Number(semester);

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof subject !== "string" ||
      !subject.trim() ||
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1 ||
      semesterNumber > 8 ||
      !Number.isFinite(maximum) ||
      maximum <= 0 ||
      typeof assessment_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(assessment_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid assessment details",
      });
    }

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        title: title.trim(),
        subject: subject.trim(),
        semester: semesterNumber,
        max_marks: maximum,
        assessment_date,
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
      message: "Assessment created successfully",
      assessment: data,
    });
  } catch (error) {
    console.error("Create assessment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create assessment",
    });
  }
});

// GET: Fetch marks for an assessment
router.get("/assessments/:assessmentId/marks", async (req, res) => {
  try {
    const assessmentId = Number(req.params.assessmentId);

    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID",
      });
    }

    const { data, error } = await supabase
      .from("internal_marks")
      .select(`
        *,
        students (
          id,
          roll_number,
          full_name,
          programme
        )
      `)
      .eq("assessment_id", assessmentId)
      .order("student_id", { ascending: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      marks: data,
    });
  } catch (error) {
    console.error("Fetch marks error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch marks",
    });
  }
});

// POST: Add or update marks for a student
router.post("/assessments/:assessmentId/marks", async (req, res) => {
  try {
    const assessmentId = Number(req.params.assessmentId);
    const studentId = Number(req.body.student_id);
    const marksObtained = Number(req.body.marks_obtained);

    if (
      !Number.isInteger(assessmentId) ||
      assessmentId <= 0 ||
      !Number.isInteger(studentId) ||
      studentId <= 0 ||
      !Number.isFinite(marksObtained) ||
      marksObtained < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid student or marks details",
      });
    }

    // Check that the assessment exists and is not locked
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, max_marks, is_locked")
      .eq("id", assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    if (assessment.is_locked) {
      return res.status(403).json({
        success: false,
        message: "This assessment is locked. Marks cannot be changed.",
      });
    }

    if (marksObtained > Number(assessment.max_marks)) {
      return res.status(400).json({
        success: false,
        message: `Marks cannot exceed ${assessment.max_marks}`,
      });
    }

    // Read the previous marks for audit history
    const { data: previousMark, error: previousError } = await supabase
      .from("internal_marks")
      .select("marks_obtained")
      .eq("assessment_id", assessmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (previousError) {
      return res.status(400).json({
        success: false,
        message: previousError.message,
      });
    }

    // Save the new marks
    const { data, error } = await supabase
      .from("internal_marks")
      .upsert(
        {
          assessment_id: assessmentId,
          student_id: studentId,
          marks_obtained: marksObtained,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "assessment_id,student_id",
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

    // Record the change in the audit table
    const { error: auditError } = await supabase
      .from("marks_audit")
      .insert({
        assessment_id: assessmentId,
        student_id: studentId,
        old_marks: previousMark
          ? previousMark.marks_obtained
          : null,
        new_marks: marksObtained,
      });

    if (auditError) {
      console.error("Marks audit error:", auditError.message);
      return res.status(500).json({
        success: false,
        message: "Marks were saved, but audit history could not be recorded.",
        mark: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Marks saved successfully",
      mark: data,
    });
  } catch (error) {
    console.error("Save marks error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save marks",
    });
  }
});

// POST: Lock an assessment after moderation
router.post("/assessments/:assessmentId/lock", async (req, res) => {
  try {
    const assessmentId = Number(req.params.assessmentId);

    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID",
      });
    }

    const { data, error } = await supabase
      .from("assessments")
      .update({ is_locked: true })
      .eq("id", assessmentId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assessment locked successfully",
      assessment: data,
    });
  } catch (error) {
    console.error("Lock assessment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to lock assessment",
    });
  }
});

export default router;
