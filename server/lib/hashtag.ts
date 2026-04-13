// src/server/lib/hashtag.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helper จัดการ hashtag
//
// extractHashtags  → parse #tag จาก string (รองรับภาษาไทย + อังกฤษ + ตัวเลข)
// syncPostHashtags → upsert hashtags + ผูกกับ post ใน DB
//                   เรียกหลัง insert/update post เสมอ
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Parse #hashtag ออกจาก string
 * รองรับภาษาไทย + อังกฤษ + ตัวเลข + underscore
 *
 * ตัวอย่าง:
 *   extractHashtags("ใครรู้เรื่อง #ราคาหอ และ #KU69 บ้าง?")
 *   → ["ราคาหอ", "ku69"]
 */
export function extractHashtags(text: string): string[] {
  // \p{L} = ตัวอักษรทุกภาษา (Unicode), \p{N} = ตัวเลข
  const regex = /#([\p{L}\p{N}_]+)/gu;
  const tags = [...text.matchAll(regex)].map((m) => m[1].toLowerCase());
  return [...new Set(tags)]; // dedup
}

/**
 * Upsert hashtags และผูกกับ post อัตโนมัติ
 * เรียกหลัง insert หรือ update post เสมอ
 *
 * Flow:
 *   1. parse #tag จาก title + content รวมกัน
 *   2. upsert แต่ละ tag เข้า hashtags table
 *   3. ลบ post_hashtags เดิมของ post นี้ทิ้ง (handle กรณี edit แล้วลบ tag)
 *   4. insert post_hashtags ใหม่ทั้งหมด
 */
export async function syncPostHashtags(
  supabase: SupabaseClient,
  postId: string,
  title: string,
  content: string
): Promise<void> {
  const tags = extractHashtags(`${title} ${content}`);

  // ลบ post_hashtags เดิมก่อนเสมอ
  await supabase.from("post_hashtags").delete().eq("post_id", postId);

  if (tags.length === 0) return;

  const { data: upserted, error: upsertErr } = await supabase
    .from("hashtags")
    .upsert(
      tags.map((name) => ({ name })),
      { onConflict: "name" }
    )
    .select("id, name");

  if (upsertErr) throw upsertErr;
  if (!upserted || upserted.length === 0) return;

  const { error: linkErr } = await supabase.from("post_hashtags").insert(
    upserted.map((tag) => ({ post_id: postId, hashtag_id: tag.id }))
  );

  if (linkErr) throw linkErr;
}
