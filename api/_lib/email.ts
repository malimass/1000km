import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "1000km di Gratitudine <noreply@1000kmdigratitudine.it>";

// ─── Email di ringraziamento dopo donazione completata ─────────────────────

export async function sendThankYouEmail(opts: {
  to: string;
  nome: string;
  importo: number;
  progetto: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY non configurata — email di ringraziamento non inviata");
    return;
  }

  const isSostenitore = opts.progetto === "Sponsor Sostenitori del Cammino";
  const subject = isSostenitore
    ? `Grazie per il tuo sostegno, ${opts.nome}!`
    : `Grazie per la tua donazione, ${opts.nome}!`;

  const html = isSostenitore
    ? `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#e11d73;font-size:24px;">Grazie, ${opts.nome}!</h1>
        <p>Il tuo contributo di <strong>€${opts.importo.toFixed(2)}</strong> come <strong>Sostenitore del Cammino</strong> è stato ricevuto con successo.</p>
        <p>Grazie per rendere possibile questa impresa! Il tuo supporto ci aiuta a coprire le spese del cammino e a portare avanti il progetto <strong>1000 km di Gratitudine</strong>.</p>
        <p>Il tuo logo e la tua azienda appariranno tra i sostenitori ufficiali del progetto.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#888;font-size:12px;">1000 km di Gratitudine — Un cammino di fede, gratitudine e speranza.</p>
      </div>
    `
    : `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#e11d73;font-size:24px;">Grazie, ${opts.nome}!</h1>
        <p>La tua donazione di <strong>€${opts.importo.toFixed(2)}</strong> al progetto <strong>${opts.progetto}</strong> è stata completata con successo.</p>
        <p>I fondi saranno interamente devoluti a <strong>Komen Italia — Comitato Emilia Romagna</strong> per la prevenzione e la ricerca contro il tumore al seno.</p>
        <p>Ogni tuo euro fa la differenza. Grazie di cuore!</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#888;font-size:12px;">1000 km di Gratitudine — Un cammino di fede, gratitudine e speranza.</p>
      </div>
    `;

  try {
    await resend.emails.send({ from: FROM, to: opts.to, subject, html });
  } catch (err) {
    console.error("Errore invio email di ringraziamento:", err);
  }
}

// ─── Email promemoria per donazione pendente ───────────────────────────────

export async function sendPendingReminderEmail(opts: {
  to: string;
  nome: string;
  importo: number;
  progetto: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY non configurata — email promemoria non inviata");
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h1 style="color:#e11d73;font-size:24px;">Ciao ${opts.nome},</h1>
      <p>Abbiamo notato che la tua donazione di <strong>€${opts.importo.toFixed(2)}</strong> al progetto <strong>${opts.progetto}</strong> è rimasta in sospeso.</p>
      <p>Se hai avuto difficoltà con il pagamento, puoi riprovare visitando la nostra pagina di donazione:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://www.1000kmdigratitudine.it/dona" style="background:#e11d73;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Completa la donazione</a>
      </p>
      <p>Se hai già completato il pagamento o non desideri procedere, puoi ignorare questa email.</p>
      <p>Grazie per il tuo interesse verso la nostra causa!</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#888;font-size:12px;">1000 km di Gratitudine — Un cammino di fede, gratitudine e speranza.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `La tua donazione è in sospeso — ${opts.nome}`,
      html,
    });
  } catch (err) {
    console.error("Errore invio email promemoria:", err);
  }
}
