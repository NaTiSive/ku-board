// src/server/routes/posts/shares.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/posts/:postId/shares  → ดูจำนวนการแชร์
// POST /api/posts/:postId/shares  → บันทึกการแชร์ + คืน share URL
// ─────────────────────────────────────────────────────────────────────────────
// ทุกคน (รวม Guest) แชร์ได้
// Frontend เอา share_url ไปใช้กับ navigator.share() หรือ copy to clipboard

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser } from "../../lib/api";

const router = Router({ mergeParams: true });

// ── GET — จำนวนการแชร์ ────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);

    const { count, error } = await supabase
      .from("shares")
      .select("id", { count: "exact", head: true })
      .eq("post_id", req.params.postId);

    if (error) throw error;

    return ok(res, { share_count: count ?? 0 });
  } catch {
    return err(res, "ไม่สามารถโหลดข้อมูลการแชร์ได้", 500);
  }
});

// ── POST — บันทึกการแชร์ ──────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const ctx = await getUser(req, res); // null = Guest

    // platform: 'copy_link' | 'web_share' | 'other' (default: copy_link)
    const validPlatforms = ["copy_link", "web_share", "other"];
    const platform = validPlatforms.includes(req.body?.platform)
      ? req.body.platform
      : "copy_link";

    // ตรวจสอบว่าโพสมีอยู่จริง
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", req.params.postId)
      .single();

    if (!post) return err(res, "ไม่พบโพสนี้", 404);

    // บันทึก share event
    await supabase.from("shares").insert({
      post_id: req.params.postId,
      shared_by: ctx?.user.id ?? null, // null = Guest
      platform,
    });

    // สร้าง shareable URL
    const baseUrl = process.env.CLIENT_URL ?? "http://localhost:5173"; // Vite default port
    const shareUrl = `${baseUrl}/posts/${req.params.postId}`;

    const { count } = await supabase
      .from("shares")
      .select("id", { count: "exact", head: true })
      .eq("post_id", req.params.postId);

    return ok(res, { share_url: shareUrl, share_count: count ?? 0 }, 201);
  } catch {
    return err(res, "ไม่สามารถบันทึกการแชร์ได้", 500);
  }
});

export default router;
