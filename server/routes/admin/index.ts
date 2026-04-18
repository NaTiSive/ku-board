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
    const roleMap = new Map<string, { role?: string; is_banned?: boolean }>();

    if (ids.length > 0) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role, is_banned")
        .in("user_id", ids);

      (roles ?? []).forEach((row) => {
        roleMap.set(row.user_id, { role: row.role, is_banned: row.is_banned });
      });
    }

    return ok(res, {
      users: (profiles ?? []).map((profile) => {
        const roleRecord = roleMap.get(profile.id);
        const isBanned = profile.status === "banned" || roleRecord?.is_banned === true;

        return {
          id: profile.id,
          display_name: profile.display_name,
          role: profile.role,
          status: isBanned ? "banned" : (profile.status ?? "active"),
          created_at: profile.created_at,
          user_role: roleRecord?.role ?? null,
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

  if (typeof banned !== "boolean") {
    return err(res, "Missing banned boolean", 422);
  }

  const admin = createAdminClient();

  try {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ status: banned ? "banned" : "active" })
      .eq("id", userId);

    if (profileError) throw profileError;

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleRow) {
      const { error: roleError } = await admin
        .from("user_roles")
        .update({ is_banned: banned })
        .eq("user_id", userId);
      if (roleError) throw roleError;
    } else {
      const { error: insertRoleError } = await admin.from("user_roles").insert({
        user_id: userId,
        role: "ku_member",
        is_banned: banned,
      });
      if (insertRoleError) throw insertRoleError;
    }

    await admin.from("admin_logs").insert({
      admin_id: ctx.user.id,
      action_type: banned ? "ban_user" : "unban_user",
      target_id: userId,
    });

    return ok(res, { user_id: userId, banned });
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

    return ok(res, {
      logs: (logs ?? []).map((log: any) => ({
        id: log.id,
        action_type: log.action_type,
        target_id: log.target_id,
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
