// server/routes/follows/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/follows/:userId/followers  → ดูคนที่ติดตาม userId
// GET    /api/follows/:userId/following  → ดูคนที่ userId ติดตามอยู่
// GET    /api/follows/:userId/status     → เช็คว่า login user ติดตาม userId อยู่ไหม
// POST   /api/follows/:userId            → ติดตาม userId (KU Member เท่านั้น)
// DELETE /api/follows/:userId            → เลิกติดตาม userId
// ─────────────────────────────────────────────────────────────────────────────
 
import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, requireKUMember, getUser } from "../../lib/api";
import { notifyFollow } from "../notifications/triggers";
 
const router = Router();
 
// ── GET /api/follows/:userId/followers — คนที่ติดตาม userId ──────────────────
router.get("/:userId/followers", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
 
    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        follower_id,
        created_at,
        profiles!follower_id ( id, display_name, avatar_url )
        `
      )
      .eq("following_id", req.params.userId)
      .order("created_at", { ascending: false });
 
    if (error) throw error;
 
    return ok(res, { followers: data ?? [] });
  } catch {
    return err(res, "ไม่สามารถโหลด followers ได้", 500);
  }
});
 
// ── GET /api/follows/:userId/following — คนที่ userId ติดตาม ─────────────────
router.get("/:userId/following", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
 
    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        following_id,
        created_at,
        profiles!following_id ( id, display_name, avatar_url )
        `
      )
      .eq("follower_id", req.params.userId)
      .order("created_at", { ascending: false });
 
    if (error) throw error;
 
    return ok(res, { following: data ?? [] });
  } catch {
    return err(res, "ไม่สามารถโหลด following ได้", 500);
  }
});
 
// ── GET /api/follows/:userId/status — เช็คสถานะการติดตาม ────────────────────
router.get("/:userId/status", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const ctx = await getUser(req, res); // null = Guest
 
    // ถ้ายังไม่ login → ไม่ได้ติดตามแน่นอน
    if (!ctx) return ok(res, { is_following: false });
 
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", ctx.user.id)
      .eq("following_id", req.params.userId)
      .maybeSingle(); // คืน null ถ้าไม่พบ แทน error
 
    return ok(res, { is_following: !!data });
  } catch {
    return err(res, "ไม่สามารถตรวจสอบสถานะการติดตามได้", 500);
  }
});
 
// ── POST /api/follows/:userId — ติดตาม ───────────────────────────────────────
router.post("/:userId", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { user, supabase } = ctx;
    const targetId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!targetId) return err(res, "Missing user id", 400);
 
    // ห้ามติดตามตัวเอง
    if (user.id === targetId) {
      return err(res, "ไม่สามารถติดตามตัวเองได้", 422);
    }
 
    // ตรวจสอบว่า target user มีอยู่จริง
    const { data: target } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", targetId)
      .single();
 
    if (!target) return err(res, "ไม่พบผู้ใช้นี้", 404);
 
    // ตรวจสอบว่าติดตามอยู่แล้วหรือยัง
    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetId)
      .maybeSingle();
 
    if (existing) {
      return err(res, "คุณติดตามผู้ใช้นี้อยู่แล้ว", 409);
    }
 
    // บันทึกการติดตาม
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetId });
 
    if (error) throw error;
 
    // แจ้งเตือน user ที่ถูกติดตาม (fire-and-forget)
    notifyFollow(supabase, user.id, targetId);
 
    return ok(res, { following: true }, 201);
  } catch {
    return err(res, "ไม่สามารถติดตามได้", 500);
  }
});
 
// ── DELETE /api/follows/:userId — เลิกติดตาม ────────────────────────────────
router.delete("/:userId", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { user, supabase } = ctx;
 
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", req.params.userId);
 
    if (error) throw error;
 
    return ok(res, { following: false });
  } catch {
    return err(res, "ไม่สามารถเลิกติดตามได้", 500);
  }
});
 
export default router;
