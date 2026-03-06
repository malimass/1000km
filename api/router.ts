import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { sql } from "./_lib/db.js";
import { signToken, requireAuth } from "./_lib/auth.js";

function getPath(req: VercelRequest): string {
  const url = req.url ?? "";
  return url.split("?")[0].replace(/^\/api/, "") || "/";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  try {
    if (path === "/auth/login") return await authLogin(req, res);
    if (path === "/auth/pin-login") return await authPinLogin(req, res);
    if (path === "/auth/register") return await authRegister(req, res);
    if (path === "/auth/me") return await authMe(req, res);
    if (path === "/notizie") return await notizie(req, res);
    if (path === "/sostenitori") return await sostenitori(req, res);
    if (path === "/servizi") return await servizi(req, res);
    if (path === "/site-settings") return await siteSettings(req, res);
    if (path === "/raccolta-fondi") return await raccoltaFondi(req, res);
    if (path === "/admin-settings") return await adminSettings(req, res);
    if (path === "/profiles") return await profiles(req, res);
    if (path === "/athlete-profiles") return await athleteProfiles(req, res);
    if (path === "/coach-sessions") return await coachSessions(req, res);
    if (path === "/iscrizioni") return await iscrizioni(req, res);
    if (path === "/create-payment") return await createPayment(req, res);
    if (path === "/live-position") return await livePosition(req, res);
    if (path === "/route-positions") return await routePositions(req, res);
    if (path === "/community/live-position") return await communityLivePosition(req, res);
    if (path === "/community/route-positions") return await communityRoutePositions(req, res);
    if (path === "/percorso-config") return await percorsoConfig(req, res);
    if (path === "/saved-percorsi") return await savedPercorsi(req, res);
    if (path === "/elevation") return await elevation(req, res);
    if (path === "/scrape-site") return await scrapeSite(req, res);
    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

async function authLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ error: "email e password richiesti" });
  const rows = await sql`
    SELECT id, email, password_hash, display_name, role
    FROM users WHERE email = ${email} LIMIT 1
  `;
  const user = rows[0] as any;
  if (!user) return res.status(401).json({ error: "Credenziali non valide" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenziali non valide" });
  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  return res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
  });
}

