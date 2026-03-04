import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_lib/db";
import { requireAuth } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  // GET — profilo atleta (proprio) o lista atleti del coach
  if (req.method === "GET") {
    const { coach_id, user_id } = req.query;

    if (coach_id) {
      // Coach carica i propri atleti con join su profiles
      const rows = await sql`
        SELECT
          ap.id, ap.age, ap.weight_kg, ap.height_cm, ap.gender,
          ap.rest_hr, ap.experience_years, ap.max_hr, ap.coach_id,
          p.display_name, p.email
        FROM athlete_profiles ap
        JOIN profiles p ON p.id = ap.id
        WHERE ap.coach_id = ${coach_id as string}
      `;
      return res.json(rows);
    }

    const targetId = (user_id as string) ?? auth.sub;
    const rows = await sql`
      SELECT * FROM athlete_profiles WHERE id = ${targetId} LIMIT 1
    `;
    return res.json(rows[0] ?? null);
  }

  // POST — upsert profilo atleta
  if (req.method === "POST") {
    const p = req.body ?? {};
    await sql`
      INSERT INTO athlete_profiles
        (id, age, weight_kg, height_cm, gender, rest_hr, experience_years, max_hr, coach_id, updated_at)
      VALUES
        (${auth.sub}, ${p.age ?? null}, ${p.weight_kg ?? null}, ${p.height_cm ?? null},
         ${p.gender ?? null}, ${p.rest_hr ?? null}, ${p.experience_years ?? null},
         ${p.max_hr ?? null}, ${p.coach_id ?? null}, now())
      ON CONFLICT (id) DO UPDATE
        SET age              = EXCLUDED.age,
            weight_kg        = EXCLUDED.weight_kg,
            height_cm        = EXCLUDED.height_cm,
            gender           = EXCLUDED.gender,
            rest_hr          = EXCLUDED.rest_hr,
            experience_years = EXCLUDED.experience_years,
            max_hr           = EXCLUDED.max_hr,
            coach_id         = EXCLUDED.coach_id,
            updated_at       = now()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
