// src/server/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Entry point ของ Express server
// รัน: npx ts-node src/server/index.ts
//  หรือ: npm run dev:server (ถ้าตั้ง script ไว้ใน package.json)
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config"; // โหลด .env ก่อนทุกอย่าง
import app from "./app";

const PORT = process.env.PORT ?? 3001; // Vite ใช้ 5173, Express ใช้ 3001

app.listen(PORT, () => {
  console.log(`[KUBoard Server] running on http://localhost:${PORT}`);
  console.log(`[KUBoard Server] client origin: ${process.env.CLIENT_URL ?? "http://localhost:5173"}`);
});
