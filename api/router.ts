import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { sql } from "./_lib/db.js";
import { signToken, requireAuth } from "./_lib/auth.js";
import { sendThankYouEmail, sendPendingReminderEmail, REMINDER_SCHEDULE } from "./_lib/email.js";

function getPath(req: VercelRequest): string {
  const url = req.url ?? "";
  return url.split("?")[0].replace(/^\/api/, "") || "/";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS: accetta sia www che non-www ─────────────────────────────────────
  const allowedOrigins = [
    "https://1000kmdigratitudine.it",
    "https://www.1000kmdigratitudine.it",
  ];
  const origin = req.headers.origin ?? "";
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(204).end();

  const path = getPath(req);
  try {
    if (path === "/auth/login") return await authLogin(req, res);
    if (path === "/auth/pin-login") return await authPinLogin(req, res);
    if (path === "/auth/register") return await authRegister(req, res);
    if (path === "/auth/me") return await authMe(req, res);
    if (path === "/notizie") return await notizie(req, res);
    if (path === "/sostenitori") return await sostenitori(req, res);
    if (path === "/patrocini") return await patrociniHandler(req, res);
    if (path === "/servizi") return await servizi(req, res);
    if (path === "/site-settings") return await siteSettings(req, res);
    if (path === "/raccolta-fondi") return await raccoltaFondi(req, res);
    if (path === "/admin-settings") return await adminSettings(req, res);
    if (path === "/profiles") return await profiles(req, res);
    if (path === "/athlete-profiles") return await athleteProfiles(req, res);
    if (path === "/coach-sessions") return await coachSessions(req, res);
    if (path === "/iscrizioni") return await iscrizioni(req, res);
    if (path === "/iscrizioni-count") return await iscrizioniCount(req, res);
    if (path === "/create-payment") return await createPayment(req, res);
    if (path === "/live-position") return await livePosition(req, res);
    if (path === "/route-positions") return await routePositions(req, res);
    if (path === "/community/live-position") return await communityLivePosition(req, res);
    if (path === "/community/route-positions") return await communityRoutePositions(req, res);
    if (path === "/percorso-config") return await percorsoConfig(req, res);
    if (path === "/saved-percorsi") return await savedPercorsi(req, res);
    if (path === "/elevation") return await elevation(req, res);
    if (path === "/scrape-site") return await scrapeSite(req, res);
    if (path === "/traccar-position") return await traccarPosition(req, res);
    if (path === "/donazioni") return await donazioni(req, res);
    if (path === "/sumup-checkout") return await sumupCheckout(req, res);
    if (path === "/sumup-confirm") return await sumupConfirm(req, res);
    if (path === "/paypal-create-order") return await paypalCreateOrder(req, res);
    if (path === "/paypal-capture-order") return await paypalCaptureOrder(req, res);
    if (path === "/cron/pending-reminders") return await cronPendingReminders(req, res);
    if (path === "/track") return await track(req, res);
    if (path === "/analytics") return await analytics(req, res);
    if (path === "/analytics-live") return await analyticsLive(req, res);
    if (path === "/analytics-journeys") return await analyticsJourneys(req, res);
    if (path === "/analytics-funnel") return await analyticsFunnel(req, res);
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

    // Download image and convert to base64 data URL
    let logoDataUrl = "";
    if (logoUrl) {
      try {
        const imgCtrl = new AbortController();
        const imgTimeout = setTimeout(() => imgCtrl.abort(), 6000);
        const imgResp = await fetch(logoUrl, {
          signal: imgCtrl.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GratitudePathBot/1.0)" },
          redirect: "follow",
        });
        clearTimeout(imgTimeout);
        if (imgResp.ok) {
          const contentType = imgResp.headers.get("content-type") || "image/png";
          const buf = Buffer.from(await imgResp.arrayBuffer());
          // Limit to ~500KB to avoid bloating the DB
          if (buf.length <= 512_000) {
            logoDataUrl = `data:${contentType.split(";")[0]};base64,${buf.toString("base64")}`;
          }
        }
      } catch { /* keep empty if download fails */ }
    }

    return res.json({
      nome: ogTitle,
      testo: ogDesc,
      logoUrl: logoDataUrl,
      siteUrl: targetUrl,
    });
  } catch (err: any) {
    if (err.name === "AbortError") return res.status(504).json({ error: "Timeout: il sito non risponde" });
    return res.status(502).json({ error: `Impossibile raggiungere il sito: ${err.message}` });
  }
}

// ─── PATROCINI ───────────────────────────────────────────────────────────────

