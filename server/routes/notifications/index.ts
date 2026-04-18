// server/routes/notifications/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET   /api/notifications          → ดูการแจ้งเตือนของตัวเอง (KU Member เท่านั้น)
// PATCH /api/notifications/read     → mark notification ว่าอ่านแล้ว
// PATCH /api/notifications/read-all → mark ทั้งหมดว่าอ่านแล้ว
// GET   /api/notifications/unread-count → จำนวนที่ยังไม่ได้อ่าน (สำหรับ badge)
// ─────────────────────────────────────────────────────────────────────────────
 
import { Router } from "express";
import type { Request, Response } from "express";
import { ok, err, requireKUMember, getPagination } from "../../lib/api";
import { toNotificationListItem } from "../../lib/notifications";
 
const router = Router();
 
// ── GET /api/notifications — ดูการแจ้งเตือนทั้งหมด ───────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { supabase, user } = ctx;
    const { from, to, page, limit } = getPagination(req.query);
 
    const { data: notifications, error, count } = await supabase
      .from("notifications")
      .select(
        `
        id,
        type,
        is_read,
        body,
        created_at,
        post_id,
        profiles!actor_id (
          id,
          display_name
        ),
        posts (
          id,
          content
        )
        `,
        { count: "exact" }
      )
      .eq("recipient_id", user.id)  // ดูได้เฉพาะของตัวเอง
      .order("created_at", { ascending: false }) // ใหม่ก่อน
      .range(from, to);
 
    if (error) throw error;
 
    return ok(res, {
      notifications: (notifications ?? []).map((notification) =>
        toNotificationListItem(notification)
      ),
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return err(res, "ไม่สามารถโหลดการแจ้งเตือนได้", 500);
  }
});
 
// ── GET /api/notifications/unread-count — จำนวน badge ───────────────────────
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { supabase, user } = ctx;
 
    // นับเฉพาะที่ยังไม่ได้อ่าน (head: true = ไม่ดึง data จริง ประหยัด)
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
 
    if (error) throw error;
 
    return ok(res, { unread_count: count ?? 0 });
  } catch {
    return err(res, "ไม่สามารถโหลดจำนวนแจ้งเตือนได้", 500);
  }
});
 
// ── PATCH /api/notifications/read — mark บาง notification ว่าอ่านแล้ว ────────
router.patch("/read", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { supabase, user } = ctx;
 
    // รับ array ของ notification id ที่ต้องการ mark
    const ids: string[] = req.body?.ids ?? [];
 
    if (!Array.isArray(ids) || ids.length === 0) {
      return err(res, "กรุณาส่ง ids เป็น array", 422);
    }
 
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)  // ป้องกัน mark ของคนอื่น
      .in("id", ids);
 
    if (error) throw error;
 
    return ok(res, { updated: ids.length });
  } catch {
    return err(res, "ไม่สามารถ mark notification ได้", 500);
  }
});
 
// ── PATCH /api/notifications/read-all — mark ทั้งหมดว่าอ่านแล้ว ─────────────
router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { supabase, user } = ctx;
 
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false); // อัปเดตเฉพาะที่ยังไม่ได้อ่าน
 
    if (error) throw error;
 
    return ok(res, { updated: true });
  } catch {
    return err(res, "ไม่สามารถ mark notification ได้", 500);
  }
});
 
export default router;