async function authPinLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { pin } = req.body ?? {};
  const adminPin = process.env.VITE_ADMIN_PIN || process.env.ADMIN_PIN || "gratitude2026";
  if (!pin || pin !== adminPin)
    return res.status(401).json({ error: "PIN non valido" });
  // Ensure users table exists with admin role allowed
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text        NOT NULL UNIQUE,
      password_hash text        NOT NULL,
      display_name  text        NOT NULL,
      role          text        NOT NULL DEFAULT 'athlete',
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    )
  `;
  // Update role constraint to allow 'admin'
  await sql`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
  `;
  await sql`
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY['athlete','coach','admin']))
  `;
  // Find or create admin user
  const rows = await sql`
    SELECT id, email, role FROM users ORDER BY id LIMIT 1
  `;
  let user = rows[0] as any;
  if (!user) {
    const created = await sql`
      INSERT INTO users (email, password_hash, display_name, role)
      VALUES ('admin@1000km.it', 'pin-only', 'Admin', 'admin')
      RETURNING id, email, role
    `;
    user = created[0] as any;
  }
  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

async function authRegister(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password, displayName, role = "athlete" } = req.body ?? {};
  if (!email || !password || !displayName)
    return res.status(400).json({ error: "email, password e displayName richiesti" });
  if (!["athlete", "coach"].includes(role))
    return res.status(400).json({ error: "role deve essere athlete o coach" });
  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) return res.status(409).json({ error: "Email già registrata" });
  const hash = await bcrypt.hash(password, 12);
  const rows = await sql`
    INSERT INTO users (email, password_hash, display_name, role)
    VALUES (${email}, ${hash}, ${displayName}, ${role})
    RETURNING id, email, display_name, role
  `;
  const user = rows[0] as any;
  await sql`
    INSERT INTO profiles (id, display_name, email, role)
    VALUES (${user.id}, ${displayName}, ${email}, ${role})
    ON CONFLICT (id) DO NOTHING
  `;
  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
  });
}

async function authMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });
  const rows = await sql`
    SELECT id, email, display_name, role FROM users WHERE id = ${auth.sub} LIMIT 1
  `;
  const user = rows[0] as any;
  if (!user) return res.status(404).json({ error: "Utente non trovato" });
  return res.json({ id: user.id, email: user.email, displayName: user.display_name, role: user.role });
}

// ─── NOTIZIE ─────────────────────────────────────────────────────────────────

async function notizie(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { all } = req.query;
    const auth = all ? await requireAuth(req) : null;
    const showAll = !!auth;
    const rows = showAll
      ? await sql`SELECT * FROM notizie ORDER BY created_at DESC LIMIT 100`
      : await sql`SELECT * FROM notizie WHERE pubblicata = true ORDER BY created_at DESC LIMIT 30`;
    return res.json(rows);
  }
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });
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
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id richiesto" });
    await sql`DELETE FROM notizie WHERE id = ${id as string}`;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── SOSTENITORI ─────────────────────────────────────────────────────────────

async function sostenitori(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM sostenitori_page WHERE id = 1 LIMIT 1`;
    return res.json(rows[0]?.data ?? { title: "I Sostenitori del Cammino", intro: "", items: [] });
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    await sql`
      INSERT INTO sostenitori_page (id, data, updated_at)
      VALUES (1, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── SCRAPE SITE (metadata extraction) ──────────────────────────────────────

async function scrapeSite(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });

  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") return res.status(400).json({ error: "URL mancante" });

  try {
    // Normalise URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GratitudePathBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).json({ error: `Sito ha risposto con ${response.status}` });

    const html = await response.text();

    // Extract meta tags with regex (no DOM parser needed on server)
    const meta = (name: string): string => {
      // Try og: tags first, then regular meta
      const ogMatch = html.match(new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, "i"));
      if (ogMatch) return ogMatch[1];

      const metaMatch = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"));
      return metaMatch?.[1] ?? "";
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitle = meta("title") || meta("site_name") || (titleMatch?.[1] ?? "").trim();
    const ogDesc = meta("description");
    const ogImage = meta("image");

    // Build absolute URL for the image
    let logoUrl = "";
    if (ogImage) {
      try {
        logoUrl = new URL(ogImage, targetUrl).href;
      } catch {
        logoUrl = ogImage;
      }
    }

    // Fallback: try to get favicon
    if (!logoUrl) {
      const iconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
      if (iconMatch) {
        try {
          logoUrl = new URL(iconMatch[1], targetUrl).href;
        } catch {
          logoUrl = iconMatch[1];
        }
      } else {
        // Try default favicon
        try {
          const faviconUrl = new URL("/favicon.ico", targetUrl).href;
          logoUrl = faviconUrl;
        } catch { /* noop */ }
      }
    }

    return res.json({
      nome: ogTitle,
      testo: ogDesc,
      logoUrl,
      siteUrl: targetUrl,
    });
  } catch (err: any) {
    if (err.name === "AbortError") return res.status(504).json({ error: "Timeout: il sito non risponde" });
    return res.status(502).json({ error: `Impossibile raggiungere il sito: ${err.message}` });
  }
}

// ─── SERVIZI ─────────────────────────────────────────────────────────────────

async function servizi(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM servizi_page WHERE id = 1 LIMIT 1`;
    return res.json(rows[0]?.data ?? { sections: [] });
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    await sql`
      INSERT INTO servizi_page (id, data, updated_at)
      VALUES (1, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── SITE SETTINGS ───────────────────────────────────────────────────────────

async function siteSettings(req: VercelRequest, res: VercelResponse) {
  const { id = "1" } = req.query;
  const rowId = Number(id);
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM site_settings WHERE id = ${rowId} LIMIT 1`;
    return res.json(rows[0]?.data ?? {});
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    await sql`
      INSERT INTO site_settings (id, data, updated_at)
      VALUES (${rowId}, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── RACCOLTA FONDI ──────────────────────────────────────────────────────────

async function raccoltaFondi(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const rows = await sql`
      SELECT importo_euro, target_euro, donatori, updated_at
      FROM raccolta_fondi WHERE id = 1 LIMIT 1
    `;
    return res.json(rows[0] ?? null);
  }
  if (req.method === "PATCH") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const { importo_euro, donatori } = req.body ?? {};
    await sql`
      UPDATE raccolta_fondi
      SET importo_euro = ${importo_euro}, donatori = ${donatori}, updated_at = now()
      WHERE id = 1
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── ADMIN SETTINGS ──────────────────────────────────────────────────────────