async function patrociniHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM patrocini_page WHERE id = 1 LIMIT 1`;
    return res.json(rows[0]?.data ?? { title: "Patrocini istituzionali", intro: "", items: [] });
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    await sql`
      INSERT INTO patrocini_page (id, data, updated_at)
      VALUES (1, ${JSON.stringify(req.body)}, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    return res.json({ ok: true });
  }
  return res.status(405).end();
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
    // Compute totals from confirmed donations (always in sync with DB)
    const [totals] = await sql`
      SELECT COALESCE(SUM(importo_euro), 0) AS importo_euro,
             COUNT(*)::int                   AS donatori
      FROM donazioni
      WHERE stato = 'completata'
        AND progetto != 'Sponsor Sostenitori del Cammino'
    `;
    const [meta] = await sql`
      SELECT target_euro FROM raccolta_fondi WHERE id = 1 LIMIT 1
    `;
    return res.json({
      importo_euro: Number(totals.importo_euro),
      donatori: totals.donatori,
      target_euro: meta?.target_euro ?? 50000,
      updated_at: new Date().toISOString(),
    });
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

// ─── DONAZIONI ───────────────────────────────────────────────────────────────

async function donazioni(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { nome, cognome, email, importo_euro, progetto } = req.body ?? {};
    if (!nome || !email || !importo_euro)
      return res.status(400).json({ error: "nome, email e importo_euro richiesti" });
    const importo = Number(importo_euro);
    if (isNaN(importo) || importo <= 0)
      return res.status(400).json({ error: "importo non valido" });

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS donazioni (
        id            bigserial        PRIMARY KEY,
        nome          text             NOT NULL,
        cognome       text             NOT NULL DEFAULT '',
        email         text             NOT NULL,
        importo_euro  numeric(10,2)    NOT NULL,
        progetto      text             NOT NULL DEFAULT 'Sostieni Komen Italia',
        stato         text             NOT NULL DEFAULT 'pendente',
        checkout_ref  text,
        reminder_count smallint         NOT NULL DEFAULT 0,
        reminded_at   timestamptz,
        created_at    timestamptz      DEFAULT now()
      )
    `;

    // Save donation as pendente (counter updates only after payment confirmation)
    const [row] = await sql`
      INSERT INTO donazioni (nome, cognome, email, importo_euro, progetto, stato)
      VALUES (${nome}, ${cognome ?? ""}, ${email}, ${importo}, ${progetto ?? "Sostieni Komen Italia"}, 'pendente')
      RETURNING id
    `;

    return res.status(201).json({ ok: true, donazione_id: row.id });
  }
  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const rows = await sql`
      SELECT id, nome, cognome, email, importo_euro, progetto, stato, created_at
      FROM donazioni ORDER BY created_at DESC LIMIT 200
    `;
    return res.json(rows);
  }
  return res.status(405).end();
}

// ─── SUMUP CHECKOUT ──────────────────────────────────────────────────────────

async function sumupCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { amount, nome, cognome, email, progetto, donazione_id } = req.body ?? {};
  if (!amount || !email) return res.status(400).json({ error: "amount e email richiesti" });

  const apiKey = process.env.SUMUP_API_KEY;
  const merchantCode = process.env.SUMUP_MERCHANT_CODE;
  if (!apiKey || !merchantCode) return res.status(500).json({ error: "SumUp non configurato" });

  const checkoutRef = `don-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const resp = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: checkoutRef,
      amount: Number(amount),
      currency: "EUR",
      merchant_code: merchantCode,
      description: `Donazione ${progetto ?? "1000km Di Gratitudine"} - ${nome ?? ""} ${cognome ?? ""}`.trim(),
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("SumUp checkout error:", err);
    return res.status(502).json({ error: "Errore creazione checkout SumUp" });
  }

  const checkout = await resp.json();

  // Link checkout to donazione
  if (req.body.donazione_id) {
    await sql`
      UPDATE donazioni SET checkout_ref = ${checkoutRef} WHERE id = ${req.body.donazione_id}
    `;
  }

  return res.status(201).json({ id: checkout.id, checkout_reference: checkoutRef });
}

// ─── SUMUP CONFIRM ───────────────────────────────────────────────────────────

