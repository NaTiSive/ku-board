// server/routes/posts/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts — Create a new post (KU Member only).
//
// Currently active and used by the post creation flow in the client.
// It uploads an optional base64 image to Supabase storage, inserts the post,
// syncs hashtags, and notifies followers.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { ok, err, requireKUMember } from "../../lib/api";
import { notifyNewPost } from "../notifications/triggers";
import { syncPostHashtags } from "../../lib/hashtag";

const router = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

router.post("/", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;

    const { user, supabase } = ctx;

    const content = (req.body?.content ?? "").trim();
    const title = (req.body?.title ?? "").trim();
    const imageBase64 = req.body?.image_base64 as string | undefined;
    const imageType = req.body?.image_type as string | undefined;

    if (!content || content.length < 1) {
      return err(res, "กรุณากรอกเนื้อหาโพส", 422);
    }
    if (content.length > 5000) {
      return err(res, "เนื้อหาโพสยาวเกิน 5000 ตัวอักษร", 422);
    }

    let imageUrl: string | null = null;

    if (imageBase64 && imageType) {
      if (!ALLOWED_TYPES.includes(imageType)) {
        return err(res, "รองรับเฉพาะ JPG, PNG, WebP เท่านั้น", 422);
      }

      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      if (base64Data.length > MAX_BASE64_LENGTH) {
        return err(res, "ขนาดรูปภาพต้องไม่เกิน 5MB", 422);
      }

      const buffer = Buffer.from(base64Data, "base64");
      const ext = imageType.split("/")[1];
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, buffer, {
        contentType: imageType,
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert({ author_id: user.id, title: title || null, content, image_url: imageUrl })
      .select(
        `
        id, content, image_url, created_at, updated_at,
        profiles!author_id ( id, display_name )
        `,
      )
      .single();

    if (error) throw error;

    await syncPostHashtags(supabase, post.id, title, content);
    void notifyNewPost(supabase, post.id, user.id);

    return ok(res, post, 201);
  } catch (error) {
    const normalizedError =
      error && typeof error === "object"
        ? {
            message: "message" in error ? (error as { message?: unknown }).message : null,
            code: "code" in error ? (error as { code?: unknown }).code : null,
            details: "details" in error ? (error as { details?: unknown }).details : null,
            hint: "hint" in error ? (error as { hint?: unknown }).hint : null,
            name: "name" in error ? (error as { name?: unknown }).name : null,
            raw: error,
          }
        : {
            message: String(error),
            code: null,
            details: null,
            hint: null,
            name: null,
            raw: error,
          };
    console.error("[POST /api/posts]", {
      error: normalizedError,
      title: typeof req.body?.title === "string" ? req.body.title.slice(0, 120) : null,
      hasImage: Boolean(req.body?.image_base64),
      imageType: req.body?.image_type ?? null,
      contentLength: typeof req.body?.content === "string" ? req.body.content.length : 0,
    });
    return err(res, "ไม่สามารถสร้างโพสได้", 500);
  }
});

export default router;