async function adminSettings(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM admin_settings WHERE user_id = ${auth.sub} LIMIT 1`;
    return res.json(rows[0]?.data ?? {});
  }
  if (req.method === "POST") {
    await sql`
      INSERT INTO admin_settings (user_id, data, updated_at)
      VALUES (${auth.sub}, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── PROFILES ────────────────────────────────────────────────────────────────

async function profiles(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { id, role } = req.query;
    if (id) {
      const rows = await sql`
        SELECT id, display_name, activity_type, city FROM profiles
        WHERE id = ${id as string} LIMIT 1
      `;
      return res.json(rows[0] ?? null);
    }
    if (role) {
      const rows = await sql`
        SELECT id, display_name FROM profiles
        WHERE role = ${role as string} ORDER BY display_name
      `;
      return res.json(rows);
    }
    return res.status(400).json({ error: "id o role richiesto" });
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const { display_name, activity_type, city } = req.body ?? {};
    await sql`
      INSERT INTO profiles (id, display_name, activity_type, city, updated_at)
      VALUES (${auth.sub}, ${display_name}, ${activity_type ?? "cammino"}, ${city ?? null}, now())
      ON CONFLICT (id) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            activity_type = EXCLUDED.activity_type,
            city          = EXCLUDED.city,
            updated_at    = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── ATHLETE PROFILES ────────────────────────────────────────────────────────

async function athleteProfiles(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });
  if (req.method === "GET") {
    const { coach_id, user_id } = req.query;
    if (coach_id) {
      const rows = await sql`
        SELECT ap.id, ap.age, ap.weight_kg, ap.height_cm, ap.gender,
               ap.rest_hr, ap.experience_years, ap.max_hr, ap.coach_id,
               p.display_name, p.email
        FROM athlete_profiles ap JOIN profiles p ON p.id = ap.id
        WHERE ap.coach_id = ${coach_id as string}
      `;
      return res.json(rows);
    }
    const targetId = (user_id as string) ?? auth.sub;
    const rows = await sql`SELECT * FROM athlete_profiles WHERE id = ${targetId} LIMIT 1`;
    return res.json(rows[0] ?? null);
  }
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

// ─── COACH SESSIONS ──────────────────────────────────────────────────────────

async function coachSessions(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });
  if (req.method === "GET") {
    const { user_id } = req.query;
    const targetId = (user_id as string) ?? auth.sub;
    const rows = await sql`
      SELECT * FROM coach_sessions WHERE user_id = ${targetId} ORDER BY start_time DESC
    `;
    return res.json(rows);
  }
  if (req.method === "POST") {
    const s = req.body ?? {};
    await sql`
      INSERT INTO coach_sessions
        (id, user_id, file_name, sport, start_time, duration_sec, distance_m,
         avg_speed_kmh, max_speed_kmh, avg_heart_rate, max_heart_rate,
         total_elevation_gain_m, total_elevation_loss_m, calories, trimp, tss, hr_zones_sec)
      VALUES
        (${s.id}, ${auth.sub}, ${s.file_name}, ${s.sport}, ${s.start_time},
         ${s.duration_sec}, ${s.distance_m ?? 0}, ${s.avg_speed_kmh ?? 0},
         ${s.max_speed_kmh ?? 0}, ${s.avg_heart_rate ?? null}, ${s.max_heart_rate ?? null},
         ${s.total_elevation_gain_m ?? 0}, ${s.total_elevation_loss_m ?? 0},
         ${s.calories ?? null}, ${s.trimp ?? null}, ${s.tss ?? null},
         ${s.hr_zones_sec ? JSON.stringify(s.hr_zones_sec) : null})
      ON CONFLICT (id) DO UPDATE
        SET file_name              = EXCLUDED.file_name,
            sport                  = EXCLUDED.sport,
            start_time             = EXCLUDED.start_time,
            duration_sec           = EXCLUDED.duration_sec,
            distance_m             = EXCLUDED.distance_m,
            avg_speed_kmh          = EXCLUDED.avg_speed_kmh,
            max_speed_kmh          = EXCLUDED.max_speed_kmh,
            avg_heart_rate         = EXCLUDED.avg_heart_rate,
            max_heart_rate         = EXCLUDED.max_heart_rate,
            total_elevation_gain_m = EXCLUDED.total_elevation_gain_m,
            total_elevation_loss_m = EXCLUDED.total_elevation_loss_m,
            calories               = EXCLUDED.calories,
            trimp                  = EXCLUDED.trimp,
            tss                    = EXCLUDED.tss,
            hr_zones_sec           = EXCLUDED.hr_zones_sec
    `;
    return res.status(201).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id richiesto" });
    await sql`DELETE FROM coach_sessions WHERE id = ${id as string} AND user_id = ${auth.sub}`;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── ISCRIZIONI ──────────────────────────────────────────────────────────────

async function iscrizioni(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const rows = await sql`SELECT * FROM iscrizioni ORDER BY created_at DESC`;
    return res.json(rows);
  }
  if (req.method === "POST") {
    const {
      tappa_numero, nome, cognome, email, telefono,
      vuole_maglia, taglia_maglia, donazione_euro, pagamento_stato, stripe_session_id,
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
         ${donazione_euro ?? 0}, ${pagamento_stato ?? "gratuito"}, ${stripe_session_id ?? null})
      RETURNING id
    `;
    return res.status(201).json({ id: (rows[0] as any).id });
  }
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

// ─── CREATE PAYMENT ──────────────────────────────────────────────────────────

async function createPayment(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const {
    tappa_numero, nome, cognome, email, telefono,
    vuole_maglia, taglia_maglia, donazione_euro, success_url, cancel_url,
  } = req.body ?? {};
  if (!tappa_numero || !nome || !cognome || !email || !donazione_euro)
    return res.status(400).json({ error: "Parametri mancanti" });
  try {
    const rows = await sql`
      INSERT INTO iscrizioni
        (tappa_numero, nome, cognome, email, telefono, vuole_maglia, taglia_maglia,
         donazione_euro, pagamento_stato)
      VALUES
        (${tappa_numero}, ${nome}, ${cognome}, ${email}, ${telefono ?? null},
         ${vuole_maglia ?? false}, ${taglia_maglia ?? null}, ${donazione_euro}, 'in_attesa')
      RETURNING id
    `;
    const iscrizioneId = (rows[0] as any).id;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Iscrizione Tappa ${tappa_numero} — ${nome} ${cognome}` },
          unit_amount: Math.round(Number(donazione_euro) * 100),
        },
        quantity: 1,
      }],
      metadata: { iscrizione_id: iscrizioneId },
      success_url: success_url ?? `${req.headers.origin}/grazie`,
      cancel_url: cancel_url ?? `${req.headers.origin}/iscriviti`,
    });
    await sql`UPDATE iscrizioni SET stripe_session_id = ${session.id} WHERE id = ${iscrizioneId}`;
    return res.json({ url: session.url, session_id: session.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Errore pagamento" });
  }
}

// ─── LIVE POSITION ───────────────────────────────────────────────────────────

async function livePosition(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { runner_id } = req.query;
    const rows = runner_id
      ? await sql`SELECT * FROM live_position WHERE id = ${Number(runner_id)} LIMIT 1`
      : await sql`SELECT * FROM live_position WHERE id IN (1,2)`;
    if (runner_id) return res.json(rows[0] ?? null);
    const result: Record<number, any> = { 1: null, 2: null };
    for (const r of rows as any[]) result[r.id] = r;
    return res.json(result);
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const { runner_id = 1, lat, lng, speed, accuracy, heading, is_active } = req.body ?? {};
    await sql`
      INSERT INTO live_position (id, lat, lng, speed, accuracy, heading, is_active, updated_at)
      VALUES (${runner_id}, ${lat}, ${lng}, ${speed ?? null}, ${accuracy ?? null},
              ${heading ?? null}, ${is_active ?? false}, now())
      ON CONFLICT (id) DO UPDATE
        SET lat        = EXCLUDED.lat,
            lng        = EXCLUDED.lng,
            speed      = EXCLUDED.speed,
            accuracy   = EXCLUDED.accuracy,
            heading    = EXCLUDED.heading,
            is_active  = EXCLUDED.is_active,
            updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── ROUTE POSITIONS ─────────────────────────────────────────────────────────

async function routePositions(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { session_ids, runner_id } = req.query;
    const ids = session_ids
      ? (session_ids as string).split(",")
      : [new Date().toISOString().slice(0, 10)];
    const rows = runner_id
      ? await sql`
          SELECT id, lat, lng, recorded_at, session_id, runner_id
          FROM route_positions
          WHERE session_id = ANY(${ids}) AND runner_id = ${Number(runner_id)}
          ORDER BY recorded_at ASC
        `
      : await sql`
          SELECT id, lat, lng, recorded_at, session_id, runner_id
          FROM route_positions
          WHERE session_id = ANY(${ids})
          ORDER BY recorded_at ASC
        `;
    return res.json(rows);
  }
  const auth = await requireAuth(req);
  if (!auth) return res.status(401).json({ error: "Non autenticato" });
  if (req.method === "POST") {
    const { lat, lng, speed, accuracy, heading, session_id, runner_id = 1 } = req.body ?? {};
    if (!lat || !lng || !session_id)
      return res.status(400).json({ error: "lat, lng, session_id richiesti" });
    await sql`
      INSERT INTO route_positions (lat, lng, speed, accuracy, heading, session_id, runner_id, recorded_at)
      VALUES (${lat}, ${lng}, ${speed ?? null}, ${accuracy ?? null}, ${heading ?? null},
              ${session_id}, ${runner_id}, now())
    `;
    return res.status(201).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const { session_id, runner_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "session_id richiesto" });
    await sql`
      DELETE FROM route_positions
      WHERE session_id = ${session_id as string} AND runner_id = ${Number(runner_id ?? 1)}
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── COMMUNITY LIVE POSITION ─────────────────────────────────────────────────

async function communityLivePosition(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const rows = await sql`
      SELECT user_id, display_name, activity_type, lat, lng,
             speed, accuracy, heading, updated_at, is_active
      FROM community_live_position
      WHERE is_active = true AND updated_at > now() - interval '10 minutes'
      ORDER BY updated_at DESC
    `;
    return res.json(rows);
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const { display_name, activity_type, lat, lng, speed, accuracy, heading, is_active } =
      req.body ?? {};
    await sql`
      INSERT INTO community_live_position
        (user_id, display_name, activity_type, lat, lng, speed, accuracy, heading, is_active, updated_at)
      VALUES
        (${auth.sub}, ${display_name}, ${activity_type ?? "cammino"},
         ${lat ?? null}, ${lng ?? null}, ${speed ?? null}, ${accuracy ?? null},
         ${heading ?? null}, ${is_active ?? false}, now())
      ON CONFLICT (user_id) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            activity_type = EXCLUDED.activity_type,
            lat           = EXCLUDED.lat,
            lng           = EXCLUDED.lng,
            speed         = EXCLUDED.speed,
            accuracy      = EXCLUDED.accuracy,
            heading       = EXCLUDED.heading,
            is_active     = EXCLUDED.is_active,
            updated_at    = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── COMMUNITY ROUTE POSITIONS ───────────────────────────────────────────────

async function communityRoutePositions(req: VercelRequest, res: VercelResponse) {
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

// ─── PERCORSO CONFIG ──────────────────────────────────────────────────────────

async function percorsoConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM site_settings WHERE id = 3 LIMIT 1`;
    return res.json(rows[0]?.data ?? null);
  }
  if (req.method === "POST") {
    const { pin, tappe, coords, distanceM, elevation } = req.body ?? {};
    const adminPin = process.env.VITE_ADMIN_PIN || process.env.ADMIN_PIN || "gratitude2026";
    if (!pin || pin !== adminPin) return res.status(401).json({ error: "PIN non valido" });
    await sql`
      INSERT INTO site_settings (id, data, updated_at)
      VALUES (3, ${JSON.stringify({ tappe, coords, distanceM, elevation })}, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
}

// ─── SAVED PERCORSI ──────────────────────────────────────────────────────────

async function savedPercorsi(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  // Auto-create table if missing
  await sql`
    CREATE TABLE IF NOT EXISTS saved_percorsi (
      id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          text        NOT NULL,
      partenza      text        NOT NULL,
      arrivo        text        NOT NULL,
      distance_m    numeric     NOT NULL DEFAULT 0,
      km_per_tappa  numeric     NOT NULL DEFAULT 70,
      coords        jsonb       NOT NULL DEFAULT '[]',
      tappe         jsonb       NOT NULL DEFAULT '[]',
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  // GET — lista percorsi dell'utente
  if (req.method === "GET") {
    const rows = await sql`
      SELECT id, name, partenza, arrivo, distance_m, km_per_tappa, coords, tappe, created_at
      FROM saved_percorsi
      WHERE user_id = ${user.sub}
      ORDER BY created_at DESC
    `;
    return res.json(rows);
  }

  // POST — salva nuovo percorso
  if (req.method === "POST") {
    const { name, partenza, arrivo, distanceM, kmPerTappa, coords, tappe } = req.body ?? {};
    if (!partenza || !arrivo || !coords?.length || !tappe?.length)
      return res.status(400).json({ error: "Dati percorso incompleti" });

    const label = (name as string)?.trim() || `${partenza} → ${arrivo}`;
    const rows = await sql`
      INSERT INTO saved_percorsi (user_id, name, partenza, arrivo, distance_m, km_per_tappa, coords, tappe)
      VALUES (${user.sub}, ${label}, ${partenza}, ${arrivo}, ${distanceM ?? 0}, ${kmPerTappa ?? 70},
              ${JSON.stringify(coords)}, ${JSON.stringify(tappe)})
      RETURNING id, name, partenza, arrivo, distance_m, km_per_tappa, coords, tappe, created_at
    `;
    return res.status(201).json(rows[0]);
  }

  // DELETE — elimina un percorso
  if (req.method === "DELETE") {
    const id = (req.query.id as string) ?? req.body?.id;
    if (!id) return res.status(400).json({ error: "id richiesto" });
    await sql`DELETE FROM saved_percorsi WHERE id = ${id} AND user_id = ${user.sub}`;
    return res.json({ ok: true });
  }

  return res.status(405).end();
}

// ─── ELEVATION ───────────────────────────────────────────────────────────────

async function elevation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { coords } = req.body ?? {};
  if (!Array.isArray(coords) || coords.length < 2)
    return res.status(400).json({ error: "coords array richiesto (min 2 punti)" });

  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Google Maps API key non configurata" });

  // Campiona max 300 punti per evitare URL troppo lunghi
  const MAX_SAMPLES = 300;
  const sampled: [number, number][] =
    coords.length <= MAX_SAMPLES
      ? coords
      : (() => {
          const step = (coords.length - 1) / (MAX_SAMPLES - 1);
          const pts: [number, number][] = [];
          for (let i = 0; i < MAX_SAMPLES; i++) {
            pts.push(coords[Math.round(i * step)]);
          }
          return pts;
        })();

  // Batch in gruppi da 100 per restare sotto i limiti URL di Google (~8KB)
  const BATCH_SIZE = 100;
  const allResults: { elevation: number; resolution: number }[] = [];

  try {
    for (let start = 0; start < sampled.length; start += BATCH_SIZE) {
      const batch = sampled.slice(start, start + BATCH_SIZE);
      const locations = batch.map((c: [number, number]) => `${c[0]},${c[1]}`).join("|");
      const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK")
        return res.status(502).json({ error: `Google Elevation API: ${data.status}`, detail: data.error_message });

      allResults.push(...data.results);
    }

    const elevations: number[] = allResults.map((r: any) => r.elevation);
    let gainM = 0, lossM = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gainM += diff;
      else lossM += Math.abs(diff);
    }

    const points = allResults.map((r: any, i: number) => ({
      lat: sampled[i][0],
      lng: sampled[i][1],
      elevation: Math.round(r.elevation),
      resolution: Math.round(r.resolution),
    }));

    return res.json({
      points,
      stats: {
        minElevation: Math.round(Math.min(...elevations)),
        maxElevation: Math.round(Math.max(...elevations)),
        totalGainM: Math.round(gainM),
        totalLossM: Math.round(lossM),
      },
    });
  } catch (err: any) {
    console.error("[elevation]", err);
    return res.status(502).json({ error: "Errore chiamata Google Elevation API" });
  }
}
