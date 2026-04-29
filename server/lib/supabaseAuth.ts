// server/lib/supabaseAuth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supabase auth helper functions used by server/routes/auth.ts.
//
// Provides email/password signup/login, Google OAuth start/callback,
// session logout, and KU email validation.
//
// This file is currently in use by the auth router and is part of
// the main server authentication flow.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from "express";
import { createAdminClient, createServerClient } from "./supabase";

export interface PasswordAuthPayload {
  email: string;
  password: string;
}

export interface SignUpPayload extends PasswordAuthPayload {
  fullname: string;
  ku_id?: string;
  department?: string;
  faculty?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string | undefined;
  };
}

const KU_EMAIL_DOMAINS = ["ku.ac.th", "ku.th"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowedKUEmail(email: string) {
  const normalized = normalizeEmail(email);
  return KU_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
}

function getClientUrl() {
  return process.env.CLIENT_URL ?? "http://localhost:5173";
}

function resolveRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/feed";
  }

  return value;
}

function buildOAuthCallbackUrl(req: Request, redirectPath: string) {
  const origin = `${req.protocol}://${req.get("host")}`;
  return `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;
}

async function ensureUserRecords(userId: string, fallbackDisplayName: string) {
  const admin = createAdminClient();

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      display_name: fallbackDisplayName,
      role: "member",
      status: "active",
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }
}

export async function signUpWithEmail(
  req: Request,
  res: Response,
  payload: SignUpPayload
): Promise<AuthResult> {
  const email = normalizeEmail(payload.email);
  const password = payload.password.trim();
  const fullname = payload.fullname.trim();

  if (!email || !password || !fullname) {
    return { success: false, message: "Email, password, and full name are required." };
  }

  if (!isAllowedKUEmail(email)) {
    return { success: false, message: "Please use a KU email address." };
  }

  const supabase = createServerClient(req, res);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getClientUrl()}/feed`,
      data: {
        full_name: fullname,
        display_name: fullname,
      },
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  if (data.user) {
    try {
      await ensureUserRecords(data.user.id, fullname);
    } catch (syncError) {
      console.warn(
        "[signUpWithEmail:ensureUserRecords]",
        syncError instanceof Error ? syncError.message : String(syncError)
      );
    }
  }

  return {
    success: true,
    message:
      data.session || data.user?.email_confirmed_at
        ? "Account created successfully."
        : "Account created. Please check your email to confirm your account.",
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
        }
      : undefined,
  };
}

export async function signInWithEmailPassword(
  req: Request,
  res: Response,
  payload: PasswordAuthPayload
): Promise<AuthResult> {
  const email = normalizeEmail(payload.email);
  const password = payload.password.trim();

  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
  }

  if (!isAllowedKUEmail(email)) {
    return { success: false, message: "Please use a KU email address." };
  }

  const supabase = createServerClient(req, res);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { success: false, message: error?.message ?? "Login failed." };
  }

  const fallbackDisplayName =
    data.user.user_metadata?.full_name ||
    data.user.user_metadata?.display_name ||
    email.split("@")[0];

  await ensureUserRecords(data.user.id, fallbackDisplayName);

  return {
    success: true,
    message: "Login successful.",
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  };
}

export async function signInWithGoogle(req: Request, res: Response, redirectPath: string) {
  const supabase = createServerClient(req, res);
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildOAuthCallbackUrl(req, redirectPath),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
}

export async function exchangeOAuthCode(req: Request, res: Response, code: string) {
  const supabase = createServerClient(req, res);
  return supabase.auth.exchangeCodeForSession(code);
}

export async function signOutSession(req: Request, res: Response) {
  const supabase = createServerClient(req, res);
  return supabase.auth.signOut();
}

export function getOAuthRedirectPath(value: unknown) {
  return resolveRedirectPath(value);
}
