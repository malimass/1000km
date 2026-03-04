import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { sql } from "../_lib/db";
import { signToken } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, displayName, role = "athlete" } = req.body ?? {};
  if (!email || !password || !displayName)
    return res.status(400).json({ error: "email, password e displayName richiesti" });

  if (!["athlete", "coach"].includes(role))
    return res.status(400).json({ error: "role deve essere athlete o coach" });

  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0)
    return res.status(409).json({ error: "Email già registrata" });

  const hash = await bcrypt.hash(password, 12);
  const rows = await sql`
    INSERT INTO users (email, password_hash, display_name, role)
    VALUES (${email}, ${hash}, ${displayName}, ${role})
    RETURNING id, email, display_name, role
  `;
  const user = rows[0] as any;

  // Crea profilo
  await sql`
    INSERT INTO profiles (id, display_name, email, role)
    VALUES (${user.id}, ${displayName}, ${email}, ${role})
    ON CONFLICT (id) DO NOTHING
  `;

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    },
  });
}
