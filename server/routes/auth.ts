// server/routes/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Authentication routes mounted at /api/auth.
//
// Used by the client login/signup page and Google OAuth flow.
// Currently active and exported as the auth router for the app.
//
// POST  /api/auth/signup   → Register with KU email/password
// POST  /api/auth/login    → Login with KU email/password
// GET   /api/auth/google   → Start Google OAuth
// GET   /api/auth/callback → Complete Google OAuth
// POST  /api/auth/logout   → Sign out current session
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { err, ok } from "../lib/api";
import {
  exchangeOAuthCode,
  getOAuthRedirectPath,
  signInWithEmailPassword,
  signInWithGoogle,
  signOutSession,
  signUpWithEmail,
} from "../lib/supabaseAuth";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const result = await signUpWithEmail(req, res, req.body ?? {});
    if (!result.success) {
      console.warn("[auth signup rejected]", {
        email: typeof req.body?.email === "string" ? req.body.email : null,
        message: result.message ?? "Sign up failed",
      });
      err(res, result.message ?? "Sign up failed", 400);
      return;
    }

    ok(
      res,
      {
        message: result.message,
        user: result.user,
      },
      201
    );
  } catch (error) {
    console.error("[auth signup]", error);
    err(res, error instanceof Error ? error.message : "Sign up failed", 500);
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await signInWithEmailPassword(req, res, req.body ?? {});
    if (!result.success) {
      err(res, result.message ?? "Login failed", 400);
      return;
    }

    ok(res, {
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    err(res, error instanceof Error ? error.message : "Login failed", 500);
  }
});

router.get("/google", async (req, res) => {
  const redirectPath = getOAuthRedirectPath(req.query.redirect);
  const { data, error } = await signInWithGoogle(req, res, redirectPath);

  if (error || !data?.url) {
    res.status(500).json({ success: false, error: error?.message ?? "OAuth start failed" });
    return;
  }

  res.redirect(data.url);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code || typeof code !== "string") {
    res.status(400).send("Missing OAuth code");
    return;
  }

  const { error } = await exchangeOAuthCode(req, res, code);

  if (error) {
    res.status(500).send("OAuth exchange failed");
    return;
  }

  const redirectPath = getOAuthRedirectPath(req.query.redirect);
  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
  res.redirect(`${clientUrl}${redirectPath}`);
});

router.post("/logout", async (req, res) => {
  const { error } = await signOutSession(req, res);

  if (error) {
    err(res, error.message, 500);
    return;
  }

  ok(res, { message: "Logged out." });
});

export default router;
