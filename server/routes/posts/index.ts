// server/routes/posts/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts — สร้างโพสใหม่ (KU Member เท่านั้น)
//
// [เปลี่ยนแปลง] ลบ multer ออก เพราะไม่ได้ติดตั้งใน package.json
//   → รับ JSON body แทน โดยรูปภาพส่งมาเป็น base64 string
//   → Frontend ต้อง encode รูปเป็น base64 ก่อนส่ง
//
// [เปลี่ยนแปลง] เพิ่ม notifyNewPost() หลังสร้างโพสสำเร็จ
//   → แจ้ง followers ทั้งหมด (fire-and-forget)
//
// Body (JSON):
//   content       string   required   เนื้อหา 1–5000 ตัวอักษร
//   image_base64  string   optional   รูปภาพ base64 (data:image/...;base64,...)
//   image_type    string   optional   MIME type เช่น "image/jpeg"
// ─────────────────────────────────────────────────────────────────────────────
 
import { Router } from "express";
import type { Request, Response } from "express";
import { ok, err, requireKUMember } from "../../lib/api";
import { notifyNewPost } from "../notifications/triggers"; // [ใหม่]
import { syncPostHashtags } from "../../lib/hashtag";      // [ใหม่ - search]
 
const router = Router();
 
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB ใน base64 (base64 ขนาดใหญ่ขึ้น ~33%)
 
// ── POST /api/posts — สร้างโพส ───────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;
 
    const { user, supabase } = ctx;
 
    const content      = (req.body?.content ?? "").trim();
    const title        = (req.body?.title   ?? "").trim();  // [ใหม่ - search] optional
    const imageBase64  = req.body?.image_base64 as string | undefined; // [เปลี่ยน]
    const imageType    = req.body?.image_type   as string | undefined; // [เปลี่ยน]
 
    // Validate content
    if (!content || content.length < 1) {
      return err(res, "กรุณากรอกเนื้อหาโพส", 422);
    }
    if (content.length > 5000) {
      return err(res, "เนื้อหาโพสยาวเกิน 5000 ตัวอักษร", 422);
    }
 
    // ── Upload รูปภาพ (base64 → Supabase Storage) ──────────────────────────
    let imageUrl: string | null = null;
 
    if (imageBase64 && imageType) {
      // Validate MIME type
      if (!ALLOWED_TYPES.includes(imageType)) {
        return err(res, "รองรับเฉพาะ JPG, PNG, WebP เท่านั้น", 422);
      }
 
      // แยก base64 data ออกจาก prefix เช่น "data:image/jpeg;base64,..."
      const base64Data = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;
 
      // ตรวจสอบขนาด
      if (base64Data.length > MAX_BASE64_LENGTH) {
        return err(res, "ขนาดรูปภาพต้องไม่เกิน 5MB", 422);
      }
 
      // แปลง base64 → Buffer สำหรับ upload
      const buffer = Buffer.from(base64Data, "base64");
      const ext    = imageType.split("/")[1]; // เช่น "jpeg", "png"
      const filePath = `${user.id}/${Date.now()}.${ext}`;
 
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, buffer, {
          contentType: imageType,
          upsert: false,
        });
 
      if (uploadError) throw uploadError;
 
      // ดึง Public URL ของรูป
      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);
 
      imageUrl = urlData.publicUrl;
    }
 
    // ── บันทึกโพสลง Database ─────────────────────────────────────────────────
    const { data: post, error } = await supabase
      .from("posts")
      .insert({ author_id: user.id, title: title || null, content, image_url: imageUrl }) // [เปลี่ยน - search] เพิ่ม title
      .select(
        `
        id, content, image_url, created_at, updated_at,
        profiles!author_id ( id, display_name )
        `
      )
      .single();
 
    if (error) throw error;
 
    // [ใหม่ - search] sync hashtags จาก title + content — fire-and-forget
    syncPostHashtags(supabase, post.id, title, content);
 
    // [ใหม่] แจ้ง followers ว่ามีโพสใหม่ — fire-and-forget
    notifyNewPost(supabase, post.id, user.id);
 
    return ok(res, post, 201);
  } catch {
    return err(res, "ไม่สามารถสร้างโพสได้", 500);
  }
});
 
export default router;