import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../_lib/db";
import { requireAuth } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  const rows = await sql`
    SELECT id, email, display_name, role
    FROM users
    WHERE id = ${auth.sub}
    LIMIT 1
  `;
  const user = rows[0] as any;
  if (!user) return res.status(404).json({ error: "Utente non trovato" });

  return res.json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
  });
}
