// server/routes/board/index.ts
// Chronological feed for /api/board.
// Returns posts newest-to-oldest for every viewer, regardless of follows.

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getPagination } from "../../lib/api";

const router = Router();

const POST_SELECT = `
  id,
  title,
  content,
  image_url,
  created_at,
  updated_at,
  profiles!author_id (
    id,
    display_name,
    avatar_url
  ),
  likes ( count ),
  comments ( count )
`;

/*
Old smart-feed implementation kept for reference:

router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const ctx = await getUser(req, res); // null = Guest
    const { from, to, page, limit } = getPagination(req.query);

    if (!ctx) {
      const { data: posts, error, count } = await supabase
        .from("posts")
        .select(POST_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return ok(res, { posts: posts ?? [], total: count ?? 0, page, limit });
    }

    const userId = ctx.user.id;

    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    const followingIds = (followingData ?? []).map((f) => f.following_id);

    if (followingIds.length === 0) {
      const { data: posts, error, count } = await supabase
        .from("posts")
        .select(POST_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return ok(res, { posts: posts ?? [], total: count ?? 0, page, limit });
    }

    const { data: followingPosts } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .in("author_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    const followingPostIds = new Set((followingPosts ?? []).map((p: { id: string }) => p.id));

    let recentQuery = supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (followingPostIds.size > 0) {
      recentQuery = recentQuery.not("author_id", "in", `(${followingIds.join(",")})`);
    }

    const { data: recentPosts } = await recentQuery;
    const recentPostIds = new Set((recentPosts ?? []).map((p: { id: string }) => p.id));

    const excludeIds = [...followingPostIds, ...recentPostIds];

    let randomQuery = supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .limit(Math.ceil(limit / 2));

    if (excludeIds.length > 0) {
      randomQuery = randomQuery.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: randomPosts } = await randomQuery;

    const seenIds = new Set<string>();
    const merged: unknown[] = [];

    const addPosts = (posts: unknown[] | null) => {
      (posts ?? []).forEach((p) => {
        const post = p as { id: string };
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          merged.push(post);
        }
      });
    };

    addPosts(followingPosts ?? []);
    addPosts(recentPosts ?? []);
    addPosts(randomPosts ?? []);

    const paginated = merged.slice(from, to + 1);

    const { count: total } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true });

    return ok(res, {
      posts: paginated,
      total: total ?? 0,
      page,
      limit,
    });
  } catch {
    return err(res, "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเธญเธฃเนเธ”เนเธ”เน", 500);
  }
});
*/

router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { from, to, page, limit } = getPagination(req.query);

    // One ordered query keeps the feed fast and stable for every user.
    const { data: posts, error, count } = await supabase
      .from("posts")
      .select(POST_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return ok(res, {
      posts: posts ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return err(res, "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเธญเธฃเนเธ”เนเธ”เน", 500);
  }
});

export default router;
