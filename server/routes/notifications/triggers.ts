// server/routes/notifications/triggers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helper functions สำหรับสร้าง notification หลังจาก action ต่างๆ เกิดขึ้น
//
// เรียกใช้จาก route handler อื่น เช่น:
//   - likes.ts     → หลัง toggle like สำเร็จ
//   - comments.ts  → หลัง insert comment สำเร็จ
//   - follows/index.ts → หลัง follow สำเร็จ
//   - posts/index.ts   → หลัง create post สำเร็จ (แจ้ง followers)
//
// ทุก function เป็น fire-and-forget (ไม่ await ใน route handler)
// เพื่อไม่ให้ทำให้ response ช้า แม้ notification จะ fail ก็ไม่กระทบ user
// ─────────────────────────────────────────────────────────────────────────────
 
import { SupabaseClient } from "@supabase/supabase-js";

type NotificationInsert = {
  recipientId: string;
  actorId: string | null;
  type: string;
  postId?: string | null;
  body?: string | null;
};

async function insertNotification(
  supabase: SupabaseClient,
  { recipientId, actorId, type, postId = null, body = null }: NotificationInsert
): Promise<void> {
  // Centralize raw notification inserts so every trigger writes the same schema
  // รวมรูปแบบ insert ไว้จุดเดียว เผื่อ schema notifications เปลี่ยนภายหลัง
  const { error } = await supabase.from("notifications").insert({
    recipient_id: recipientId,
    actor_id: actorId,
    type,
    post_id: postId,
    body,
    is_read: false,
  });

  if (error) throw error;
}
 
// ─── Like Notification ────────────────────────────────────────────────────────
 
/**
 * แจ้งเตือนเจ้าของโพสเมื่อมีคนกด like
 * ไม่แจ้งถ้า: liker เป็นเจ้าของโพสเอง
 *
 * @param supabase  Supabase client (server-side)
 * @param postId    โพสที่ถูก like
 * @param likerId   user ที่กด like
 */
export async function notifyLike(
  supabase: SupabaseClient,
  postId: string,
  likerId: string
): Promise<void> {
  try {
    // ดึง author ของโพสที่ถูก like
    const { data: post } = await supabase
      .from("posts")
      .select("author_id, content, title")
      .eq("id", postId)
      .single();
 
    if (!post) return;
 
    // ไม่แจ้งตัวเอง
    if (post.author_id === likerId) return;
 
    const postPreview = (post.title || post.content || "").trim().slice(0, 80);
    await insertNotification(supabase, {
      recipientId: post.author_id,
      actorId: likerId,
      type: "like",
      postId,
      body: postPreview || null,
    });
  } catch (e) {
    // notification fail ไม่กระทบ main action
    console.error("[notifyLike]", e);
  }
}
 
// ─── Comment Notification ─────────────────────────────────────────────────────
 
/**
 * แจ้งเตือน 2 กลุ่มเมื่อมีคอมเมนต์ใหม่:
 * 1. เจ้าของโพส (type: 'comment')
 * 2. คนที่เคย like หรือ comment โพสเดียวกัน (type: 'post_activity')
 *    — ยกเว้นคนที่เพิ่งคอมเมนต์ และเจ้าของโพส (รับแจ้งจากกลุ่ม 1 แล้ว)
 *
 * @param supabase    Supabase client
 * @param postId      โพสที่ถูกคอมเมนต์
 * @param commenterId user ที่คอมเมนต์ (null = Guest)
 * @param commentBody preview ข้อความคอมเมนต์ (100 ตัวแรก)
 */
export async function notifyComment(
  supabase: SupabaseClient,
  postId: string,
  commenterId: string | null,
  commentBody: string
): Promise<void> {
  // Old RLS behavior: guest / incognito comments do not create notifications
  if (!commenterId) return; // Guest / incognito comment ไม่ trigger notification

  try {
    // ดึงข้อมูลโพส
    const { data: post } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();
 
    if (!post) return;
 
    const preview = commentBody.trim().slice(0, 100); // preview 100 ตัวแรก
 
    // 1. แจ้งเจ้าของโพส
    if (post.author_id !== commenterId) {
      await insertNotification(supabase, {
        recipientId: post.author_id,
        actorId: commenterId,
        type: "comment",
        postId,
        body: preview || null,
      });
    }
 
    // 2. รวบรวม user ที่เคย interact กับโพสนี้ (like + comment)
    const [{ data: likers }, { data: commenters }] = await Promise.all([
      supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", postId),
      supabase
        .from("comments")
        .select("author_id")
        .eq("post_id", postId)
        .not("author_id", "is", null),
    ]);
 
    // รวม user ids และกรองออก: ตัวคอมเมนต์เอง + เจ้าของโพส (รับแล้ว)
    const interactedIds = new Set([
      ...(likers ?? []).map((l) => l.user_id),
      ...(commenters ?? []).map((c) => c.author_id),
    ]);
    interactedIds.delete(commenterId);
    interactedIds.delete(post.author_id);
 
    // แจ้ง post_activity ให้ทุกคนที่ interact ไว้
    const notifyPromises = [...interactedIds].map((uid) =>
      insertNotification(supabase, {
        recipientId: uid,
        actorId: commenterId,
        type: "post_activity",
        postId,
        body: preview || null,
      })
    );
    await Promise.allSettled(notifyPromises); // allSettled = ไม่ throw ถ้าบางอันล้มเหลว
  } catch (e) {
    console.error("[notifyComment]", e);
  }
}
 
// ─── Follow Notification ──────────────────────────────────────────────────────
 
/**
 * แจ้งเตือน user ที่ถูกติดตาม
 *
 * @param supabase     Supabase client
 * @param followerId   user ที่กดติดตาม
 * @param followingId  user ที่ถูกติดตาม
 */
export async function notifyFollow(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string
): Promise<void> {
  try {
    await insertNotification(supabase, {
      recipientId: followingId,
      actorId: followerId,
      type: "follow",
    });
  } catch (e) {
    console.error("[notifyFollow]", e);
  }
}
 
// ─── New Post Notification ────────────────────────────────────────────────────
 
/**
 * แจ้งเตือน followers ทั้งหมดของผู้โพสว่ามีโพสใหม่
 * ทำงานแบบ batch เพื่อรองรับ followers จำนวนมาก
 *
 * @param supabase   Supabase client
 * @param postId     โพสใหม่
 * @param authorId   เจ้าของโพส
 */
export async function notifyNewPost(
  supabase: SupabaseClient,
  postId: string,
  authorId: string
): Promise<void> {
  try {
    // ดึง followers ทั้งหมดของ author
    const { data: followers } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", authorId);
 
    if (!followers || followers.length === 0) return;
 
    // แจ้งทุก follower พร้อมกัน (allSettled = ไม่หยุดถ้าบางอันล้มเหลว)
    const promises = followers.map((f) =>
      insertNotification(supabase, {
        recipientId: f.follower_id,
        actorId: authorId,
        type: "new_post",
        postId,
      })
    );
    await Promise.allSettled(promises);
  } catch (e) {
    console.error("[notifyNewPost]", e);
  }
}

export async function notifyAdminDeletedPost(
  supabase: SupabaseClient,
  adminId: string,
  recipientId: string,
  reason: string
): Promise<void> {
  try {
    await insertNotification(supabase, {
      recipientId,
      actorId: adminId,
      type: "admin_delete_post",
      body: reason.trim().slice(0, 500) || null,
    });
  } catch (e) {
    console.error("[notifyAdminDeletedPost]", e);
  }
}
