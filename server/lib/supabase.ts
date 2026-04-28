// src/server/lib/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helper สร้าง Supabase client สำหรับฝั่ง Express server
//
// createServerClient(req) → ใช้ใน route ทั่วไป อ่าน session จาก cookie
// createAdminClient()     → ใช้เฉพาะ admin action ที่ต้องข้าม RLS
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient as _createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

/**
 * สร้าง Supabase client โดยอ่าน/เขียน session จาก Express cookie
 * ใช้ใน route handler ทั่วไป
 */
export function createServerClient(req: Request, res: Response) {
  return _createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        // อ่าน cookie จาก Express request
        getAll: () =>
          Object.entries(req.cookies ?? {}).map(([name, value]) => ({
            name,
            value: value as string,
          })),
        // เขียน cookie กลับผ่าน Express response
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // แฮ็กสำหรับเทสบน Minikube: ปลดเกราะ Secure ออกชั่วคราว เพื่อไม่ให้ Chrome บล็อก
            res.cookie(name, value, { 
              ...options, 
              secure: false,     // <--- บังคับเป็น false
              sameSite: "lax"    // <--- ตั้งค่าให้ส่งข้ามได้ปกติ
            });
          });
        },
      },
    }
  );
}

/**
 * Supabase Admin client — ข้าม RLS ได้ทั้งหมด
 * ใช้เฉพาะ action ระดับ admin เช่น ban user
 */
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
