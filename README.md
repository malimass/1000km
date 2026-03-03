# 1000 KM di Gratitudine

Sito ufficiale della raccolta fondi e cammino solidale **1000kmdigratitudine** — da Bologna alla Calabria, 18 Aprile – 1 Maggio 2026.

## Stack tecnologico

- **Vite** + **TypeScript** + **React**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** (animazioni e parallax)
- **React Router DOM** (routing SPA)
- **Lucide React** (icone)

## Sviluppo locale

```sh
git clone <YOUR_GIT_URL>
cd gratitude-path
npm install
npm run dev
```

## Struttura pagine

| Route | Descrizione |
|---|---|
| `/` | Home page |
| `/il-percorso` | Mappa e dettagli del percorso |
| `/madonna-di-san-luca` | Santuario di partenza — Bologna |
| `/ss-crocifisso-nero` | Santuario di arrivo — Terranova Sappo Minulio |
| `/notizie` | Blog / aggiornamenti |
| `/servizi` | Servizi per i partecipanti |
| `/sostenitori` | Aziende e privati sostenitori |
| `/contatti` | Modulo contatti |
| `/dona` | Pagina donazione |
| `/partecipa` | Registrazione community |
| `/atleta/accedi` | Login / registrazione atleta |
| `/coach-login` | Login coach |
| `/admin-login` | Pannello amministratore |

## Changelog

### 2026-03-03
- **Login dropdown in navbar** — il bottone Login in header è ora un menu a tendina con tre voci:
  - *Area Atleta* → `/atleta/accedi`
  - *Area Coach* → `/coach-login`
  - *Admin* → `/admin-login`
  - Desktop: hover dropdown con icone e descrizioni
  - Mobile: accordion con animazione
- File modificato: `src/components/Layout.tsx`

### Precedente
- Implementazione pagina Home con hero parallax, countdown, sezione "Perché", numeri KPI, santuari, "Come aiutare" e CTA finale
- Navbar sticky con dropdown "I Santuari", link "Partecipa" evidenziato e bottone DONA ORA
- Footer con link utili e copyright
- Mobile: sticky bar DONA ORA in basso
- Componenti: `AnimatedSection`, `CountUp`, `Countdown`, `Layout`
