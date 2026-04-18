// server/routes/posts/likes.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/posts/:postId/likes  → จำนวน like + สถานะของ user ปัจจุบัน
// POST /api/posts/:postId/likes  → toggle like/unlike (KU Member เท่านั้น)
//
// [เปลี่ยนแปลง] เพิ่ม notifyLike() หลัง like สำเร็จ (fire-and-forget)
//               ไม่ส่ง notification ตอน unlike
// ─────────────────────────────────────────────────────────────────────────────
 
import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser, requireKUMember } from "../../lib/api";
import { notifyLike } from "../notifications/triggers"; // [ใหม่]
 
const router = Router({ mergeParams: true });
 
// ── GET — จำนวน like + สถานะของ user ────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const ctx = await getUser(req, res); // null = Guest
 
    // นับ like ทั้งหมด
    const { count } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", req.params.postId);
 
    // เช็คว่า user นี้ like แล้วหรือยัง (ถ้า login อยู่)
    let isLiked = false;
    if (ctx) {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", req.params.postId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
 
      isLiked = !!data;
    }
 
    return ok(res, { like_count: count ?? 0, is_liked: isLiked });
  } catch {
    return err(res, "ไม่สามารถโหลดข้อมูล like ได้", 500);
  }
});
 
// ── POST — Toggle Like ────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { user, supabase } = ctx;
 
    // ตรวจสอบว่าโพสมีอยู่จริง
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", req.params.postId)
      .single();
 
    if (!post) return err(res, "ไม่พบโพสนี้", 404);
 
    // เช็คสถานะ like ปัจจุบัน
    const { data: existing } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", req.params.postId)
      .eq("user_id", user.id)
      .maybeSingle();
 
    if (existing) {
      // ── Unlike: ลบออก ────────────────────────────────────────────────────
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", req.params.postId)
        .eq("user_id", user.id);
 
      const { count } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", req.params.postId);
 
      // unlike → ไม่ส่ง notification
      return ok(res, { action: "unliked", like_count: count ?? 0, is_liked: false });
    } else {
      // ── Like: เพิ่ม ──────────────────────────────────────────────────────
      await supabase.from("likes").insert({
        post_id: req.params.postId,
        user_id: user.id,
      });
 
      const { count } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", req.params.postId);
 
      // [ใหม่] แจ้งเจ้าของโพส — fire-and-forget (ไม่ await เพื่อไม่ให้ช้า)
      const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
      if (postId) {
        notifyLike(supabase, postId, user.id);
      }
 
      return ok(res, { action: "liked", like_count: count ?? 0, is_liked: true });
    }
  } catch {
    return err(res, "ไม่สามารถ like โพสได้", 500);
  }
});
 
export default router;
