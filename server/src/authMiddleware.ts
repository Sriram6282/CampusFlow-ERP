import { Request, Response, NextFunction } from "express";
import { supabase, createUserSupabaseClient } from "./superbase";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  res.locals.user = data.user;
  res.locals.accessToken = token;
  res.locals.supabase = createUserSupabaseClient(token);

  next();
}

export async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = res.locals.user;
    const userSupabase = res.locals.supabase;
  
    const { data: profile, error } = await userSupabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();
  
    if (error || !profile || !profile.is_active) {
      res.status(403).json({
        error: "Access denied. Active user profile required.",
      });
      return;
    }
  
    if (profile.role !== "Admin") {
      res.status(403).json({
        error: "Admin permission required.",
      });
      return;
    }
  
    next();
  }