import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico (entrambi i runner)
  if (req.method === "GET") {
    const { runner_id } = req.query;
    const rows = runner_id
      ? await sql`SELECT * FROM live_position WHERE id = ${Number(runner_id)} LIMIT 1`
      : await sql`SELECT * FROM live_position WHERE id IN (1,2)`;
    if (runner_id) return res.json(rows[0] ?? null);
    const result: Record<number, any> = { 1: null, 2: null };
    for (const r of rows as any[]) result[r.id] = r;
    return res.json(result);
  }

  // POST — upsert posizione (autenticato)
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const { runner_id = 1, lat, lng, speed, accuracy, heading, is_active } = req.body ?? {};
    await sql`
      INSERT INTO live_position (id, lat, lng, speed, accuracy, heading, is_active, updated_at)
      VALUES (${runner_id}, ${lat}, ${lng}, ${speed ?? null}, ${accuracy ?? null},
              ${heading ?? null}, ${is_active ?? false}, now())
      ON CONFLICT (id) DO UPDATE
        SET lat        = EXCLUDED.lat,
            lng        = EXCLUDED.lng,
            speed      = EXCLUDED.speed,
            accuracy   = EXCLUDED.accuracy,
            heading    = EXCLUDED.heading,
            is_active  = EXCLUDED.is_active,
            updated_at = now()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
