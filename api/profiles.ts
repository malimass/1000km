import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico, per user_id o lista coach
  if (req.method === "GET") {
    const { id, role } = req.query;
    if (id) {
      const rows = await sql`
        SELECT id, display_name, activity_type, city FROM profiles WHERE id = ${id as string} LIMIT 1
      `;
      return res.json(rows[0] ?? null);
    }
    if (role) {
      const rows = await sql`
        SELECT id, display_name FROM profiles WHERE role = ${role as string} ORDER BY display_name
      `;
      return res.json(rows);
    }
    return res.status(400).json({ error: "id o role richiesto" });
  }

  // POST — upsert profilo proprio
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const { display_name, activity_type, city } = req.body ?? {};
    await sql`
      INSERT INTO profiles (id, display_name, activity_type, city, updated_at)
      VALUES (${auth.sub}, ${display_name}, ${activity_type ?? "cammino"}, ${city ?? null}, now())
      ON CONFLICT (id) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            activity_type = EXCLUDED.activity_type,
            city          = EXCLUDED.city,
            updated_at    = now()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
