# Gratitude Path — Panoramica del Codebase

## 1. Cos'è il Progetto

**Gratitude Path** (`1000kmdigratitudine`) è un sito web per una **raccolta fondi e pellegrinaggio spirituale** di 1000 km da Bologna a Reggio Calabria, previsto dal **18 aprile al 1° maggio 2026**. I proventi vanno a **Komen Italia** (ricerca sul cancro al seno).

**Funzionalità principali:**
- Sito informativo con hero page animata
- Mappa interattiva del percorso (14 tappe)
- Countdown al giorno di partenza
- Tracking GPS live durante il cammino (via LocaToWeb)
- Pagina donazioni con tier multipli
- Dashboard admin protetta per gestire social media, foto/video e impostazioni

---

## 2. Struttura del Progetto

```
/home/user/1000km/
├── src/
│   ├── pages/                 # Pagine/route dell'app
│   │   ├── Index.tsx          # Home page
│   │   ├── Percorso.tsx       # Pagina percorso con mappa e tracking live
│   │   ├── SanLuca.tsx        # Info santuario Madonna di San Luca
│   │   ├── CrocifissoNero.tsx # Info santuario SS Crocifisso Nero
│   │   ├── Dona.tsx           # Pagina donazioni
│   │   ├── Sponsor.tsx        # Pagina sponsor
│   │   ├── Contatti.tsx       # Pagina contatti
│   │   ├── AdminLogin.tsx     # Login admin (JWT)
│   │   ├── AdminLive.tsx      # Dashboard admin (42KB, funzionalità complete)
│   │   └── NotFound.tsx       # Pagina 404
│   ├── components/
│   │   ├── Layout.tsx         # Layout principale (header, footer, nav mobile)
│   │   ├── RouteMap.tsx       # Mappa Leaflet interattiva
│   │   ├── AnimatedSection.tsx # Wrapper animazioni scroll (Framer Motion)
│   │   ├── CountUp.tsx        # Animazione contatore numerico
│   │   ├── Countdown.tsx      # Timer countdown alla partenza
│   │   ├── ScrollToTop.tsx    # Auto-scroll in alto al cambio route
│   │   ├── NavLink.tsx        # Link di navigazione con stato attivo
│   │   ├── ProtectedAdminRoute.tsx # Guard per route admin
│   │   └── ui/                # Componenti shadcn/ui (50+ file)
│   ├── lib/
│   │   ├── api.ts             # Client API (fetch + JWT auth)
│   │   ├── auth.ts            # Autenticazione (login, getCurrentUser)
│   │   ├── adminSettings.ts   # Gestione impostazioni admin (API + localStorage)
│   │   ├── ltwStore.ts        # Helpers localStorage per URL LocaToWeb
│   │   └── utils.ts           # Funzioni di utilità
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── assets/                # Immagini hero
│   ├── test/
│   │   ├── example.test.ts
│   │   └── setup.ts
│   ├── App.tsx                # Configurazione route (React Router v6)
│   ├── main.tsx               # Entry point
│   ├── App.css                # Stili globali
│   └── index.css              # Setup Tailwind CSS
├── api/                       # API routes Vercel (serverless)
│   ├── _lib/db.ts             # Client Neon PostgreSQL
│   ├── _lib/auth.ts           # JWT sign/verify
│   └── router.ts              # Tutte le API routes
├── public/                    # Asset statici
├── dist/                      # Output build
├── neon-schema.sql            # Schema database Neon PostgreSQL
├── migrations/                # Migrazioni database
├── .env.local.example         # Template variabili d'ambiente
├── package.json               # Dipendenze e script
├── vite.config.ts             # Config Vite
├── tailwind.config.ts         # Config Tailwind CSS (colori custom, font)
└── vercel.json                # Config deployment Vercel
```

---

## 3. Stack Tecnologico

### Frontend
| Tecnologia | Versione | Uso |
|---|---|---|
| React | 18 | Framework UI |
| TypeScript | — | Tipizzazione statica |
| Vite | — | Bundler/dev server |
| React Router | v6 | Routing client-side |
| Tailwind CSS | — | Styling utility-first |
| shadcn/ui | — | Componenti accessibili e composabili |
| Framer Motion | — | Animazioni (parallax, fade-in, scroll) |
| Leaflet + React Leaflet | — | Mappa interattiva |
| React Hook Form + Zod | — | Form e validazione |
| TanStack Query | — | Gestione stato server |

### Backend / Servizi
| Servizio | Uso |
|---|---|
| **Neon PostgreSQL** | Database serverless |
| **Vercel Serverless Functions** | API routes (Node.js) |
| **Cloudinary** | Hosting e trasformazione immagini/video |
| **Meta Graph API** | Post su Facebook e Instagram |
| **Google Maps Routes API** | Calcolo percorsi pedonali |
| **LocaToWeb** | Tracking GPS live (iframe embed) |

