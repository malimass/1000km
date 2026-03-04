import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico
  if (req.method === "GET") {
    const { session_ids, runner_id } = req.query;
    const ids = session_ids
      ? (session_ids as string).split(",")
      : [new Date().toISOString().slice(0, 10)];

    const rows = runner_id
      ? await sql`
          SELECT id, lat, lng, recorded_at, session_id, runner_id
          FROM route_positions
          WHERE session_id = ANY(${ids}) AND runner_id = ${Number(runner_id)}
          ORDER BY recorded_at ASC
        `
      : await sql`
          SELECT id, lat, lng, recorded_at, session_id, runner_id
          FROM route_positions
          WHERE session_id = ANY(${ids})
          ORDER BY recorded_at ASC
        `;
    return res.json(rows);
  }

  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  // POST — aggiunge punto traccia
  if (req.method === "POST") {
    const { lat, lng, speed, accuracy, heading, session_id, runner_id = 1 } = req.body ?? {};
    if (!lat || !lng || !session_id)
      return res.status(400).json({ error: "lat, lng, session_id richiesti" });

    await sql`
      INSERT INTO route_positions (lat, lng, speed, accuracy, heading, session_id, runner_id, recorded_at)
      VALUES (${lat}, ${lng}, ${speed ?? null}, ${accuracy ?? null}, ${heading ?? null},
              ${session_id}, ${runner_id}, now())
    `;
    return res.status(201).json({ ok: true });
  }

  // DELETE — cancella traccia per sessione e runner
  if (req.method === "DELETE") {
    const { session_id, runner_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "session_id richiesto" });
    await sql`
      DELETE FROM route_positions
      WHERE session_id = ${session_id as string}
        AND runner_id  = ${Number(runner_id ?? 1)}
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
