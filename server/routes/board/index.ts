// server/routes/board/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/board — Smart Feed (แทนที่ของเดิมที่เรียงแค่ created_at)
//
// ลำดับการแสดงโพส:
//   1. โพสของคนที่ login user ติดตาม (เรียงจากใหม่ไปเก่า)
//   2. โพสอื่นที่ใหม่กว่า (ไม่ซ้ำกับกลุ่มแรก เรียงจากใหม่ไปเก่า)
//   3. โพสที่เหลือสุ่มขึ้นมา
//
// Guest: ไม่มี following → เห็นเฉพาะกลุ่ม 2+3 เรียงตามเวลา
//
// Query Params:
//   page  (default: 1)
//   limit (default: 20, max: 50)
// ─────────────────────────────────────────────────────────────────────────────
 
import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser, getPagination } from "../../lib/api";
 
const router = Router();
 
// POST SELECT fragment ที่ใช้ซ้ำทุก query
const POST_SELECT = `
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
`;
 
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const ctx = await getUser(req, res); // null = Guest
    const { from, to, page, limit } = getPagination(req.query);
 
    // ─── ถ้า Guest หรือไม่มี following → แสดงแบบเรียงตามเวลาอย่างเดียว ─────
    if (!ctx) {
      const { data: posts, error, count } = await supabase
        .from("posts")
        .select(POST_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
 
      if (error) throw error;
      return ok(res, { posts: posts ?? [], total: count ?? 0, page, limit });
    }
 
    // ─── KU Member: Smart Feed ────────────────────────────────────────────────
 
    const userId = ctx.user.id;
 
    // ขั้นที่ 1: ดึง following list ของ user นี้
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
 
    const followingIds = (followingData ?? []).map((f) => f.following_id);
 
    // ─── ถ้าไม่มี following → fallback เหมือน Guest ─────────────────────────
    if (followingIds.length === 0) {
      const { data: posts, error, count } = await supabase
        .from("posts")
        .select(POST_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
 
      if (error) throw error;
      return ok(res, { posts: posts ?? [], total: count ?? 0, page, limit });
    }
 
    // ─── มี following → ดึง 3 กลุ่ม แล้วรวมกัน ──────────────────────────────
 
    // กลุ่ม 1: โพสจาก following (ใหม่สุดก่อน)
    // ดึงมา limit*2 เผื่อมีมากพอ แล้วค่อย slice ตาม pagination
    const { data: followingPosts } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .in("author_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(limit * 2);
 
    const followingPostIds = new Set((followingPosts ?? []).map((p: { id: string }) => p.id));
 
    // กลุ่ม 2: โพสใหม่ล่าสุดที่ไม่ใช่จาก following (ไม่ซ้ำกลุ่ม 1)
    let recentQuery = supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);
 
    // ถ้ามีโพสจาก following ให้กรองออก
    if (followingPostIds.size > 0) {
      recentQuery = recentQuery.not("author_id", "in", `(${followingIds.join(",")})`);
    }
 
    const { data: recentPosts } = await recentQuery;
 
    const recentPostIds = new Set((recentPosts ?? []).map((p: { id: string }) => p.id));
 
    // กลุ่ม 3: สุ่มโพสที่เหลือ (ไม่ซ้ำ 2 กลุ่มแรก)
    // ใช้ Postgres random() ผ่าน RPC หรือ order random
    const excludeIds = [...followingPostIds, ...recentPostIds];
 
    let randomQuery = supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false }) // Supabase ไม่รองรับ random() โดยตรง
      .limit(Math.ceil(limit / 2));              // ดึงมาครึ่งหนึ่งของ limit
 
    if (excludeIds.length > 0) {
      randomQuery = randomQuery.not("id", "in", `(${excludeIds.join(",")})`);
    }
 
    const { data: randomPosts } = await randomQuery;
 
    // ─── รวม 3 กลุ่ม (ไม่ซ้ำกัน) ────────────────────────────────────────────
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
 
    addPosts(followingPosts ?? []);  // กลุ่ม 1 ก่อน
    addPosts(recentPosts ?? []);     // กลุ่ม 2
    addPosts(randomPosts ?? []);     // กลุ่ม 3
 
    // ตัด pagination จากผลที่รวมแล้ว
    const paginated = merged.slice(from, to + 1);
 
    // นับ total จาก DB (สำหรับ pagination UI)
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
    return err(res, "ไม่สามารถโหลดบอร์ดได้", 500);
  }
});
 
export default router;