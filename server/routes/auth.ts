import { Router } from "express";
import { createServerClient } from "../lib/supabase";

const router = Router();

router.get("/google", async (req, res) => {
  const supabase = createServerClient(req, res);
  const origin = `${req.protocol}://${req.get("host")}`;
  const redirectPath = typeof req.query.redirect === "string" ? req.query.redirect : "/feed";
  const callbackUrl = `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

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

  const supabase = createServerClient(req, res);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    res.status(500).send("OAuth exchange failed");
    return;
  }

  const redirectPath = typeof req.query.redirect === "string" ? req.query.redirect : "/feed";
  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
  res.redirect(`${clientUrl}${redirectPath}`);
});

export default router;
