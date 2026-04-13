// src/server/routes/search.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search?q=...&type=posts|hashtag|users&page=1&limit=20
//
// type=posts   → Full-Text Search จาก title + content  (?q=ราคาหอ)
// type=hashtag → โพสที่มี hashtag นั้น                 (?q=ku69 หรือ ?q=%23ku69)
// type=users   → ค้นหา display_name (username)          (?q=somchai)
//
// ทุก type → Guest เข้าได้ ไม่ต้อง login
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../lib/supabase";
import { ok, err, getPagination } from "../lib/api";

const router = Router();

function sanitizeQuery(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, 100);
}

router.get("/", async (req: Request, res: Response) => {
  const rawQ = sanitizeQuery(req.query.q);
  const type = String(req.query.type ?? "posts");
  const { from, to, page, limit } = getPagination(req.query);

  if (!rawQ) return err(res, "กรุณาระบุคำค้นหา (?q=...)", 422);

  const validTypes = ["posts", "hashtag", "users"];
  if (!validTypes.includes(type)) {
    return err(res, "type ต้องเป็น posts | hashtag | users", 422);
  }

  const supabase = createServerClient(req, res);

  try {
    if (type === "posts") {
      const { data: posts, error, count } = await supabase
        .from("posts")
        .select(
          `id, title, content, image_url, is_incognito, created_at,
           profiles!author_id ( id, display_name ),
           likes ( count ),
           comments ( count )`,
          { count: "exact" }
        )
        .textSearch("search_vector", rawQ, { type: "plain", config: "simple" })
        .eq("is_incognito", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return ok(res, { type, query: rawQ, results: posts ?? [], total: count ?? 0, page, limit });
    }

    if (type === "hashtag") {
      const tag = rawQ.replace(/^#/, "").toLowerCase();

      const { data: hashtag } = await supabase
        .from("hashtags")
        .select("id, name")
        .eq("name", tag)
        .single();

      if (!hashtag) {
        return ok(res, { type, query: `#${tag}`, results: [], total: 0, page, limit });
      }

      const { data: rows, error, count } = await supabase
        .from("post_hashtags")
        .select(
          `posts!inner (
            id, title, content, image_url, is_incognito, created_at,
            profiles!author_id ( id, display_name ),
            likes ( count ),
            comments ( count )
          )`,
          { count: "exact" }
        )
        .eq("hashtag_id", hashtag.id)
        .eq("posts.is_incognito", false)
        .order("created_at", { referencedTable: "posts", ascending: false })
        .range(from, to);

      if (error) throw error;

      const results = (rows ?? []).map((r: any) => r.posts);

      return ok(res, {
        type,
        query: `#${tag}`,
        hashtag: { id: hashtag.id, name: hashtag.name },
        results,
        total: count ?? 0,
        page,
        limit,
      });
    }

    if (type === "users") {
      const { data: users, error, count } = await supabase
        .from("profiles")
        .select("id, display_name, role, created_at", { count: "exact" })
        .ilike("display_name", `%${rawQ}%`)
        .eq("status", "active")
        .order("display_name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      return ok(res, { type, query: rawQ, results: users ?? [], total: count ?? 0, page, limit });
    }
  } catch (e) {
    console.error("[search error]", e);
    return err(res, "ไม่สามารถค้นหาได้ในขณะนี้", 500);
  }
});

export default router;