// server/routes/middlewares/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Authentication/authorization middleware helpers.
//
// Provides request user attachment and role-based route guards.
// Currently used by server routes that require KU member or admin access.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextFunction, Request, Response } from "express";
import { createServerClient } from "../../lib/supabase";
import { isAllowedKUEmail } from "../../lib/supabaseAuth";

export type UserRole = "guest" | "member" | "admin";

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
  member: 1,
  admin: 2,
};

async function fetchUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ role: UserRole; isBanned: boolean }> {
  const { data } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .single();

  if (!data) {
    return { role: "member", isBanned: false };
  }

  return {
    role: data.role === "admin" ? "admin" : "member",
    isBanned: data.status === "banned",
  };
}

export async function attachUser(req: Request, res: Response, next: NextFunction) {
  const supabase = createServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email && isAllowedKUEmail(user.email)) {
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

export function requireRole(minRole: UserRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const supabase = createServerClient(req, res);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (ROLE_RANK.guest >= ROLE_RANK[minRole]) {
        next();
        return;
      }

      res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบ" });
      return;
    }

    if (!user.email || !isAllowedKUEmail(user.email)) {
      await supabase.auth.signOut();
      res.status(403).json({
        success: false,
        error: "เฉพาะบัญชีอีเมล KU เท่านั้นที่ใช้งานได้",
      });
      return;
    }

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

    req.currentUser = {
      id: user.id,
      email: user.email,
      role,
      isBanned,
    };

    next();
  };
}

export const requireKUMember = requireRole("member");
export const requireAdmin = requireRole("admin");
