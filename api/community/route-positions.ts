import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../_lib/db";
import { requireAuth } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico
  if (req.method === "GET") {
    const { session_id, user_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "session_id richiesto" });

    const rows = user_id
      ? await sql`
          SELECT id, user_id, display_name, activity_type, lat, lng, recorded_at, session_id
          FROM community_route_positions
          WHERE session_id = ${session_id as string} AND user_id = ${user_id as string}
          ORDER BY recorded_at ASC
        `
      : await sql`
          SELECT id, user_id, display_name, activity_type, lat, lng, recorded_at, session_id
          FROM community_route_positions
          WHERE session_id = ${session_id as string}
          ORDER BY recorded_at ASC
        `;
    return res.json(rows);
  }

  // POST — aggiunge punto (autenticato)
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const { display_name, activity_type, lat, lng, speed, accuracy, heading, session_id } =
      req.body ?? {};
    if (!lat || !lng || !session_id)
      return res.status(400).json({ error: "lat, lng, session_id richiesti" });

    await sql`
      INSERT INTO community_route_positions
        (user_id, display_name, activity_type, lat, lng, speed, accuracy, heading, session_id, recorded_at)
      VALUES
        (${auth.sub}, ${display_name ?? null}, ${activity_type ?? null},
         ${lat}, ${lng}, ${speed ?? null}, ${accuracy ?? null},
         ${heading ?? null}, ${session_id}, now())
    `;
    return res.status(201).json({ ok: true });
  }

  return res.status(405).end();
}
