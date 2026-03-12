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

// ─── Email promemoria per donazione pendente (4 livelli) ───────────────────

// Intervalli: 1° dopo 2gg, 2° dopo 7gg, 3° dopo 14gg, 4° (ultimo) dopo 28gg
export const REMINDER_SCHEDULE = [
  { afterDays: 2,  level: 1 },
  { afterDays: 7,  level: 2 },
  { afterDays: 14, level: 3 },
  { afterDays: 28, level: 4 },
] as const;

const REMINDER_TEMPLATES: Record<number, { subject: (nome: string) => string; body: (nome: string, importo: string, progetto: string) => string }> = {
  1: {
    subject: (nome) => `La tua donazione è in sospeso — ${nome}`,
    body: (nome, importo, progetto) => `
      <h1 style="color:#e11d73;font-size:24px;">Ciao ${nome},</h1>
      <p>Abbiamo notato che la tua donazione di <strong>€${importo}</strong> al progetto <strong>${progetto}</strong> è rimasta in sospeso.</p>
      <p>Se hai avuto difficoltà con il pagamento, puoi riprovare visitando la nostra pagina di donazione:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://www.1000kmdigratitudine.it/dona" style="background:#e11d73;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Completa la donazione</a>
      </p>
      <p>Se hai già completato il pagamento o non desideri procedere, puoi ignorare questa email.</p>
      <p>Grazie per il tuo interesse verso la nostra causa!</p>
    `,
  },
  2: {
    subject: (nome) => `${nome}, il tuo sostegno può fare la differenza`,
    body: (nome, importo, progetto) => `
      <h1 style="color:#e11d73;font-size:24px;">Ciao ${nome},</h1>
      <p>Ti scriviamo per ricordarti che la tua donazione di <strong>€${importo}</strong> al progetto <strong>${progetto}</strong> non è ancora stata completata.</p>
      <p>Ogni contributo, grande o piccolo, aiuta concretamente la prevenzione e la ricerca contro il tumore al seno.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://www.1000kmdigratitudine.it/dona" style="background:#e11d73;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Completa la donazione</a>
      </p>
      <p>Se non desideri procedere, puoi semplicemente ignorare questa email.</p>
    `,
  },
  3: {
    subject: (nome) => `${nome}, mancano pochi passi per sostenere la ricerca`,
    body: (nome, importo, progetto) => `
      <h1 style="color:#e11d73;font-size:24px;">Ciao ${nome},</h1>
      <p>La tua donazione di <strong>€${importo}</strong> al progetto <strong>${progetto}</strong> è ancora in attesa.</p>
      <p>Noi continuiamo a camminare per la prevenzione. Con il tuo contributo possiamo trasformare ogni passo in speranza per molte donne.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://www.1000kmdigratitudine.it/dona" style="background:#e11d73;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Dona ora</a>
      </p>
      <p>Se preferisci non procedere, ignora pure questa email. Non ti scriveremo più.</p>
    `,
  },
  4: {
    subject: (nome) => `Ultimo promemoria — ${nome}`,
    body: (nome, importo, progetto) => `
      <h1 style="color:#e11d73;font-size:24px;">Ciao ${nome},</h1>
      <p>Questo è l'ultimo promemoria per la tua donazione di <strong>€${importo}</strong> al progetto <strong>${progetto}</strong>.</p>
      <p>Se desideri ancora sostenere la prevenzione e la ricerca contro il tumore al seno, puoi completare la donazione quando vuoi:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://www.1000kmdigratitudine.it/dona" style="background:#e11d73;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Dona ora</a>
      </p>
      <p>Grazie per il tuo interesse. Non riceverai altri promemoria.</p>
    `,
  },
};

export async function sendPendingReminderEmail(opts: {
  to: string;
  nome: string;
  importo: number;
  progetto: string;
  reminderLevel: number;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY non configurata — email promemoria non inviata");
    return;
  }

  const template = REMINDER_TEMPLATES[opts.reminderLevel] ?? REMINDER_TEMPLATES[1];
  const importoStr = opts.importo.toFixed(2);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      ${template.body(opts.nome, importoStr, opts.progetto)}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#888;font-size:12px;">1000 km di Gratitudine — Un cammino di fede, gratitudine e speranza.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: template.subject(opts.nome),
      html,
    });
  } catch (err) {
    console.error(`Errore invio email promemoria livello ${opts.reminderLevel}:`, err);
  }
}
