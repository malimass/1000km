import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM servizi_page WHERE id = 1 LIMIT 1`;
    return res.json(rows[0]?.data ?? { sections: [] });
  }

  // POST — solo autenticato
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    await sql`
      INSERT INTO servizi_page (id, data, updated_at)
      VALUES (1, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
