// src/server/routes/profile/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET   /api/profile/:userId         → ดูข้อมูล profile + จำนวนโพส
// PATCH /api/profile/:userId         → แก้ display_name (เจ้าของเท่านั้น)
// GET   /api/profile/:userId/posts   → โพสทั้งหมดของ user คนนั้น (Profile Board)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser, getPagination } from "../../lib/api";

const router = Router();

// ── GET /api/profile/:userId — ดู profile ────────────────────────────────────
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at")
      .eq("id", userId)
      .single();

    if (error || !profile) return err(res, "ไม่พบผู้ใช้นี้", 404);

    // นับโพสทั้งหมดของ user นี้ (head: true = ไม่ดึง data จริง ประหยัด bandwidth)
    const { count: postCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId);

    return ok(res, { ...profile, post_count: postCount ?? 0 });
  } catch {
    return err(res, "ไม่สามารถโหลด profile ได้", 500);
  }
});

// ── PATCH /api/profile/:userId — แก้ display_name ────────────────────────────
router.patch("/:userId", async (req: Request, res: Response) => {
  try {
    const ctx = await getUser(req, res);
    if (!ctx) return err(res, "Unauthorized", 401);

    // ห้ามแก้ profile ของคนอื่น
    if (ctx.user.id !== req.params.userId) {
      return err(res, "Forbidden — แก้ไขได้เฉพาะ account ของตัวเองเท่านั้น", 403);
    }

    const displayName = (req.body?.display_name ?? "").trim();

    // Validate: 2–50 ตัวอักษร
    if (displayName.length < 2 || displayName.length > 50) {
      return err(res, "Display name ต้องมีความยาว 2–50 ตัวอักษร", 422);
    }

    const { data, error } = await ctx.supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", req.params.userId)
      .select("id, display_name, role, status")
      .single();

    if (error) throw error;

    return ok(res, data);
  } catch {
    return err(res, "ไม่สามารถอัปเดต profile ได้", 500);
  }
});

// ── GET /api/profile/:userId/posts — Profile Board ───────────────────────────
router.get("/:userId/posts", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { userId } = req.params;
    const { from, to, page, limit } = getPagination(req.query);

    // ดึง profile เจ้าของหน้าก่อน
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at")
      .eq("id", userId)
      .single();

    if (profileError || !profile) return err(res, "ไม่พบผู้ใช้นี้", 404);

    // ดึงโพสทั้งหมดของ user นี้
    const { data: posts, error, count } = await supabase
      .from("posts")
      .select(
        `
        id,
        content,
        image_url,
        created_at,
        updated_at,
        likes ( count ),
        comments ( count )
        `,
        { count: "exact" }
      )
      .eq("author_id", userId) // กรองเฉพาะโพสของ user นี้
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return ok(res, { profile, posts: posts ?? [], total: count ?? 0, page, limit });
  } catch {
    return err(res, "ไม่สามารถโหลด profile board ได้", 500);
  }
});

export default router;
