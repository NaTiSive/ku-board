// server/routes/admin/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Admin-only API mounted at /api/admin.
//
// Used by the admin management UI to list users, ban/unban accounts,
// and view admin logs.
// Currently active and protected by requireAdmin.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";
import { createAdminClient } from "../../lib/supabase";
import { err, getPagination, ok, requireAdmin } from "../../lib/api";

const router = Router();

function sanitizeQuery(value: unknown) {
  return String(value ?? "").trim().slice(0, 100);
}

function sanitizeReason(value: unknown) {
  return String(value ?? "").trim().slice(0, 500);
}

function createHandle(displayName: string, id: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^[.]+|[.]+$)/g, "");

  return slug || id.slice(0, 8).toLowerCase();
}

router.get("/users", async (req: Request, res: Response) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const q = sanitizeQuery(req.query.q);
  const { from, to, page, limit } = getPagination(req.query);
  const admin = createAdminClient();

  try {
    let query = admin
      .from("profiles")
      .select("id, display_name, role, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      const like = `%${q}%`;
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
      query = uuidLike ? query.or(`display_name.ilike.${like},id.eq.${q}`) : query.ilike("display_name", like);
    }

    const { data: profiles, error, count } = await query;
    if (error) throw error;

    const ids = (profiles ?? []).map((profile) => profile.id);
    const activeBanMap = new Map<string, { reason: string | null; banned_at: string | null }>();

    if (ids.length > 0) {
      const { data: bans } = await admin
        .from("banned_users")
        .select("user_id, reason, banned_at, unbanned_at")
        .in("user_id", ids)
        .is("unbanned_at", null)
        .order("banned_at", { ascending: false });

      (bans ?? []).forEach((row) => {
        if (!activeBanMap.has(row.user_id)) {
          activeBanMap.set(row.user_id, {
            reason: row.reason ?? null,
            banned_at: row.banned_at ?? null,
          });
        }
      });
    }

    return ok(res, {
      users: (profiles ?? []).map((profile) => {
        const activeBan = activeBanMap.get(profile.id);
        const isBanned = profile.status === "banned" || Boolean(activeBan);

        return {
          id: profile.id,
          display_name: profile.display_name,
          role: profile.role,
          status: isBanned ? "banned" : (profile.status ?? "active"),
          created_at: profile.created_at,
          ban_reason: activeBan?.reason ?? null,
          banned_at: activeBan?.banned_at ?? null,
        };
      }),
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("[admin users]", e);
    return err(res, "Could not load users", 500);
  }
});

router.patch("/users/:userId/ban", async (req: Request, res: Response) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const userId = req.params.userId;
  const banned = req.body?.banned;
  const reason = sanitizeReason(req.body?.reason);

  if (typeof banned !== "boolean") {
    return err(res, "Missing banned boolean", 422);
  }
  if (banned && !reason) {
    return err(res, "Ban reason is required", 422);
  }

  const admin = createAdminClient();

  try {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ status: banned ? "banned" : "active" })
      .eq("id", userId);

    if (profileError) throw profileError;

    if (banned) {
      const { error: banInsertError } = await admin.from("banned_users").insert({
        user_id: userId,
        banned_by: ctx.user.id,
        reason,
        banned_at: new Date().toISOString(),
      });
      if (banInsertError) throw banInsertError;
    } else {
      const { error: unbanError } = await admin
        .from("banned_users")
        .update({ unbanned_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("unbanned_at", null);
      if (unbanError) throw unbanError;
    }

    await admin.from("admin_logs").insert({
      admin_id: ctx.user.id,
      action_type: banned ? "ban_user" : "unban_user",
      target_id: userId,
      reason: reason || null,
    });

    return ok(res, { user_id: userId, banned, reason: reason || null });
  } catch (e) {
    console.error("[admin ban]", e);
    return err(res, "Could not update user status", 500);
  }
});

router.get("/logs", async (req: Request, res: Response) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const { from, to, page, limit } = getPagination(req.query);
  const admin = createAdminClient();

  try {
    const { data: logs, error, count } = await admin
      .from("admin_logs")
      .select(
        `
        id,
        action_type,
        target_id,
        reason,
        created_at,
        profiles!admin_id (
          id,
          display_name
        )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const targetIds = Array.from(
      new Set(
        (logs ?? [])
          .filter((log: any) => log.action_type === "ban_user" || log.action_type === "unban_user")
          .map((log: any) => log.target_id)
          .filter(Boolean)
      )
    );

    const targetHandleMap = new Map<string, string>();

    if (targetIds.length > 0) {
      const { data: targetProfiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", targetIds);

      (targetProfiles ?? []).forEach((profile) => {
        targetHandleMap.set(profile.id, `@${createHandle(profile.display_name, profile.id)}`);
      });
    }

    return ok(res, {
      logs: (logs ?? []).map((log: any) => ({
        id: log.id,
        action_type: log.action_type,
        target_id: log.target_id,
        target_handle: targetHandleMap.get(log.target_id) ?? null,
        reason: log.reason ?? null,
        created_at: log.created_at,
        admin_name: log.profiles?.display_name ?? "Admin",
      })),
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("[admin logs]", e);
    return err(res, "Could not load admin logs", 500);
  }
});

export default router;
