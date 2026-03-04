import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  if (req.method === "GET") {
    const rows = await sql`
      SELECT data FROM admin_settings WHERE user_id = ${auth.sub} LIMIT 1
    `;
    return res.json(rows[0]?.data ?? {});
  }

  if (req.method === "POST") {
    await sql`
      INSERT INTO admin_settings (user_id, data, updated_at)
      VALUES (${auth.sub}, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (user_id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
