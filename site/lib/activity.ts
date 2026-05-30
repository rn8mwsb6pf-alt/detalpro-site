// lib/activity.ts — Журнал действий пользователей
import { sql } from './db';

export interface ActivityEntry {
  userId?:    string | null;
  userEmail?: string | null;
  userRole?:  string | null;
  action:     string;
  details?:   Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO activity_logs
        (user_id, user_email, user_role, action, details, ip_address)
      VALUES (
        ${entry.userId ? parseInt(entry.userId) : null},
        ${entry.userEmail ?? null},
        ${entry.userRole  ?? null},
        ${entry.action},
        ${sql.json((entry.details ?? {}) as any)},
        ${entry.ipAddress ?? null}
      )
    `;
  } catch {
    // Никогда не падаем из-за логирования
  }
}