async function sumupConfirm(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { checkout_id, checkout_reference } = req.body ?? {};
  if (!checkout_id) return res.status(400).json({ error: "checkout_id richiesto" });

  const apiKey = process.env.SUMUP_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "SumUp non configurato" });

  // Verify payment status with SumUp
  const resp = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkout_id}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!resp.ok) {
    console.error("SumUp verify error:", await resp.text());
    return res.status(502).json({ error: "Errore verifica pagamento" });
  }

  const checkout = await resp.json();

  // Check if payment was successful
  const txn = checkout.transactions?.find((t: any) => t.status === "SUCCESSFUL");
  if (!txn && checkout.status !== "PAID") {
    return res.status(400).json({ error: "Pagamento non completato", status: checkout.status });
  }

  // Update donazione stato → completata + update counter (idempotent)
  const ref = checkout_reference || checkout.checkout_reference;
  if (ref) {
    const [don] = await sql`
      UPDATE donazioni SET stato = 'completata'
      WHERE checkout_ref = ${ref} AND stato != 'completata'
      RETURNING importo_euro, nome, email, progetto
    `;
    if (don) {
      // Only update raccolta_fondi counter for actual donations (not sostenitori)
      if (don.progetto !== "Sponsor Sostenitori del Cammino") {
        await sql`
          UPDATE raccolta_fondi
          SET importo_euro = importo_euro + ${don.importo_euro},
              donatori     = donatori + 1,
              updated_at   = now()
          WHERE id = 1
        `;
      }

      // Send thank-you email (fire-and-forget)
      sendThankYouEmail({
        to: don.email,
        nome: don.nome,
        importo: Number(don.importo_euro),
        progetto: don.progetto,
      }).catch(() => {});
    }
  }

  return res.json({
    ok: true,
    status: "PAID",
    transaction_id: txn?.id ?? checkout.transaction_id,
  });
}

// ─── CRON: PROMEMORIA DONAZIONI PENDENTI ────────────────────────────────────

