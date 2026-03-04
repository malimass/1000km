import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { sql } from "./_lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    tappa_numero, nome, cognome, email, telefono,
    vuole_maglia, taglia_maglia, donazione_euro,
    success_url, cancel_url,
  } = req.body ?? {};

  if (!tappa_numero || !nome || !cognome || !email || !donazione_euro)
    return res.status(400).json({ error: "Parametri mancanti" });

  try {
    // Prima inserisci la prenotazione come in_attesa
    const rows = await sql`
      INSERT INTO iscrizioni
        (tappa_numero, nome, cognome, email, telefono, vuole_maglia, taglia_maglia,
         donazione_euro, pagamento_stato)
      VALUES
        (${tappa_numero}, ${nome}, ${cognome}, ${email}, ${telefono ?? null},
         ${vuole_maglia ?? false}, ${taglia_maglia ?? null},
         ${donazione_euro}, 'in_attesa')
      RETURNING id
    `;
    const iscrizioneId = (rows[0] as any).id;

    // Crea sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Iscrizione Tappa ${tappa_numero} — ${nome} ${cognome}`,
            },
            unit_amount: Math.round(Number(donazione_euro) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { iscrizione_id: iscrizioneId },
      success_url: success_url ?? `${req.headers.origin}/grazie`,
      cancel_url: cancel_url ?? `${req.headers.origin}/iscriviti`,
    });

    // Aggiorna con stripe_session_id
    await sql`
      UPDATE iscrizioni
      SET stripe_session_id = ${session.id}
      WHERE id = ${iscrizioneId}
    `;

    return res.json({ url: session.url, session_id: session.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Errore pagamento" });
  }
}
