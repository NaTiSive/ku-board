// server/routes/profile/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Profile API mounted at /api/profile.
//
// Used by the profile page and profile editing flows.
// Currently active and provides profile details, profile posts,
// and profile update actions for the authenticated owner.
//
// GET   /api/profile/:userId         → View public profile data
// PATCH /api/profile/:userId         → Update display_name (owner only)
// PATCH /api/profile/:userId/images  → Update avatar/cover (owner only)
// GET   /api/profile/:userId/posts   → Load profile feed posts
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { ok, err, getUser, getPagination, requireKUMember } from "../../lib/api";

const router = Router();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BASE64_LENGTH = 4 * 1024 * 1024; // ~3MB raw
const MAX_COVER_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB raw

function parseBase64Payload(payload?: string) {
  if (!payload) return null;
  const base64Data = payload.includes(",") ? payload.split(",")[1] : payload;
  return base64Data || null;
}

function storagePathFromPublicUrl(url: string) {
  const path = url.split("/post-images/")[1];
  if (!path) return null;
  return path.split("?")[0] || null;
}

// ── GET /api/profile/:userId — ดู profile ────────────────────────────────────
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at, avatar_url, cover_url")
      .eq("id", userId)
      .single();

    if (error) return err(res, error.message, 500);
    if (!profile) return err(res, "ไม่พบผู้ใช้นี้", 404);

    // นับโพสทั้งหมดของ user นี้ (head: true = ไม่ดึง data จริง ประหยัด bandwidth)
    const { count: postCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId);

    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", userId),
    ]);

    return ok(res, {
      ...profile,
      post_count: postCount ?? 0,
      follower_count: followerCount ?? 0,
      following_count: followingCount ?? 0,
    });
  } catch {
    return err(res, "ไม่สามารถโหลด profile ได้", 500);
  }
});

// ── PATCH /api/profile/:userId — แก้ display_name ────────────────────────────
router.patch("/:userId", async (req: Request, res: Response) => {
  try {
    const ctx = await getUser(req, res);
    if (!ctx) return err(res, "Unauthorized", 401);

    // ห้ามแก้ profile ของคนอื่น
    if (ctx.user.id !== req.params.userId) {
      return err(res, "Forbidden — แก้ไขได้เฉพาะ account ของตัวเองเท่านั้น", 403);
    }

    const displayName = (req.body?.display_name ?? "").trim();

    // Validate: 2–50 ตัวอักษร
    if (displayName.length < 2 || displayName.length > 50) {
      return err(res, "Display name ต้องมีความยาว 2–50 ตัวอักษร", 422);
    }

    const { data, error } = await ctx.supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", req.params.userId)
      .select("id, display_name, role, status, avatar_url, cover_url")
      .single();

    if (error) throw error;

    return ok(res, data);
  } catch {
    return err(res, "ไม่สามารถอัปเดต profile ได้", 500);
  }
});

