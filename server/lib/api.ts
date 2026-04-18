// src/server/lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helper functions ที่ใช้ร่วมกันทุก Express route
//
// ok()              → ส่ง JSON response สำเร็จ
// err()             → ส่ง JSON response error
// getUser()         → ดึง user + profile จาก session (null ถ้า Guest)
// requireKUMember() → guard ต้อง login และ active ก่อน
// requireAdmin()    → guard ต้อง admin
// getPagination()   → แปลง query string → from/to สำหรับ Supabase
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from "express";
import { createAdminClient, createServerClient } from "./supabase";

// ─── Response helpers ─────────────────────────────────────────────────────────

/** ส่ง JSON response สำเร็จ */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** ส่ง JSON response error */
export function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * ดึง user ที่ login อยู่จาก Supabase session cookie
 * คืน { user, profile, supabase } หรือ null ถ้าไม่ได้ login
 */
export async function getUser(req: Request, res: Response) {
  const sessionSupabase = createServerClient(req, res);

  // ดึง user จาก session
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user) return null;

  // ดึง profile (role, status, display_name)
  const { data: profile } = await sessionSupabase
    .from("profiles")
    .select("id, display_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const supabase = profile.role === "admin" ? createAdminClient() : sessionSupabase;

  return { user, profile, supabase };
}

/**
 * ตรวจสอบว่า request มาจาก KU Member ที่ active
 * คืน context หรือ ส่ง error response แล้ว return null
 */
export async function requireKUMember(req: Request, res: Response) {
  const ctx = await getUser(req, res);

  if (!ctx) {
    err(res, "Unauthorized — กรุณาล็อกอินก่อน", 401);
    return null;
  }
  if (ctx.profile.status === "banned") {
    err(res, "Account ถูกระงับการใช้งาน", 403);
    return null;
  }

  return ctx;
}

/**
 * ตรวจสอบว่าเป็น Admin
 * คืน context หรือ ส่ง error response แล้ว return null
 */
export async function requireAdmin(req: Request, res: Response) {
  const ctx = await requireKUMember(req, res);
  if (!ctx) return null;

  if (ctx.profile.role !== "admin") {
    err(res, "Forbidden — เฉพาะ Admin เท่านั้น", 403);
    return null;
  }

  return ctx;
}

// ─── Pagination helper ────────────────────────────────────────────────────────

/** แปลง query params page, limit → Supabase range (from, to) */
export function getPagination(query: Request["query"]) {
  const page  = Math.max(1, parseInt((query.page  as string) ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt((query.limit as string) ?? "20")));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { page, limit, from, to };
}
