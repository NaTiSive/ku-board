// server/routes/search.ts
// ─────────────────────────────────────────────────────────────────────────────
// Search API mounted at /api/search.
//
// Supports posts, hashtags, and user search.
// Currently active and used by the client search page.
//
// Query params: q, type=posts|hashtag|users, page, limit
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../lib/supabase";
import { ok, err, getPagination } from "../lib/api";

const router = Router();

function sanitizeQuery(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, 100);
}

function normalizeError(error: unknown) {
  if (error && typeof error === "object") {
    return {
      message: "message" in error ? (error as { message?: unknown }).message : null,
      code: "code" in error ? (error as { code?: unknown }).code : null,
      details: "details" in error ? (error as { details?: unknown }).details : null,
      hint: "hint" in error ? (error as { hint?: unknown }).hint : null,
      raw: error,
    };
  }

  return {
    message: String(error),
    code: null,
    details: null,
    hint: null,
    raw: error,
  };
}

function isMissingIncognitoColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? (error as { code?: unknown }).code : null;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";

  return code === "42703" && message.includes("is_incognito");
}

function buildPostSelect(includeIncognito: boolean) {
  return `id, title, content, image_url, ${includeIncognito ? "is_incognito, " : ""}created_at,
    profiles!author_id ( id, display_name, avatar_url ),
    likes ( count ),
    comments ( count )`;
}

async function searchPosts(
  supabase: ReturnType<typeof createServerClient>,
  rawQ: string,
  from: number,
  to: number,
) {
  const runQuery = async (useFullText: boolean, includeIncognito: boolean) => {
    let query = supabase
      .from("posts")
      .select(buildPostSelect(includeIncognito), { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    query = useFullText
      ? query.textSearch("search_vector", rawQ, { type: "plain", config: "simple" })
      : query.or(`title.ilike.%${rawQ}%,content.ilike.%${rawQ}%`);

    if (includeIncognito) {
      query = query.eq("is_incognito", false);
    }

    return query;
  };

  let result = await runQuery(true, true);
  if (!result.error) return result;

  if (isMissingIncognitoColumn(result.error)) {
    result = await runQuery(true, false);
    if (!result.error) return result;
  }

  result = await runQuery(false, !isMissingIncognitoColumn(result.error));
  if (!result.error) return result;

  if (isMissingIncognitoColumn(result.error)) {
    result = await runQuery(false, false);
  }

  return result;
}

async function searchHashtags(
  supabase: ReturnType<typeof createServerClient>,
  tag: string,
  from: number,
  to: number,
) {
  const { data: hashtag } = await supabase
    .from("hashtags")
    .select("id, name")
    .eq("name", tag)
    .single();

  if (!hashtag) {
    return { hashtag: null, rows: [], count: 0, error: null };
  }

  const runQuery = async (includeIncognito: boolean) => {
    const postsSelect = `posts!inner (
      id, title, content, image_url, ${includeIncognito ? "is_incognito, " : ""}created_at,
      profiles!author_id ( id, display_name, avatar_url ),
      likes ( count ),
      comments ( count )
    )`;

    let query = supabase
      .from("post_hashtags")
      .select(postsSelect, { count: "exact" })
      .eq("hashtag_id", hashtag.id)
      .order("created_at", { referencedTable: "posts", ascending: false })
      .range(from, to);

    if (includeIncognito) {
      query = query.eq("posts.is_incognito", false);
    }

    return query;
  };

  let result = await runQuery(true);
  if (result.error && isMissingIncognitoColumn(result.error)) {
    result = await runQuery(false);
  }

  return {
    hashtag,
    rows: (result.data ?? []) as unknown as Array<{ posts: unknown }>,
    count: result.count ?? 0,
    error: result.error,
  };
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
      const result = await searchPosts(supabase, rawQ, from, to);
      if (result.error) throw result.error;

      return ok(res, {
        type,
        query: rawQ,
        results: result.data ?? [],
        total: result.count ?? 0,
        page,
        limit,
      });
    }

    if (type === "hashtag") {
      const tag = rawQ.replace(/^#/, "").toLowerCase();
      const result = await searchHashtags(supabase, tag, from, to);

      if (!result.hashtag) {
        return ok(res, { type, query: `#${tag}`, results: [], total: 0, page, limit });
      }

      if (result.error) throw result.error;

      return ok(res, {
        type,
        query: `#${tag}`,
        hashtag: { id: result.hashtag.id, name: result.hashtag.name },
        results: result.rows.map((row) => row.posts),
        total: result.count,
        page,
        limit,
      });
    }

    if (type === "users") {
      const { data: users, error, count } = await supabase
        .from("profiles")
        .select("id, display_name, role, created_at, avatar_url", { count: "exact" })
        .ilike("display_name", `%${rawQ}%`)
        .eq("status", "active")
        .order("display_name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      return ok(res, { type, query: rawQ, results: users ?? [], total: count ?? 0, page, limit });
    }
  } catch (error) {
    console.error("[search error]", {
      type,
      query: rawQ,
      error: normalizeError(error),
    });
    return err(res, "ไม่สามารถค้นหาได้ในขณะนี้", 500);
  }
});

export default router;