async function cronPendingReminders(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Protect with a shared secret (set CRON_SECRET env var)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  // Schedule: 1° dopo 2gg, 2° dopo 7gg, 3° dopo 14gg, 4° (ultimo) dopo 28gg
  // reminder_count tracks how many reminders have been sent (0–4)
  let sent = 0;

  for (const step of REMINDER_SCHEDULE) {
    const pending = await sql`
      SELECT id, nome, email, importo_euro, progetto, reminder_count
      FROM donazioni
      WHERE stato = 'pendente'
        AND reminder_count = ${step.level - 1}
        AND created_at < now() - make_interval(days => ${step.afterDays})
      LIMIT 50
    `;

    for (const don of pending) {
      await sendPendingReminderEmail({
        to: don.email,
        nome: don.nome,
        importo: Number(don.importo_euro),
        progetto: don.progetto,
        reminderLevel: step.level,
      });
      await sql`
        UPDATE donazioni
        SET reminder_count = ${step.level}, reminded_at = now()
        WHERE id = ${don.id}
      `;
      sent++;
    }
  }

  return res.json({ ok: true, reminders_sent: sent });
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
        SELECT id, display_name, activity_type, city, bio, specializzazione FROM profiles
        WHERE id = ${id as string} LIMIT 1
      `;
      return res.json(rows[0] ?? null);
    }
    if (role) {
      const rows = await sql`
        SELECT id, display_name, bio, specializzazione, city FROM profiles
        WHERE role = ${role as string} ORDER BY display_name
      `;
      return res.json(rows);
    }
    return res.status(400).json({ error: "id o role richiesto" });
  }
  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth) return res.status(401).json({ error: "Non autenticato" });
    const { display_name, activity_type, city, bio, specializzazione } = req.body ?? {};
    await sql`
      INSERT INTO profiles (id, display_name, activity_type, city, bio, specializzazione, updated_at)
      VALUES (${auth.sub}, ${display_name}, ${activity_type ?? "cammino"}, ${city ?? null}, ${bio ?? null}, ${specializzazione ?? null}, now())
      ON CONFLICT (id) DO UPDATE
        SET display_name     = EXCLUDED.display_name,
            activity_type    = EXCLUDED.activity_type,
            city             = EXCLUDED.city,
            bio              = EXCLUDED.bio,
            specializzazione = EXCLUDED.specializzazione,
            updated_at       = now()
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
               ap.rest_hr, ap.experience_years, ap.max_hr, ap.coach_id, ap.obiettivo,
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
        (id, age, weight_kg, height_cm, gender, rest_hr, experience_years, max_hr, coach_id, obiettivo, updated_at)
      VALUES
        (${auth.sub}, ${p.age ?? null}, ${p.weight_kg ?? null}, ${p.height_cm ?? null},
         ${p.gender ?? null}, ${p.rest_hr ?? null}, ${p.experience_years ?? null},
         ${p.max_hr ?? null}, ${p.coach_id ?? null}, ${p.obiettivo ?? null}, now())
      ON CONFLICT (id) DO UPDATE
        SET age              = EXCLUDED.age,
            weight_kg        = EXCLUDED.weight_kg,
            height_cm        = EXCLUDED.height_cm,
            gender           = EXCLUDED.gender,
            rest_hr          = EXCLUDED.rest_hr,
            experience_years = EXCLUDED.experience_years,
            max_hr           = EXCLUDED.max_hr,
            coach_id         = EXCLUDED.coach_id,
            obiettivo        = EXCLUDED.obiettivo,
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

// ─── ISCRIZIONI COUNT (public) ───────────────────────────────────────────────

async function iscrizioniCount(_req: VercelRequest, res: VercelResponse) {
  const rows = await sql`SELECT COUNT(*)::int AS total FROM iscrizioni`;
  return res.json({ total: rows[0]?.total ?? 0 });
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

// ─── TRACCAR POSITION (OsmAnd protocol) ─────────────────────────────────────

async function traccarPosition(req: VercelRequest, res: VercelResponse) {
  // Traccar Client sends GET (OsmAnd protocol) or POST
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const params = req.method === "GET" ? req.query : { ...req.query, ...(req.body ?? {}) };
  const { id, lat, lon, timestamp, speed, accuracy, bearing, hdop } = params;

  if (!id || !lat || !lon)
    return res.status(400).json({ error: "id, lat, lon richiesti" });

  const deviceId  = String(id);
  const latitude  = Number(lat);
  const longitude = Number(lon);
  // Traccar Client (Android/iOS) sends speed in m/s via OsmAnd protocol
  const spd = speed != null ? Number(speed) : null;
  const acc = accuracy != null ? Number(accuracy) : (hdop != null ? Number(hdop) * 5 : null);
  const hdg = bearing != null ? Number(bearing) : null;
  const sessionId = new Date().toISOString().slice(0, 10);

  if (isNaN(latitude) || isNaN(longitude))
    return res.status(400).json({ error: "lat/lon non validi" });

  // Ensure traccar_devices table exists
  await sql`
    CREATE TABLE IF NOT EXISTS traccar_devices (
      device_id     text        PRIMARY KEY,
      display_name  text        NOT NULL DEFAULT 'Corridore',
      activity_type text        NOT NULL DEFAULT 'cammino',
      runner_id     smallint,
      user_id       uuid        REFERENCES users(id) ON DELETE SET NULL,
      created_at    timestamptz DEFAULT now()
    )
  `;

  // Lookup or auto-register device
  let rows = await sql`SELECT * FROM traccar_devices WHERE device_id = ${deviceId} LIMIT 1`;
  let device = rows[0] as any;

  if (!device) {
    // Auto-register: create a local user + profile for this device
    const email = `traccar-${deviceId.replace(/[^a-zA-Z0-9_-]/g, "")}@traccar.local`;
    const displayName = deviceId.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const userRows = await sql`
      INSERT INTO users (email, password_hash, display_name, role)
      VALUES (${email}, 'traccar-device', ${displayName}, 'athlete')
      ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id
    `;
    const userId = (userRows[0] as any).id;

    await sql`
      INSERT INTO profiles (id, display_name, activity_type)
      VALUES (${userId}, ${displayName}, 'cammino')
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      INSERT INTO traccar_devices (device_id, display_name, user_id)
      VALUES (${deviceId}, ${displayName}, ${userId})
    `;
    device = { device_id: deviceId, display_name: displayName, activity_type: "cammino", runner_id: null, user_id: userId };
  }

  // Save to appropriate tables
  if (device.runner_id) {
    // Admin runner mode → live_position + route_positions
    await sql`
      INSERT INTO live_position (id, lat, lng, speed, accuracy, heading, is_active, updated_at)
      VALUES (${device.runner_id}, ${latitude}, ${longitude}, ${spd}, ${acc}, ${hdg}, true, now())
      ON CONFLICT (id) DO UPDATE
        SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, speed = EXCLUDED.speed,
            accuracy = EXCLUDED.accuracy, heading = EXCLUDED.heading,
            is_active = true, updated_at = now()
    `;
    await sql`
      INSERT INTO route_positions (lat, lng, speed, accuracy, heading, session_id, runner_id, recorded_at)
      VALUES (${latitude}, ${longitude}, ${spd}, ${acc}, ${hdg}, ${sessionId}, ${device.runner_id}, now())
    `;
  } else if (device.user_id) {
    // Community mode → community_live_position + community_route_positions
    await sql`
      INSERT INTO community_live_position
        (user_id, display_name, activity_type, lat, lng, speed, accuracy, heading, is_active, updated_at)
      VALUES
        (${device.user_id}, ${device.display_name}, ${device.activity_type},
         ${latitude}, ${longitude}, ${spd}, ${acc}, ${hdg}, true, now())
      ON CONFLICT (user_id) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            activity_type = EXCLUDED.activity_type,
            lat           = EXCLUDED.lat,
            lng           = EXCLUDED.lng,
            speed         = EXCLUDED.speed,
            accuracy      = EXCLUDED.accuracy,
            heading       = EXCLUDED.heading,
            is_active     = true,
            updated_at    = now()
    `;
    await sql`
      INSERT INTO community_route_positions
        (user_id, display_name, activity_type, lat, lng, speed, accuracy, heading, session_id, recorded_at)
      VALUES
        (${device.user_id}, ${device.display_name}, ${device.activity_type},
         ${latitude}, ${longitude}, ${spd}, ${acc}, ${hdg}, ${sessionId}, now())
    `;
  }

  return res.json({ ok: true });
}

// ─── TRACK (pageview / click / event — pubblico, no auth) ─────────────────────
const ALLOWED_EVENTS = new Set(["pageview", "page_leave", "click", "donazione", "iscrizione", "login", "registrazione"]);

async function track(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { visitor_id, session_id, path, referrer, screen_w, screen_h, language, event_type, event_data } = req.body ?? {};
  if (!session_id || !path) return res.status(400).json({ error: "session_id e path richiesti" });

  const ua = (req.headers["user-agent"] ?? "").slice(0, 512);
  const country = (req.headers["x-vercel-ip-country"] as string) ?? null;
  const city = (req.headers["x-vercel-ip-city"] as string) ?? null;
  const region = (req.headers["x-vercel-ip-country-region"] as string) ?? null;
  const evType = ALLOWED_EVENTS.has(event_type) ? event_type : "pageview";

  await sql`
    INSERT INTO page_views (visitor_id, session_id, path, referrer, user_agent, screen_w, screen_h, language, country, city, region, event_type, event_data)
    VALUES (${visitor_id?.slice(0, 64) ?? null}, ${session_id}, ${path.slice(0, 512)}, ${referrer?.slice(0, 1024) ?? null}, ${ua},
            ${screen_w ?? null}, ${screen_h ?? null}, ${language?.slice(0, 16) ?? null},
            ${country}, ${city ? decodeURIComponent(city) : null}, ${region}, ${evType}, ${event_data?.slice(0, 512) ?? null})
  `;
  return res.json({ ok: true });
}

// ─── ANALYTICS (dashboard admin — richiede auth) ─────────────────────────────
async function analytics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  const range = (req.query.range as string) ?? "7d";
  let interval = "7 days";
  if (range === "24h") interval = "1 day";
  else if (range === "30d") interval = "30 days";
  else if (range === "90d") interval = "90 days";

  // Query parallele
  const [
    totalViews,
    uniqueSessions,
    uniqueVisitors,
    returningVisitors,
    topPages,
    dailyViews,
    topReferrers,
    topCountries,
    topCities,
    recentClicks,
    deviceBreakdown,
    avgDuration,
    conversions,
    bounceRate,
  ] = await Promise.all([
    // Totale visite
    sql`SELECT COUNT(*)::int AS count FROM page_views
        WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval`,
    // Sessioni uniche
    sql`SELECT COUNT(DISTINCT session_id)::int AS count FROM page_views
        WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval`,
    // Visitatori unici (visitor_id persistente)
    sql`SELECT COUNT(DISTINCT visitor_id)::int AS count FROM page_views
        WHERE event_type = 'pageview' AND visitor_id IS NOT NULL AND created_at > now() - ${interval}::interval`,
    // Visitatori ricorrenti (visitor_id con sessioni in periodi diversi)
    sql`SELECT COUNT(*)::int AS count FROM (
          SELECT visitor_id FROM page_views
          WHERE event_type = 'pageview' AND visitor_id IS NOT NULL AND created_at > now() - ${interval}::interval
          GROUP BY visitor_id HAVING COUNT(DISTINCT session_id) > 1
        ) sub`,
    // Top pagine
    sql`SELECT path, COUNT(*)::int AS views
        FROM page_views WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
        GROUP BY path ORDER BY views DESC LIMIT 20`,
    // Visite giornaliere
    sql`SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS views
        FROM page_views WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
        GROUP BY day ORDER BY day`,
    // Top referrer
    sql`SELECT referrer, COUNT(*)::int AS count
        FROM page_views WHERE event_type = 'pageview' AND referrer IS NOT NULL AND referrer != ''
        AND created_at > now() - ${interval}::interval
        GROUP BY referrer ORDER BY count DESC LIMIT 10`,
    // Top paesi
    sql`SELECT country, COUNT(*)::int AS count
        FROM page_views WHERE event_type = 'pageview' AND country IS NOT NULL
        AND created_at > now() - ${interval}::interval
        GROUP BY country ORDER BY count DESC LIMIT 10`,
    // Top città
    sql`SELECT city, country, COUNT(*)::int AS count
        FROM page_views WHERE event_type = 'pageview' AND city IS NOT NULL
        AND created_at > now() - ${interval}::interval
        GROUP BY city, country ORDER BY count DESC LIMIT 15`,
    // Click recenti
    sql`SELECT path, event_data, created_at
        FROM page_views WHERE event_type = 'click' AND created_at > now() - ${interval}::interval
        ORDER BY created_at DESC LIMIT 30`,
    // Device breakdown (mobile vs desktop via screen width)
    sql`SELECT
          CASE WHEN screen_w IS NULL THEN 'unknown'
               WHEN screen_w < 768 THEN 'mobile'
               WHEN screen_w < 1024 THEN 'tablet'
               ELSE 'desktop' END AS device,
          COUNT(*)::int AS count
        FROM page_views WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
        GROUP BY device ORDER BY count DESC`,
    // Tempo medio per pagina (secondi)
    sql`SELECT ROUND(AVG(event_data::int))::int AS avg_seconds
        FROM page_views WHERE event_type = 'page_leave' AND event_data ~ '^[0-9]+$'
        AND created_at > now() - ${interval}::interval`,
    // Conversioni (donazioni, iscrizioni, registrazioni)
    sql`SELECT event_type, COUNT(*)::int AS count, event_data
        FROM page_views
        WHERE event_type IN ('donazione', 'iscrizione', 'registrazione', 'login')
        AND created_at > now() - ${interval}::interval
        GROUP BY event_type, event_data ORDER BY count DESC`,
    // Bounce rate (sessioni con una sola pageview)
    sql`SELECT
          COUNT(*)::int AS total_sessions,
          COUNT(*) FILTER (WHERE pv_count = 1)::int AS bounce_sessions
        FROM (
          SELECT session_id, COUNT(*)::int AS pv_count
          FROM page_views WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
          GROUP BY session_id
        ) sub`,
  ]);

  const totalSessions = bounceRate[0]?.total_sessions ?? 0;
  const bounceSessions = bounceRate[0]?.bounce_sessions ?? 0;

  return res.json({
    range,
    totalViews: totalViews[0]?.count ?? 0,
    uniqueSessions: uniqueSessions[0]?.count ?? 0,
    uniqueVisitors: uniqueVisitors[0]?.count ?? 0,
    returningVisitors: returningVisitors[0]?.count ?? 0,
    bounceRate: totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0,
    avgDuration: avgDuration[0]?.avg_seconds ?? 0,
    topPages,
    dailyViews,
    topReferrers,
    topCountries,
    topCities,
    recentClicks,
    deviceBreakdown,
    conversions,
  });
}

// ─── ANALYTICS LIVE (visitatori in tempo reale) ──────────────────────────────
async function analyticsLive(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  const [count, activeSessions, activePages] = await Promise.all([
    // Sessioni attive negli ultimi 5 minuti
    sql`SELECT COUNT(DISTINCT session_id)::int AS count
        FROM page_views WHERE created_at > now() - interval '5 minutes'`,
    // Dettaglio sessioni attive con ultima pagina visitata
    sql`SELECT DISTINCT ON (session_id)
          session_id, path, country, city, created_at,
          CASE WHEN screen_w IS NULL THEN 'unknown'
               WHEN screen_w < 768 THEN 'mobile'
               WHEN screen_w < 1024 THEN 'tablet'
               ELSE 'desktop' END AS device
        FROM page_views
        WHERE created_at > now() - interval '5 minutes'
        ORDER BY session_id, created_at DESC`,
    // Pagine attive ora (aggregate)
    sql`SELECT path, COUNT(DISTINCT session_id)::int AS visitors
        FROM page_views
        WHERE created_at > now() - interval '5 minutes'
        GROUP BY path ORDER BY visitors DESC LIMIT 10`,
  ]);

  return res.json({
    online: count[0]?.count ?? 0,
    sessions: activeSessions,
    activePages,
  });
}

// ─── ANALYTICS JOURNEYS (percorsi utente per sessione) ────────────────────────
async function analyticsJourneys(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 50);

  // Ultime sessioni con il loro percorso pagine
  const sessions = await sql`
    SELECT session_id, visitor_id, country, city,
           CASE WHEN screen_w IS NULL THEN 'unknown'
                WHEN screen_w < 768 THEN 'mobile'
                WHEN screen_w < 1024 THEN 'tablet'
                ELSE 'desktop' END AS device,
           MIN(created_at) AS started_at,
           MAX(created_at) AS ended_at,
           json_agg(json_build_object(
             'path', path, 'event_type', event_type, 'event_data', event_data, 'at', created_at
           ) ORDER BY created_at) AS events
    FROM page_views
    WHERE created_at > now() - interval '7 days'
    GROUP BY session_id, visitor_id, country, city, device
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;

  return res.json({ sessions });
}

// ─── ANALYTICS FUNNEL (metriche aggregate per decisioni) ──────────────────────
async function analyticsFunnel(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  const range = (req.query.range as string) ?? "7d";
  let interval = "7 days";
  if (range === "24h") interval = "1 day";
  else if (range === "30d") interval = "30 days";
  else if (range === "90d") interval = "90 days";

  const [
    entryPages,
    exitPages,
    topPaths,
    funnelDona,
    conversionByReferrer,
  ] = await Promise.all([
    // ── Pagine di ingresso (prima pageview di ogni sessione) ──
    sql`SELECT path, COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (session_id) session_id, path
          FROM page_views
          WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
          ORDER BY session_id, created_at ASC
        ) first_pages
        GROUP BY path ORDER BY count DESC LIMIT 10`,

    // ── Pagine di uscita (ultima pageview di ogni sessione) ──
    sql`SELECT path, COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (session_id) session_id, path
          FROM page_views
          WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
          ORDER BY session_id, created_at DESC
        ) last_pages
        GROUP BY path ORDER BY count DESC LIMIT 10`,

    // ── Percorsi più frequenti (top sequenze di 2-3 pagine) ──
    sql`WITH session_pages AS (
          SELECT session_id,
                 array_agg(path ORDER BY created_at) AS pages
          FROM page_views
          WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval
          GROUP BY session_id
        ),
        pairs AS (
          SELECT pages[1] || ' → ' || pages[2] AS path_seq, 2 AS depth
          FROM session_pages WHERE array_length(pages, 1) >= 2
          UNION ALL
          SELECT pages[1] || ' → ' || pages[2] || ' → ' || pages[3], 3
          FROM session_pages WHERE array_length(pages, 1) >= 3
        )
        SELECT path_seq, COUNT(*)::int AS count
        FROM pairs
        GROUP BY path_seq HAVING COUNT(*) >= 2
        ORDER BY count DESC LIMIT 15`,

    // ── Funnel donazione: visite /dona → completamento ──
    sql`SELECT
          (SELECT COUNT(DISTINCT session_id)::int FROM page_views
           WHERE event_type = 'pageview' AND created_at > now() - ${interval}::interval) AS total_sessions,
          (SELECT COUNT(DISTINCT session_id)::int FROM page_views
           WHERE event_type = 'pageview' AND path = '/dona'
           AND created_at > now() - ${interval}::interval) AS visited_dona,
          (SELECT COUNT(DISTINCT session_id)::int FROM page_views
           WHERE event_type = 'donazione'
           AND created_at > now() - ${interval}::interval) AS completed_dona,
          (SELECT COUNT(DISTINCT session_id)::int FROM page_views
           WHERE event_type = 'pageview' AND path = '/iscriviti'
           AND created_at > now() - ${interval}::interval) AS visited_iscriviti,
          (SELECT COUNT(DISTINCT session_id)::int FROM page_views
           WHERE event_type = 'iscrizione'
           AND created_at > now() - ${interval}::interval) AS completed_iscriviti`,

    // ── Tasso conversione per referrer ──
    sql`WITH ref_sessions AS (
          SELECT DISTINCT ON (session_id) session_id, referrer
          FROM page_views
          WHERE event_type = 'pageview' AND referrer IS NOT NULL AND referrer != ''
          AND created_at > now() - ${interval}::interval
          ORDER BY session_id, created_at ASC
        ),
        ref_conversions AS (
          SELECT DISTINCT session_id
          FROM page_views
          WHERE event_type IN ('donazione', 'iscrizione')
          AND created_at > now() - ${interval}::interval
        )
        SELECT
          r.referrer,
          COUNT(DISTINCT r.session_id)::int AS sessions,
          COUNT(DISTINCT c.session_id)::int AS conversions
        FROM ref_sessions r
        LEFT JOIN ref_conversions c ON r.session_id = c.session_id
        GROUP BY r.referrer
        ORDER BY sessions DESC LIMIT 10`,
  ]);

  const f = funnelDona[0] ?? {};

  return res.json({
    range,
    entryPages,
    exitPages,
    topPaths,
    funnel: {
      totalSessions: f.total_sessions ?? 0,
      visitedDona: f.visited_dona ?? 0,
      completedDona: f.completed_dona ?? 0,
      donaDropOff: (f.visited_dona ?? 0) > 0
        ? Math.round(((f.visited_dona - (f.completed_dona ?? 0)) / f.visited_dona) * 100)
        : 0,
      visitedIscriviti: f.visited_iscriviti ?? 0,
      completedIscriviti: f.completed_iscriviti ?? 0,
      iscrivitiDropOff: (f.visited_iscriviti ?? 0) > 0
        ? Math.round(((f.visited_iscriviti - (f.completed_iscriviti ?? 0)) / f.visited_iscriviti) * 100)
        : 0,
    },
    conversionByReferrer,
  });
}

// ─── PAYPAL ──────────────────────────────────────────────────────────────────

const PAYPAL_BASE = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal non configurato");

  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error("Errore autenticazione PayPal");
  const data = await resp.json();
  return data.access_token;
}

async function paypalCreateOrder(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { donazione_id } = req.body ?? {};
  if (!donazione_id) {
    return res.status(400).json({ error: "donazione_id richiesto" });
  }

  try {
    // Importo dalla donazione nel DB (ignora il frontend per sicurezza)
    const [don] = await sql`
      SELECT importo_euro FROM donazioni WHERE id = ${donazione_id} AND stato = 'pendente'
    `;
    if (!don) {
      return res.status(404).json({ error: "Donazione non trovata o già completata" });
    }
    const amount = Number(don.importo_euro);

    const accessToken = await getPayPalAccessToken();

    const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: String(donazione_id),
          amount: {
            currency_code: "EUR",
            value: amount.toFixed(2),
          },
          description: "Donazione 1000 km di Gratitudine — Komen Italia",
        }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("PayPal create order error:", err);
      return res.status(502).json({ error: "Errore creazione ordine PayPal" });
    }

    const order = await resp.json();

    // Save PayPal order ID on the donation
    await sql`
      UPDATE donazioni SET checkout_ref = ${order.id}
      WHERE id = ${donazione_id}
    `;

    return res.json({ id: order.id });
  } catch (err: any) {
    console.error("PayPal create order exception:", err);
    return res.status(500).json({ error: "Errore interno. Riprova." });
  }
}

async function paypalCaptureOrder(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { order_id } = req.body ?? {};
  if (!order_id) return res.status(400).json({ error: "order_id richiesto" });

  try {
    const accessToken = await getPayPalAccessToken();

    const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("PayPal capture error:", err);
      return res.status(502).json({ error: "Errore cattura pagamento PayPal" });
    }

    const capture = await resp.json();

    if (capture.status !== "COMPLETED") {
      return res.status(400).json({ error: "Pagamento non completato", status: capture.status });
    }

    // Verifica che l'importo catturato corrisponda alla donazione nel DB
    const capturedAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    const [donCheck] = await sql`
      SELECT importo_euro FROM donazioni WHERE checkout_ref = ${order_id} AND stato = 'pendente'
    `;
    if (donCheck && capturedAmount && Number(capturedAmount) !== Number(donCheck.importo_euro)) {
      console.error(`PayPal amount mismatch: captured=${capturedAmount}, expected=${donCheck.importo_euro}`);
      return res.status(400).json({ error: "Importo pagamento non corrispondente" });
    }

    // Update donazione → completata (idempotent via checkout_ref)
    const [don] = await sql`
      UPDATE donazioni SET stato = 'completata'
      WHERE checkout_ref = ${order_id} AND stato != 'completata'
      RETURNING importo_euro, nome, email, progetto
    `;

    if (don) {
      if (don.progetto !== "Sponsor Sostenitori del Cammino") {
        await sql`
          UPDATE raccolta_fondi
          SET importo_euro = importo_euro + ${don.importo_euro},
              donatori     = donatori + 1,
              updated_at   = now()
          WHERE id = 1
        `;
      }

      // Send thank-you email (fire-and-forget)
      sendThankYouEmail({
        to: don.email,
        nome: don.nome,
        importo: Number(don.importo_euro),
        progetto: don.progetto,
      }).catch(() => {});
    }

    return res.json({ ok: true, status: "COMPLETED" });
  } catch (err: any) {
    console.error("PayPal capture exception:", err);
    return res.status(500).json({ error: "Errore interno. Riprova." });
  }
}
