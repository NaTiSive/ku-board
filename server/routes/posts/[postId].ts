// server/routes/posts/[postId].ts
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/posts/:postId  → ดูโพสเดียว (ทุกคนดูได้)
// PATCH  /api/posts/:postId  → แก้ไขโพส (เจ้าของเท่านั้น)
// DELETE /api/posts/:postId  → ลบโพส (เจ้าของหรือ Admin)
//
// [เปลี่ยนแปลง] ลบ multer ออก เพราะไม่ได้ติดตั้งใน package.json
//   → PATCH รับ JSON body แทน
//   → รูปภาพส่งมาเป็น base64 string เช่นเดียวกับ posts/index.ts
//
// Body (JSON) สำหรับ PATCH:
//   content       string   required   เนื้อหาใหม่
//   image_base64  string   optional   รูปใหม่ (base64)
//   image_type    string   optional   MIME type ของรูปใหม่
//   remove_image  boolean  optional   true = ลบรูปเดิมออก
// ─────────────────────────────────────────────────────────────────────────────
 
import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser } from "../../lib/api";
 
const router = Router({ mergeParams: true });
 
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;
 
// ── GET /api/posts/:postId — ดูโพสเดียว ──────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
 
    const { data: post, error } = await supabase
      .from("posts")
      .select(
        `
        id, content, image_url, created_at, updated_at,
        profiles!author_id ( id, display_name ),
        likes ( count ),
        comments (
          id, content, guest_name, created_at,
          profiles!author_id ( id, display_name )
        )
        `
      )
      .eq("id", req.params.postId)
      .order("created_at", { referencedTable: "comments", ascending: true })
      .single();
 
    if (error || !post) return err(res, "ไม่พบโพสนี้", 404);
 
    return ok(res, post);
  } catch {
    return err(res, "ไม่สามารถโหลดโพสได้", 500);
  }
});
 
// ── PATCH /api/posts/:postId — แก้ไขโพส ─────────────────────────────────────
router.patch("/", async (req: Request, res: Response) => {
  try {
    const ctx = await getUser(req, res);
    if (!ctx) return err(res, "Unauthorized", 401);
    if (ctx.profile.status === "banned") return err(res, "Account ถูกระงับ", 403);
 
    const { user, supabase } = ctx;
 
    // ดึงโพสเดิมเพื่อตรวจสอบเจ้าของ
    const { data: existing, error: findErr } = await supabase
      .from("posts")
      .select("id, author_id, image_url")
      .eq("id", req.params.postId)
      .single();
 
    if (findErr || !existing) return err(res, "ไม่พบโพสนี้", 404);
    if (existing.author_id !== user.id) {
      return err(res, "Forbidden — แก้ไขได้เฉพาะโพสของตัวเองเท่านั้น", 403);
    }
 
    const content      = (req.body?.content ?? "").trim();
    const imageBase64  = req.body?.image_base64 as string | undefined; // [เปลี่ยน]
    const imageType    = req.body?.image_type   as string | undefined; // [เปลี่ยน]
    const removeImage  = req.body?.remove_image === true;              // [เปลี่ยน: boolean]
 
    if (!content || content.length < 1) return err(res, "กรุณากรอกเนื้อหาโพส", 422);
    if (content.length > 5000) return err(res, "เนื้อหาโพสยาวเกิน 5000 ตัวอักษร", 422);
 
    let newImageUrl: string | null | undefined = undefined; // undefined = ไม่เปลี่ยน
 
    // ── ลบรูปเดิม ────────────────────────────────────────────────────────────
    if (removeImage && existing.image_url) {
      const path = existing.image_url.split("/post-images/")[1];
      if (path) await supabase.storage.from("post-images").remove([path]);
      newImageUrl = null;
    }
 
    // ── Upload รูปใหม่ (base64) ───────────────────────────────────────────────
    if (imageBase64 && imageType) {
      if (!ALLOWED_TYPES.includes(imageType)) {
        return err(res, "รองรับเฉพาะ JPG, PNG, WebP เท่านั้น", 422);
      }
 
      const base64Data = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;
 
      if (base64Data.length > MAX_BASE64_LENGTH) {
        return err(res, "ขนาดรูปภาพต้องไม่เกิน 5MB", 422);
      }
 
      // ลบรูปเดิมก่อน (ถ้ามี)
      if (existing.image_url) {
        const oldPath = existing.image_url.split("/post-images/")[1];
        if (oldPath) await supabase.storage.from("post-images").remove([oldPath]);
      }
 
      const buffer   = Buffer.from(base64Data, "base64");
      const ext      = imageType.split("/")[1];
      const filePath = `${user.id}/${Date.now()}.${ext}`;
 
      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(filePath, buffer, { contentType: imageType });
 
      if (uploadErr) throw uploadErr;
 
      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);
 
      newImageUrl = urlData.publicUrl;
    }
 
    // ── อัปเดตโพส ────────────────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = { content };
    if (newImageUrl !== undefined) updatePayload.image_url = newImageUrl;
 
    const { data: updated, error } = await supabase
      .from("posts")
      .update(updatePayload)
      .eq("id", req.params.postId)
      .select(
        `id, content, image_url, created_at, updated_at,
        profiles!author_id ( id, display_name )`
      )
      .single();
 
    if (error) throw error;
 
    return ok(res, updated);
  } catch {
    return err(res, "ไม่สามารถแก้ไขโพสได้", 500);
  }
});
 
// ── DELETE /api/posts/:postId — ลบโพส ───────────────────────────────────────
router.delete("/", async (req: Request, res: Response) => {
  try {
    const ctx = await getUser(req, res);
    if (!ctx) return err(res, "Unauthorized", 401);
 
    const { user, profile, supabase } = ctx;
    const isAdmin = profile.role === "admin";
 
    const { data: existing, error: findErr } = await supabase
      .from("posts")
      .select("id, author_id, image_url")
      .eq("id", req.params.postId)
      .single();
 
    if (findErr || !existing) return err(res, "ไม่พบโพสนี้", 404);
 
    if (existing.author_id !== user.id && !isAdmin) {
      return err(res, "Forbidden — ไม่มีสิทธิ์ลบโพสนี้", 403);
    }
 
    // ลบรูปออกจาก Storage ก่อน
    if (existing.image_url) {
      const path = existing.image_url.split("/post-images/")[1];
      if (path) await supabase.storage.from("post-images").remove([path]);
    }
 
    // ลบโพส (CASCADE ลบ likes/comments ใน DB อัตโนมัติ)
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", req.params.postId);
 
    if (error) throw error;
 
    // บันทึก admin log ถ้า admin เป็นคนลบ
    if (isAdmin && existing.author_id !== user.id) {
      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "delete_post",
        target_id: req.params.postId,
      });
    }
 
    return ok(res, { deleted: true });
  } catch {
    return err(res, "ไม่สามารถลบโพสได้", 500);
  }
});
 
export default router;