---

## 4. Route dell'Applicazione

| Percorso | Componente | Descrizione |
|---|---|---|
| `/` | `Index` | Home page (hero, KPI, santuari, CTA) |
| `/il-percorso` | `Percorso` | Mappa percorso + tracking live |
| `/madonna-di-san-luca` | `SanLuca` | Storia del santuario di Bologna |
| `/ss-crocifisso-nero` | `CrocifissoNero` | Storia del santuario calabrese |
| `/sponsor` | `Sponsor` | Pacchetti di sponsorizzazione |
| `/contatti` | `Contatti` | Modulo di contatto |
| `/dona` | `Dona` | Tier donazione e pagamento |
| `/admin-login` | `AdminLogin` | Login admin (JWT) |
| `/admin-live` | `AdminLive` | **Protetta** — Dashboard admin |
| `*` | `NotFound` | Pagina 404 |

---

## 5. Database (Neon PostgreSQL)

Schema completo in `neon-schema.sql`. Tabelle principali:
- `users` — Utenti con ruoli (athlete, coach, admin)
- `admin_settings` — Impostazioni admin per utente
- `iscrizioni` — Iscrizioni alle tappe
- `notizie` — News feed
- `raccolta_fondi` — Barra donazioni
- `live_position` — Posizione GPS runner in tempo reale
- `route_positions` — Traccia percorso GPS
- `profiles` — Profili utenti community
- `coach_sessions` — Sessioni di allenamento
- `saved_percorsi` — Percorsi salvati dagli utenti

**Strategia di storage ibrida:** Neon come source of truth + localStorage come cache locale.

---

## 6. API

Tutte le API sono in `api/router.ts` (Vercel Serverless Functions):
- **Auth** — `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- **Notizie** — `/api/notizie`
- **Iscrizioni** — `/api/iscrizioni`
- **Live tracking** — `/api/live-position`, `/api/route-positions`
- **Community** — `/api/community-live`, `/api/community-route`
- **Coach** — `/api/coach-sessions`, `/api/athlete-profile`
- **Percorsi** — `/api/saved-percorsi`
- **Cloudinary** — Upload immagini/video
- **Meta Graph API** — Post social

---

## 7. Componenti Chiave

### `RouteMap.tsx`
Mappa Leaflet con 15 waypoint (tappe del percorso), polilinea del tracciato, marker personalizzati e animazione fly-to. Coordinate da Bologna a Reggio Calabria.

### `AdminLive.tsx` (42KB)
Dashboard admin completa con:
- Gestione URL di tracking LocaToWeb
- Post testo/foto/video su Facebook e Instagram
- Upload media su Cloudinary
- Impostazioni API (token, ID pagina, credenziali Cloudinary)
- Dati delle 14 tappe per generazione automatica caption

### `adminSettings.ts`
Gestione ibrida impostazioni: carica da API, fallback a localStorage, sincronizza al salvataggio.

### `Countdown.tsx`
Timer real-time che mostra giorni/ore/minuti/secondi alla partenza (18 aprile 2026, ore 06:00 UTC).

---

## 8. Stile e Design

**Font:**
- Headings: **Cinzel** (serif elegante)
- Body: **Montserrat** (sans-serif moderno)

**Palette colori custom (Tailwind):**
- `primary` — Navy scuro
- `accent` — Arancione
- `dona` — Rosa (per CTA donazione)

**Animazioni:** fade-in-up, count-up, parallax, flip (via Framer Motion)

---

## 9. Logica di Business

### Countdown / Tracking Live
- **Prima** del 18 apr 2026 → mostra countdown
- **Durante** (18 apr – 1 mag 2026) → mostra tracking GPS live
- **Dopo** → mostra risultati

### Donazioni
- Obiettivo: **€50.000**
- Progress bar animata nella home

### Tappe (14 stage)
- Km cumulativi: 0, 55, 125, 215, 280, 365, 440, 530, 620, 690, 775, 830, 895, 960, 1000
- Admin dashboard calcola la tappa corrente in base ai giorni trascorsi dall'inizio

---

## 10. Deployment

**Piattaforma:** Vercel (`vercel.json`)

**Variabili d'ambiente richieste** (`.env.local`):
```
DATABASE_URL=<connection-string-neon>
JWT_SECRET=<secret-per-jwt>
VITE_GOOGLE_MAPS_API_KEY=<api-key>
```

**SEO & PWA:**
- Open Graph tags, Twitter Card, canonical URL
- Structured data (schema.org `SportsEvent`)
- Apple touch icon, app-capable mode per iOS

---

## 11. Comandi Utili

```bash
# Avvia dev server
npm run dev

# Build di produzione
npm run build

# Esegui test
npm run test

# Lint
npm run lint
```
