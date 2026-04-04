// src/server/routes/posts/comments.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/posts/:postId/comments             → ดูคอมเมนต์ (ทุกคน)
// POST   /api/posts/:postId/comments             → เพิ่มคอมเมนต์ (KU Member / Guest)
// DELETE /api/posts/:postId/comments/:commentId  → ลบคอมเมนต์ (เจ้าของ / Admin)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser, getPagination } from "../../lib/api";

const router = Router({ mergeParams: true });

// ── GET — ดูคอมเมนต์ทั้งหมด ──────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { from, to, page, limit } = getPagination(req.query);

    const { data: comments, error, count } = await supabase
      .from("comments")
      .select(
        `
        id, content, guest_name, created_at,
        profiles!author_id ( id, display_name )
        `,
        { count: "exact" }
      )
      .eq("post_id", req.params.postId)
      .order("created_at", { ascending: true }) // เก่าสุดก่อน เหมือน Twitter
      .range(from, to);

    if (error) throw error;

    return ok(res, { comments: comments ?? [], total: count ?? 0, page, limit });
  } catch {
    return err(res, "ไม่สามารถโหลดคอมเมนต์ได้", 500);
  }
});

// ── POST — เพิ่มคอมเมนต์ ─────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const ctx = await getUser(req, res); // null = Guest

    const content   = (req.body?.content    ?? "").trim();
    const guestName = (req.body?.guest_name ?? "").trim(); // ใช้เฉพาะ Guest

    // Validate content
    if (!content) return err(res, "กรุณากรอกคอมเมนต์", 422);
    if (content.length > 1000) return err(res, "คอมเมนต์ยาวเกิน 1000 ตัวอักษร", 422);

    // Guest ต้องส่ง guest_name มาด้วย
    if (!ctx && !guestName) {
      return err(res, "กรุณาระบุชื่อสำหรับการแสดงความคิดเห็น", 422);
    }

    // KU Member ที่ถูก ban ห้ามคอมเมนต์
    if (ctx?.profile.status === "banned") {
      return err(res, "Account ถูกระงับการใช้งาน", 403);
    }

    // ตรวจสอบว่าโพสมีอยู่จริง
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", req.params.postId)
      .single();

    if (!post) return err(res, "ไม่พบโพสนี้", 404);

    // สร้าง record ต่างกันระหว่าง KU Member กับ Guest
    const insertData = ctx
      ? { post_id: req.params.postId, author_id: ctx.user.id, content }
      : { post_id: req.params.postId, author_id: null, guest_name: guestName, content };

    const { data: comment, error } = await supabase
      .from("comments")
      .insert(insertData)
      .select(
        `id, content, guest_name, created_at,
        profiles!author_id ( id, display_name )`
      )
      .single();

    if (error) throw error;

    return ok(res, comment, 201);
  } catch {
    return err(res, "ไม่สามารถเพิ่มคอมเมนต์ได้", 500);
  }
});

// ── DELETE — ลบคอมเมนต์ ──────────────────────────────────────────────────────
router.delete("/:commentId", async (req: Request, res: Response) => {
  try {
    const ctx = await getUser(req, res);
    if (!ctx) return err(res, "Unauthorized", 401);

    const { user, profile, supabase } = ctx;
    const isAdmin = profile.role === "admin";

    // ดึงคอมเมนต์ที่ต้องการลบ
    const { data: comment, error: findErr } = await supabase
      .from("comments")
      .select("id, author_id, post_id")
      .eq("id", req.params.commentId)
      .eq("post_id", req.params.postId) // ยืนยันว่าอยู่ในโพสที่ถูกต้อง
      .single();

    if (findErr || !comment) return err(res, "ไม่พบคอมเมนต์นี้", 404);

    if (comment.author_id !== user.id && !isAdmin) {
      return err(res, "Forbidden — ไม่มีสิทธิ์ลบคอมเมนต์นี้", 403);
    }

    await supabase.from("comments").delete().eq("id", req.params.commentId);

    // บันทึก admin log ถ้า admin เป็นคนลบ
    if (isAdmin && comment.author_id !== user.id) {
      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "delete_comment",
        target_id: req.params.commentId,
      });
    }

    return ok(res, { deleted: true });
  } catch {
    return err(res, "ไม่สามารถลบคอมเมนต์ได้", 500);
  }
});

export default router;
