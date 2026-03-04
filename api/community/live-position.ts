import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../_lib/db";
import { requireAuth } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico (posizioni attive, aggiornate negli ultimi 10 minuti)
  if (req.method === "GET") {
    const rows = await sql`
      SELECT
        user_id, display_name, activity_type,
        lat, lng, speed, accuracy, heading, updated_at, is_active
      FROM community_live_position
      WHERE is_active = true
        AND updated_at > now() - interval '10 minutes'
      ORDER BY updated_at DESC
    `;
    return res.json(rows);
  }

  // POST — upsert propria posizione (autenticato)
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const { display_name, activity_type, lat, lng, speed, accuracy, heading, is_active } =
      req.body ?? {};

    await sql`
      INSERT INTO community_live_position
        (user_id, display_name, activity_type, lat, lng, speed, accuracy, heading, is_active, updated_at)
      VALUES
        (${auth.sub}, ${display_name}, ${activity_type ?? "cammino"},
         ${lat ?? null}, ${lng ?? null}, ${speed ?? null}, ${accuracy ?? null},
         ${heading ?? null}, ${is_active ?? false}, now())
      ON CONFLICT (user_id) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            activity_type = EXCLUDED.activity_type,
            lat           = EXCLUDED.lat,
            lng           = EXCLUDED.lng,
            speed         = EXCLUDED.speed,
            accuracy      = EXCLUDED.accuracy,
            heading       = EXCLUDED.heading,
            is_active     = EXCLUDED.is_active,
            updated_at    = now()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
