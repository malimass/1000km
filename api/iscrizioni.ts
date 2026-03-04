import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — solo autenticato (admin vede tutte le iscrizioni)
  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const rows = await sql`
      SELECT * FROM iscrizioni ORDER BY created_at DESC
    `;
    return res.json(rows);
  }

  // POST — pubblico (chiunque può iscriversi)
  if (req.method === "POST") {
    const {
      tappa_numero, nome, cognome, email, telefono,
      vuole_maglia, taglia_maglia, donazione_euro,
      pagamento_stato, stripe_session_id,
    } = req.body ?? {};

    if (!tappa_numero || !nome || !cognome || !email)
      return res.status(400).json({ error: "tappa_numero, nome, cognome, email richiesti" });

    const rows = await sql`
      INSERT INTO iscrizioni
        (tappa_numero, nome, cognome, email, telefono, vuole_maglia, taglia_maglia,
         donazione_euro, pagamento_stato, stripe_session_id)
      VALUES
        (${tappa_numero}, ${nome}, ${cognome}, ${email}, ${telefono ?? null},
         ${vuole_maglia ?? false}, ${taglia_maglia ?? null},
         ${donazione_euro ?? 0}, ${pagamento_stato ?? "gratuito"},
         ${stripe_session_id ?? null})
      RETURNING id
    `;
    return res.status(201).json({ id: (rows[0] as any).id });
  }

  // PATCH — aggiorna stato pagamento (autenticato)
  if (req.method === "PATCH") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });

    const { id, pagamento_stato, stripe_session_id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id richiesto" });

    await sql`
      UPDATE iscrizioni
      SET pagamento_stato   = COALESCE(${pagamento_stato ?? null}, pagamento_stato),
          stripe_session_id = COALESCE(${stripe_session_id ?? null}, stripe_session_id)
      WHERE id = ${id}
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