// ── GET /api/profile/:userId/posts — Profile Board ───────────────────────────
// PATCH /api/profile/:userId/images → update avatar/cover (owner only)
router.patch("/:userId/images", async (req: Request, res: Response) => {
  try {
    const ctx = await requireKUMember(req, res);
    if (!ctx) return;

    const { user, supabase } = ctx;

    if (user.id !== req.params.userId) {
      return err(res, "Forbidden — owners only", 403);
    }

    const avatarBase64 = req.body?.avatar_base64 as string | undefined;
    const avatarType = req.body?.avatar_type as string | undefined;
    const coverBase64 = req.body?.cover_base64 as string | undefined;
    const coverType = req.body?.cover_type as string | undefined;
    const removeAvatar = !!req.body?.remove_avatar;
    const removeCover = !!req.body?.remove_cover;

    if (!avatarBase64 && !coverBase64 && !removeAvatar && !removeCover) {
      return err(res, "No changes provided", 422);
    }

    if (avatarBase64 && !avatarType) return err(res, "avatar_type is required", 422);
    if (coverBase64 && !coverType) return err(res, "cover_type is required", 422);

    if (avatarType && !ALLOWED_IMAGE_TYPES.includes(avatarType)) {
      return err(res, "Only JPG, PNG, WebP are supported", 422);
    }

    if (coverType && !ALLOWED_IMAGE_TYPES.includes(coverType)) {
      return err(res, "Only JPG, PNG, WebP are supported", 422);
    }

    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("avatar_url, cover_url")
      .eq("id", user.id)
      .single();

    if (currentError || !current) {
      return err(res, "Profile not found", 404);
    }

    let nextAvatarUrl: string | null = current.avatar_url ?? null;
    let nextCoverUrl: string | null = current.cover_url ?? null;

    if (removeAvatar && current.avatar_url) {
      const oldPath = storagePathFromPublicUrl(current.avatar_url);
      if (oldPath) await supabase.storage.from("post-images").remove([oldPath]);
      nextAvatarUrl = null;
    }

    if (removeCover && current.cover_url) {
      const oldPath = storagePathFromPublicUrl(current.cover_url);
      if (oldPath) await supabase.storage.from("post-images").remove([oldPath]);
      nextCoverUrl = null;
    }

    if (avatarBase64 && avatarType) {
      const base64Data = parseBase64Payload(avatarBase64);
      if (!base64Data) return err(res, "Invalid avatar_base64", 422);
      if (base64Data.length > MAX_AVATAR_BASE64_LENGTH) {
        return err(res, "Avatar must be <= 3MB", 422);
      }

      if (current.avatar_url) {
        const oldPath = storagePathFromPublicUrl(current.avatar_url);
        if (oldPath) await supabase.storage.from("post-images").remove([oldPath]);
      }

      const buffer = Buffer.from(base64Data, "base64");
      const ext = avatarType.split("/")[1];
      const filePath = `${user.id}/profile/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, buffer, { contentType: avatarType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      nextAvatarUrl = urlData.publicUrl;
    }

    if (coverBase64 && coverType) {
      const base64Data = parseBase64Payload(coverBase64);
      if (!base64Data) return err(res, "Invalid cover_base64", 422);
      if (base64Data.length > MAX_COVER_BASE64_LENGTH) {
        return err(res, "Cover must be <= 5MB", 422);
      }

      if (current.cover_url) {
        const oldPath = storagePathFromPublicUrl(current.cover_url);
        if (oldPath) await supabase.storage.from("post-images").remove([oldPath]);
      }

      const buffer = Buffer.from(base64Data, "base64");
      const ext = coverType.split("/")[1];
      const filePath = `${user.id}/profile/cover_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, buffer, { contentType: coverType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      nextCoverUrl = urlData.publicUrl;
    }

    const updatePayload: Record<string, unknown> = {};
    if (removeAvatar || avatarBase64) updatePayload.avatar_url = nextAvatarUrl;
    if (removeCover || coverBase64) updatePayload.cover_url = nextCoverUrl;

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select("id, display_name, role, status, avatar_url, cover_url")
      .single();

    if (updateError) throw updateError;

    return ok(res, updated);
  } catch {
    return err(res, "Could not update profile images", 500);
  }
});

router.get("/:userId/posts", async (req: Request, res: Response) => {
  try {
    const supabase = createServerClient(req, res);
    const { userId } = req.params;
    const { from, to, page, limit } = getPagination(req.query);

    // ดึง profile เจ้าของหน้าก่อน
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, created_at, avatar_url, cover_url")
      .eq("id", userId)
      .single();

    if (profileError) return err(res, profileError.message, 500);
    if (!profile) return err(res, "ไม่พบผู้ใช้นี้", 404);

    // ดึงโพสทั้งหมดของ user นี้
    const { data: posts, error, count } = await supabase
      .from("posts")
      .select(
        `
        id,
        title,
        content,
        image_url,
        created_at,
        updated_at,
        likes ( count ),
        comments ( count )
        `,
        { count: "exact" }
      )
      .eq("author_id", userId) // กรองเฉพาะโพสของ user นี้
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return ok(res, { profile, posts: posts ?? [], total: count ?? 0, page, limit });
  } catch {
    return err(res, "ไม่สามารถโหลด profile board ได้", 500);
  }
});

export default router;
