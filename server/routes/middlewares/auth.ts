// src/server/middleware/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Middleware ตรวจสอบ role และสิทธิ์การใช้งาน
//
// validateKUEmail  → ตรวจว่า email ลงท้าย @ku.th
// requireRole      → ตรวจ role จาก user_roles table (guest / ku_member / admin)
// requireKUMember  → shorthand สำหรับ route ที่ต้องการ ku_member ขึ้นไป
// requireAdmin     → shorthand สำหรับ route ที่ต้องการ admin เท่านั้น
// attachUser       → แนบ user + role เข้า req โดยไม่ block (ใช้กับ guest-accessible routes)
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { createServerClient } from "../../lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "guest" | "ku_member" | "admin";

// ขยาย Express Request ให้มี user และ role
declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        email: string;
        role: UserRole;
        isBanned: boolean;
      };
    }
  }
}

const ROLE_RANK: Record<UserRole, number> = {
  guest: 0,
  ku_member: 1,
  admin: 2,
};

// ── Helper: ดึง role จาก Supabase ────────────────────────────────────────────

async function fetchUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ role: UserRole; isBanned: boolean }> {
  const { data } = await supabase
    .from("user_roles")
    .select("role, is_banned")
    .eq("user_id", userId)
    .single();

  if (!data) return { role: "ku_member", isBanned: false }; // default ถ้ายังไม่มี row

  return {
    role: data.role as UserRole,
    isBanned: data.is_banned ?? false,
  };
}

// ── Middleware: แนบ user เข้า req (ไม่ block ถ้าไม่มี session) ───────────────

/**
 * แนบข้อมูล user เข้า req.currentUser ถ้า login อยู่
 * ถ้าไม่ได้ login → req.currentUser = undefined (ไม่ block)
 * ใช้กับ route ที่ guest เข้าได้ เช่น GET /posts
 * ถ้าไม่มี user หรือ email ไม่ใช่ @ku.th → ไม่แนบ currentUser (Guest mode)
 */
export async function attachUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const supabase = createServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email?.endsWith("@ku.th")) {
    const { role, isBanned } = await fetchUserRole(supabase, user.id);
    req.currentUser = {
      id: user.id,
      email: user.email,
      role,
      isBanned,
    };
  }

  next();
}

// ── Middleware: ตรวจ role ขั้นต่ำ ────────────────────────────────────────────

/**
 * ตรวจสอบว่า user มี role เพียงพอสำหรับ route นั้น
 * ถ้าไม่ได้ login → ถือเป็น guest (role rank = 0)
 *
 * ใช้แบบ:
 *   router.post("/posts", requireRole("ku_member"), createPost)
 *   router.delete("/posts/:id", requireRole("admin"), deletePost)
 */
export function requireRole(minRole: UserRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const supabase = createServerClient(req, res);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ไม่ได้ login → guest
    if (!user) {
      if (ROLE_RANK["guest"] >= ROLE_RANK[minRole]) return next();
      res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบ" });
      return;
    }

    // ตรวจ @ku.th
    if (!user.email?.endsWith("@ku.th")) {
      await supabase.auth.signOut();
      res.status(403).json({
        success: false,
        error: "เฉพาะนิสิต KU (@ku.th) เท่านั้นที่ใช้งานได้",
      });
      return;
    }

    // ดึง role + ตรวจแบน
    const { role, isBanned } = await fetchUserRole(supabase, user.id);

    if (isBanned) {
      res.status(403).json({
        success: false,
        error: "บัญชีของคุณถูกระงับการใช้งาน",
      });
      return;
    }

    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      res.status(403).json({
        success: false,
        error: `ต้องการสิทธิ์ ${minRole} ขึ้นไปจึงจะใช้งานได้`,
        currentRole: role,
      });
      return;
    }

    // แนบ user เข้า req เพื่อใช้ใน handler
    req.currentUser = { id: user.id, email: user.email, role, isBanned };
    next();
  };
}

// ── Shorthand middleware ──────────────────────────────────────────────────────

/**
 * ใช้กับ route ที่ต้องการ KU Member ขึ้นไป
 * เช่น สร้างโพส, กดไลค์, แสดงความคิดเห็นแบบ logged-in
 */
export const requireKUMember = requireRole("ku_member");

/**
 * ใช้กับ route ที่ Admin เท่านั้น
 * เช่น ลบโพส, แบน user
 */
export const requireAdmin = requireRole("admin");