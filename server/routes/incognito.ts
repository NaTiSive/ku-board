// src/server/middleware/incognito.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helper จัดการ Incognito Mode
//
// generateAlias   → สร้าง alias จาก user_id (deterministic, ไม่ reversible)
// maskAuthor      → ซ่อน author identity จาก post/comment object
// maskAuthorList  → ใช้กับ array (เรียกก่อน res.json ใน route handler)
// ─────────────────────────────────────────────────────────────────────────────

import * as crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthorableItem {
  is_incognito: boolean;
  author_id: string | null;
  author?: { name: string; avatar_url: string | null } | null;
  // field นี้ select มาจาก DB (server-side เท่านั้น) แล้วลบก่อนส่ง client
  _real_author_id?: string;
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * สร้าง alias ที่ stable แต่ไม่สามารถ reverse ได้
 * เช่น "Anonymous_a3f91c"
 *
 * - ใช้ HMAC-SHA256 + INCOGNITO_SALT (เก็บใน .env เท่านั้น)
 * - user เดิม → alias เดิมเสมอ (consistent per board)
 */
export function generateAlias(userId: string): string {
  const salt = process.env.INCOGNITO_SALT;
  if (!salt) throw new Error("INCOGNITO_SALT is not set in environment");

  const hash = crypto
    .createHmac("sha256", salt)
    .update(userId)
    .digest("hex")
    .slice(0, 6);

  return `Anonymous_${hash}`;
}

/**
 * ซ่อน author identity ของ item ที่ is_incognito = true
 * Admin จะเห็น real identity → ส่ง requesterRole = 'admin' เพื่อข้าม mask
 */
export function maskAuthor<T extends AuthorableItem>(
  item: T,
  requesterRole: string
): Omit<T, "_real_author_id"> {
  const { _real_author_id, ...safeItem } = item;

  if (!item.is_incognito) return safeItem as Omit<T, "_real_author_id">;

  // Admin เห็น real identity เสมอ (เพื่อใช้แบน)
  if (requesterRole === "admin") return safeItem as Omit<T, "_real_author_id">;

  // Mask สำหรับ user ทั่วไปและ guest
  return {
    ...safeItem,
    author_id: null,
    author: {
      name: generateAlias(_real_author_id ?? item.author_id ?? "unknown"),
      avatar_url: null,
    },
  } as Omit<T, "_real_author_id">;
}

/**
 * ใช้กับ array ของ posts หรือ comments
 * เรียกก่อน res.json() ใน route handler
 *
 * ตัวอย่าง:
 *   const masked = maskAuthorList(posts, req.currentUser?.role ?? "guest");
 *   res.json({ success: true, data: masked });
 */
export function maskAuthorList<T extends AuthorableItem>(
  items: T[],
  requesterRole: string
): Omit<T, "_real_author_id">[] {
  return items.map((item) => maskAuthor(item, requesterRole));
}