
import { Router, Request, Response } from "express";
import { supabase } from "./superbase";
import { requireAuth, requireAdmin } from "./authMiddleware";

const router = Router();
// router.use(requireAuth);
router.use(requireAuth, requireAdmin);

// ==========================================
// AUDIT LOG HELPER
// ==========================================


async function addAuditLog(
    db: typeof supabase,
    action: string,
    entityType: string,
    entityId?: string,
    details: Record<string, unknown> = {}
  ) {
    const { error } = await db
      .from("admin_audit_logs")
      .insert({
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details,
      });
  
    if (error) {
      console.error("Audit log error:", error.message);
    }
  }

// ==========================================
// USER PROFILES
// ==========================================

// GET all user profiles
// ==========================================
// USER PROFILES
// ==========================================

// GET all user profiles
router.get("/users", async (_req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const { data, error } = await db
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      res.json({ success: true, users: data });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // CREATE user profile for an existing Auth user
  router.post("/users", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const {
        id,
        full_name,
        email,
        role,
        department,
      } = req.body;
  
      if (!id || !full_name || !email || !role) {
        return res.status(400).json({
          success: false,
          message: "User ID, name, email and role are required",
        });
      }
  
      if (!["Admin", "Faculty"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role",
        });
      }
  
      const { data, error } = await db
        .from("user_profiles")
        .insert({
          id,
          full_name,
          email,
          role,
          department: department || null,
        })
        .select()
        .single();
  
      if (error) throw error;
  
      await addAuditLog(db, "CREATE", "USER", id, {
        full_name,
        email,
        role,
      });
  
      res.status(201).json({
        success: true,
        user: data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // UPDATE user profile
  router.put("/users/:id", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
      const id = String(req.params.id);
  
      const {
        full_name,
        role,
        department,
        is_active,
      } = req.body;
  
      if (role && !["Admin", "Faculty"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role",
        });
      }
  
      const { data, error } = await db
        .from("user_profiles")
        .update({
          ...(full_name !== undefined && { full_name }),
          ...(role !== undefined && { role }),
          ...(department !== undefined && { department }),
          ...(is_active !== undefined && { is_active }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
  
      if (error) throw error;
  
      await addAuditLog(db, "UPDATE", "USER", id, req.body);
  
      res.json({
        success: true,
        user: data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // DELETE user profile (does not delete Auth account)
  router.delete("/users/:id", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
      const id = String(req.params.id);
  
      const { error } = await db
        .from("user_profiles")
        .delete()
        .eq("id", id);
  
      if (error) throw error;
  
      await addAuditLog(db, "DELETE", "USER", id);
  
      res.json({
        success: true,
        message: "User profile deleted",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

// ==========================================
// ACADEMIC YEARS
// ==========================================

// GET academic years
router.get("/academic-years", async (_req: Request, res: Response) => {
  try {
    const db = res.locals.supabase;
    const { data, error } = await db
      .from("academic_years")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) throw error;

    res.json({ success: true, academicYears: data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE academic year
router.post("/academic-years", async (req: Request, res: Response) => {
  try {
    const db = res.locals.supabase;
    const {
      year_name,
      start_date,
      end_date,
      is_current,
    } = req.body;

    if (!year_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Year name, start date and end date are required",
      });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    if (is_current) {
      const { error: resetError } = await db
        .from("academic_years")
        .update({ is_current: false })
        .eq("is_current", true);

      if (resetError) throw resetError;
    }

    const { data, error } = await db
      .from("academic_years")
      .insert({
        year_name,
        start_date,
        end_date,
        is_current: Boolean(is_current),
      })
      .select()
      .single();

    if (error) throw error;

    await addAuditLog(res.locals.supabase,"CREATE", "ACADEMIC_YEAR", String(data.id), {
      year_name,
    });

    res.status(201).json({
      success: true,
      academicYear: data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE academic year
router.put("/academic-years/:id", async (req: Request, res: Response) => {
  try {
    const db = res.locals.supabase;
    const id = String(req.params.id);

    if (req.body.is_current === true) {
      const { error: resetError } = await db
        .from("academic_years")
        .update({ is_current: false })
        .eq("is_current", true);

      if (resetError) throw resetError;
    }

    const { data, error } = await db
      .from("academic_years")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await addAuditLog(res.locals.supabase, "UPDATE", "ACADEMIC_YEAR", id, req.body);

    res.json({
      success: true,
      academicYear: data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE academic year
router.delete("/academic-years/:id", async (req: Request, res: Response) => {
  try {
    const db = res.locals.supabase;
    const id = String(req.params.id);

    const { error } = await db
      .from("academic_years")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await addAuditLog(res.locals.supabase,"DELETE", "ACADEMIC_YEAR", id);

    res.json({
      success: true,
      message: "Academic year deleted",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================
// PROGRAMMES
// ==========================================

// GET programmes
// GET programmes
router.get("/programmes", async (_req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const { data, error } = await db
        .from("programmes")
        .select("*")
        .order("programme_name");
  
      if (error) throw error;
  
      res.json({ success: true, programmes: data });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // CREATE programme
  router.post("/programmes", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const {
        programme_code,
        programme_name,
        department,
        duration_years,
        total_semesters,
      } = req.body;
  
      if (!programme_code || !programme_name || !department) {
        return res.status(400).json({
          success: false,
          message: "Programme code, name and department are required",
        });
      }
  
      const { data, error } = await db
        .from("programmes")
        .insert({
          programme_code,
          programme_name,
          department,
          duration_years: Number(duration_years || 4),
          total_semesters: Number(total_semesters || 8),
        })
        .select()
        .single();
  
      if (error) throw error;
  
      await addAuditLog(db, "CREATE", "PROGRAMME", String(data.id), {
        programme_code,
        programme_name,
      });
  
      res.status(201).json({
        success: true,
        programme: data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // UPDATE programme
  router.put("/programmes/:id", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
      const id = String(req.params.id);
  
      const { data, error } = await db
        .from("programmes")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
  
      if (error) throw error;
  
      await addAuditLog(db, "UPDATE", "PROGRAMME", id, req.body);
  
      res.json({
        success: true,
        programme: data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // DELETE programme
  router.delete("/programmes/:id", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
      const id = String(req.params.id);
  
      const { error } = await db
        .from("programmes")
        .delete()
        .eq("id", id);
  
      if (error) throw error;
  
      await addAuditLog(db, "DELETE", "PROGRAMME", id);
  
      res.json({
        success: true,
        message: "Programme deleted",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

// ==========================================
// CAMPUS SETTINGS
// ==========================================

// ==========================================
// CAMPUS SETTINGS
// ==========================================

// GET campus settings
router.get("/campus-settings", async (_req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const { data, error } = await db
        .from("campus_settings")
        .select("*")
        .order("id", { ascending: true });
  
      if (error) throw error;
  
      res.json({ success: true, settings: data });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // CREATE campus settings
  router.post("/campus-settings", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const {
        campus_name,
        campus_code,
        address,
        contact_email,
        contact_phone,
      } = req.body;
  
      if (!campus_name) {
        return res.status(400).json({
          success: false,
          message: "Campus name is required",
        });
      }
  
      const { data, error } = await db
        .from("campus_settings")
        .insert({
          campus_name,
          campus_code,
          address,
          contact_email,
          contact_phone,
        })
        .select()
        .single();
  
      if (error) throw error;
  
      await addAuditLog(db, "CREATE", "CAMPUS_SETTINGS", String(data.id), {
        campus_name,
      });
  
      res.status(201).json({
        success: true,
        settings: data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  // UPDATE campus settings
  router.put("/campus-settings/:id", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
      const id = String(req.params.id);
  
      const { data, error } = await db
        .from("campus_settings")
        .update({
          ...req.body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
  
      if (error) throw error;
  
      await addAuditLog(db, "UPDATE", "CAMPUS_SETTINGS", id, req.body);
  
      res.json({
        success: true,
        settings: data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
// ==========================================
// AUDIT LOGS
// ==========================================

router.get("/audit-logs", async (req: Request, res: Response) => {
    try {
      const db = res.locals.supabase;
  
      const limit = Math.min(
        Math.max(Number(req.query.limit) || 100, 1),
        500
      );
  
      const { data, error } = await db
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
  
      if (error) throw error;
  
      res.json({ success: true, logs: data });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
  
  export default router;
