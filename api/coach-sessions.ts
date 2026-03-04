import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  // GET — sessioni dell'utente (o degli atleti del coach)
  if (req.method === "GET") {
    const { user_id } = req.query;
    const targetId = (user_id as string) ?? auth.sub;

    const rows = await sql`
      SELECT * FROM coach_sessions
      WHERE user_id = ${targetId}
      ORDER BY start_time DESC
    `;
    return res.json(rows);
  }

  // POST — upsert sessione
  if (req.method === "POST") {
    const s = req.body ?? {};
    await sql`
      INSERT INTO coach_sessions
        (id, user_id, file_name, sport, start_time, duration_sec, distance_m,
         avg_speed_kmh, max_speed_kmh, avg_heart_rate, max_heart_rate,
         total_elevation_gain_m, total_elevation_loss_m, calories,
         trimp, tss, hr_zones_sec)
      VALUES
        (${s.id}, ${auth.sub}, ${s.file_name}, ${s.sport}, ${s.start_time},
         ${s.duration_sec}, ${s.distance_m ?? 0}, ${s.avg_speed_kmh ?? 0},
         ${s.max_speed_kmh ?? 0}, ${s.avg_heart_rate ?? null}, ${s.max_heart_rate ?? null},
         ${s.total_elevation_gain_m ?? 0}, ${s.total_elevation_loss_m ?? 0},
         ${s.calories ?? null}, ${s.trimp ?? null}, ${s.tss ?? null},
         ${s.hr_zones_sec ? JSON.stringify(s.hr_zones_sec) : null})
      ON CONFLICT (id) DO UPDATE
        SET file_name              = EXCLUDED.file_name,
            sport                  = EXCLUDED.sport,
            start_time             = EXCLUDED.start_time,
            duration_sec           = EXCLUDED.duration_sec,
            distance_m             = EXCLUDED.distance_m,
            avg_speed_kmh          = EXCLUDED.avg_speed_kmh,
            max_speed_kmh          = EXCLUDED.max_speed_kmh,
            avg_heart_rate         = EXCLUDED.avg_heart_rate,
            max_heart_rate         = EXCLUDED.max_heart_rate,
            total_elevation_gain_m = EXCLUDED.total_elevation_gain_m,
            total_elevation_loss_m = EXCLUDED.total_elevation_loss_m,
            calories               = EXCLUDED.calories,
            trimp                  = EXCLUDED.trimp,
            tss                    = EXCLUDED.tss,
            hr_zones_sec           = EXCLUDED.hr_zones_sec
    `;
    return res.status(201).json({ ok: true });
  }

  // DELETE — elimina sessione
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id richiesto" });
    await sql`DELETE FROM coach_sessions WHERE id = ${id as string} AND user_id = ${auth.sub}`;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
