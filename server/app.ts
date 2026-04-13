// server/app.ts
// ─────────────────────────────────────────────────────────────────────────────
// Express app หลัก — เชื่อม middleware และ router ทั้งหมดเข้าด้วยกัน
//
// [เปลี่ยนแปลง] เพิ่ม mount routes ใหม่:
//   - /api/follows       → ระบบติดตาม
//   - /api/notifications → ระบบแจ้งเตือน
// ─────────────────────────────────────────────────────────────────────────────
 
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
 
// ── Import Routers (เดิม) ────────────────────────────────────────────────────
import boardRouter    from "./routes/board/index";
import profileRouter  from "./routes/profile/index";
import postsRouter    from "./routes/posts/index";
import postRouter     from "./routes/posts/[postId]";
import likesRouter    from "./routes/posts/likes";
import commentsRouter from "./routes/posts/comments";
import sharesRouter   from "./routes/posts/shares";
import authRouter     from "./routes/auth";
 
// ── Import Routers (ใหม่) ────────────────────────────────────────────────────
import followsRouter        from "./routes/follows/index";        // [ใหม่]
import notificationsRouter  from "./routes/notifications/index";  // [ใหม่]
 
const app = express();
 
// ── Global Middleware ─────────────────────────────────────────────────────────
 
// CORS — อนุญาต request จาก Vite dev server
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true, // สำคัญ: ต้อง true เพื่อให้ cookie ส่งข้ามได้
  })
);
 
// แปลง JSON body อัตโนมัติ
app.use(express.json({ limit: "10mb" })); // [เปลี่ยน] เพิ่ม limit รองรับ base64 image
 
// แปลง URL-encoded body
app.use(express.urlencoded({ extended: true }));
 
// อ่าน cookie จาก request (Supabase session ส่งมาทาง cookie)
app.use(cookieParser());
 
// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
 
// ── Routes (เดิม) ────────────────────────────────────────────────────────────
app.use("/api/board",   boardRouter);
app.use("/api/auth",    authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/posts",   postsRouter);
 
app.use("/api/posts/:postId",           postRouter);
app.use("/api/posts/:postId/likes",     likesRouter);
app.use("/api/posts/:postId/comments",  commentsRouter);
app.use("/api/posts/:postId/shares",    sharesRouter);
 
// ── Routes (ใหม่) ────────────────────────────────────────────────────────────
app.use("/api/follows",       followsRouter);       // [ใหม่]
app.use("/api/notifications", notificationsRouter); // [ใหม่]
 
// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});
 
// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ success: false, error: "Internal server error" });
});
 
export default app;