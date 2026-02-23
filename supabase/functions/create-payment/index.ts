// ─── Supabase Edge Function: create-payment ──────────────────────────────────
// Crea una sessione Stripe Checkout e salva l'iscrizione nel DB.
//
// Segreti necessari (Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY          → Stripe Dashboard → Developers → API Keys
//   SUPABASE_URL               → automatico in Edge Functions
//   SUPABASE_SERVICE_ROLE_KEY  → automatico in Edge Functions
//
// Deploy:
//   supabase functions deploy create-payment

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Gestione preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe non configurato sul server." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      tappa_numero,
      nome,
      cognome,
      email,
      telefono,
      taglia_maglia,
      donazione_euro,
      success_url,
      cancel_url,
    } = await req.json();

    // Validazione base
    if (!tappa_numero || !nome || !cognome || !email || !taglia_maglia || !donazione_euro) {
      return new Response(
        JSON.stringify({ error: "Dati mancanti." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (donazione_euro < 30) {
      return new Response(
        JSON.stringify({ error: "La donazione minima è €30." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Salva iscrizione con stato "in_attesa"
    const { data: reg, error: insertError } = await supabase
      .from("iscrizioni")
      .insert({
        tappa_numero,
        nome,
        cognome,
        email: email.toLowerCase(),
        telefono: telefono || null,
        vuole_maglia: true,
        taglia_maglia,
        donazione_euro,
        pagamento_stato: "in_attesa",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      throw new Error(insertError.message);
    }

    // Crea sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Tappa ${tappa_numero} · 1000km di Gratitudine`,
              description: `Iscrizione + Maglia ufficiale taglia ${taglia_maglia} — Beneficenza Komen Italia`,
              images: [],
            },
            unit_amount: Math.round(donazione_euro * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata: {
        iscrizione_id: reg.id,
        tappa_numero: String(tappa_numero),
        taglia_maglia,
      },
      success_url: `${success_url}?tappa=${tappa_numero}&nome=${encodeURIComponent(nome)}&tipo=maglia&id=${reg.id}`,
      cancel_url: `${cancel_url}`,
      locale: "it",
      payment_intent_data: {
        description: `1000km di Gratitudine – Tappa ${tappa_numero} – ${nome} ${cognome}`,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, id: reg.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("create-payment error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore server." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
