// src/server/routes/posts/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts — สร้างโพสใหม่ (KU Member เท่านั้น)
// รับ multipart/form-data รองรับทั้ง text และ image
//
// Body (form-data):
//   content  string  required   เนื้อหา 1–5000 ตัวอักษร
//   image    File    optional   jpg/png/webp ≤5MB
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { ok, err, requireKUMember } from "../../lib/api";

const router = Router();

// ── multer: เก็บไฟล์ใน memory ก่อน upload ไป Supabase Storage ───────────────
const upload = multer({
  storage: multer.memoryStorage(), // เก็บใน buffer ไม่เขียนลง disk
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    // กรองเฉพาะ jpg, png, webp
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะ JPG, PNG, WebP เท่านั้น"));
    }
  },
});

// ── POST /api/posts — สร้างโพส ───────────────────────────────────────────────
router.post(
  "/",
  upload.single("image"), // รับ field ชื่อ "image" (optional)
  async (req: Request, res: Response) => {
    try {
      const ctx = await requireKUMember(req, res);
      if (!ctx) return; // requireKUMember จัดการ response ไปแล้ว

      const { user, supabase } = ctx;
      const content = (req.body?.content ?? "").trim();

      // Validate content
      if (!content || content.length < 1) {
        return err(res, "กรุณากรอกเนื้อหาโพส", 422);
      }
      if (content.length > 5000) {
        return err(res, "เนื้อหาโพสยาวเกิน 5000 ตัวอักษร", 422);
      }

      // ── Upload รูปภาพไป Supabase Storage ถ้ามี ──────────────────────────
      let imageUrl: string | null = null;

      if (req.file) {
        const { buffer, mimetype, originalname } = req.file;
        const ext = originalname.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`; // path ไม่ซ้ำกัน

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filePath, buffer, {
            contentType: mimetype,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // ดึง Public URL ของรูปที่ upload
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // ── บันทึกโพสลง Database ─────────────────────────────────────────────
      const { data: post, error } = await supabase
        .from("posts")
        .insert({ author_id: user.id, content, image_url: imageUrl })
        .select(
          `
          id, content, image_url, created_at, updated_at,
          profiles!author_id ( id, display_name )
          `
        )
        .single();

      if (error) throw error;

      return ok(res, post, 201);
    } catch {
      return err(res, "ไม่สามารถสร้างโพสได้", 500);
    }
  }
);

export default router;
