import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — pubblico, solo notizie pubblicate
  if (req.method === "GET") {
    const { all } = req.query;
    const auth = all ? await requireAuth(req) : null;
    const showAll = !!auth; // admin vede anche non pubblicate

    const rows = showAll
      ? await sql`SELECT * FROM notizie ORDER BY created_at DESC LIMIT 100`
      : await sql`SELECT * FROM notizie WHERE pubblicata = true ORDER BY created_at DESC LIMIT 30`;
    return res.json(rows);
  }

  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  // POST — crea nuova notizia
  if (req.method === "POST") {
    const { titolo, corpo, immagine_url, categoria, tappa_num, pubblicata } = req.body ?? {};
    if (!titolo || !corpo) return res.status(400).json({ error: "titolo e corpo richiesti" });

    const rows = await sql`
      INSERT INTO notizie (titolo, corpo, immagine_url, categoria, tappa_num, pubblicata)
      VALUES (${titolo}, ${corpo}, ${immagine_url ?? null}, ${categoria ?? "generale"},
              ${tappa_num ?? null}, ${pubblicata ?? false})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  // PATCH — aggiorna notizia esistente
  if (req.method === "PATCH") {
    const { id, ...patch } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id richiesto" });

    await sql`
      UPDATE notizie
      SET titolo       = COALESCE(${patch.titolo ?? null}, titolo),
          corpo        = COALESCE(${patch.corpo ?? null}, corpo),
          immagine_url = COALESCE(${patch.immagine_url ?? null}, immagine_url),
          categoria    = COALESCE(${patch.categoria ?? null}, categoria),
          tappa_num    = COALESCE(${patch.tappa_num ?? null}, tappa_num),
          pubblicata   = COALESCE(${patch.pubblicata ?? null}, pubblicata),
          updated_at   = now()
      WHERE id = ${id}
    `;
    return res.json({ ok: true });
  }

  // DELETE
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id richiesto" });
    await sql`DELETE FROM notizie WHERE id = ${id as string}`;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
