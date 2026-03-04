import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { sql } from "../_lib/db";
import { signToken } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ error: "email e password richiesti" });

  const rows = await sql`
    SELECT id, email, password_hash, display_name, role
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  const user = rows[0] as any;
  if (!user) return res.status(401).json({ error: "Credenziali non valide" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenziali non valide" });

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    },
  });
}
