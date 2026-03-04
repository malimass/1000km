import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico
  if (req.method === "GET") {
    const rows = await sql`
      SELECT importo_euro, target_euro, donatori, updated_at
      FROM raccolta_fondi WHERE id = 1 LIMIT 1
    `;
    return res.json(rows[0] ?? null);
  }

  // PATCH — solo admin autenticato
  if (req.method === "PATCH") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const { importo_euro, donatori } = req.body ?? {};
    await sql`
      UPDATE raccolta_fondi
      SET importo_euro = ${importo_euro},
          donatori     = ${donatori},
          updated_at   = now()
      WHERE id = 1
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
