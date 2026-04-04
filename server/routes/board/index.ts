// src/server/routes/board/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/board
// แสดงโพสทั้งหมดในบอร์ดสาธารณะ (Public Feed) ทุกคนเข้าถึงได้
// เรียงจากใหม่ → เก่า รองรับ pagination
//
// Query: ?page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getPagination } from "../../lib/api";

const router = Router();

// GET /api/board — public feed
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { from, to, page, limit } = getPagination(req.query);

    const { data: posts, error, count } = await supabase
      .from("posts")
      .select(
        `
        id,
        content,
        image_url,
        created_at,
        updated_at,
        profiles!author_id (
          id,
          display_name
        ),
        likes ( count ),
        comments ( count )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false }) // ใหม่สุดก่อน
      .range(from, to);

    if (error) throw error;

    return ok(res, { posts: posts ?? [], total: count ?? 0, page, limit });
  } catch {
    return err(res, "ไม่สามารถโหลดบอร์ดได้", 500);
  }
});

export default router;
