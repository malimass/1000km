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
/home/user/gratitude-path/
├── src/
│   ├── pages/                 # Pagine/route dell'app
│   │   ├── Index.tsx          # Home page
│   │   ├── Percorso.tsx       # Pagina percorso con mappa e tracking live
│   │   ├── SanLuca.tsx        # Info santuario Madonna di San Luca
│   │   ├── CrocifissoNero.tsx # Info santuario SS Crocifisso Nero
│   │   ├── Dona.tsx           # Pagina donazioni
│   │   ├── Sponsor.tsx        # Pagina sponsor
│   │   ├── Contatti.tsx       # Pagina contatti
│   │   ├── AdminLogin.tsx     # Login admin (Supabase Auth)
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
│   │   ├── supabase.ts        # Inizializzazione client Supabase
│   │   ├── adminSettings.ts   # Gestione impostazioni admin (Supabase + localStorage)
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
├── public/                    # Asset statici
├── dist/                      # Output build
├── supabase-schema.sql        # Schema del database PostgreSQL
├── .env.local.example         # Template variabili d'ambiente
├── package.json               # Dipendenze e script
├── vite.config.ts             # Config Vite
├── tailwind.config.ts         # Config Tailwind CSS (colori custom, font)
├── vercel.json                # Config deployment Vercel
└── netlify.toml               # Config deployment Netlify
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
| **Supabase** | Database PostgreSQL, autenticazione, RLS |
| **Cloudinary** | Hosting e trasformazione immagini/video |
| **Meta Graph API** | Post su Facebook e Instagram |
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
| `/admin-login` | `AdminLogin` | Login Supabase |
| `/admin-live` | `AdminLive` | **Protetta** — Dashboard admin |
| `*` | `NotFound` | Pagina 404 |

---

## 5. Database (Supabase / PostgreSQL)

```sql
-- Tabella admin_settings
CREATE TABLE admin_settings (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id),
  data      jsonb NOT NULL DEFAULT '{}',  -- JSON con le impostazioni admin
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Modello TypeScript `AdminSettings`:**
```typescript
type AdminSettings = {
  fbPageId: string;      // Facebook Page ID
  fbToken: string;       // Facebook API token
  igUserId: string;      // Instagram User ID
  igImageUrl: string;    // Instagram profile image URL
  cloudName: string;     // Cloudinary cloud name
  cloudPreset: string;   // Cloudinary upload preset
};
```

**Strategia di storage ibrida:** Supabase come source of truth + localStorage come cache locale. Row-Level Security attivo: ogni utente vede solo i propri dati.

---

## 6. API Esterne Utilizzate

1. **Supabase Auth** — `supabase.auth.signInWithPassword()`
2. **Supabase DB** — CRUD su tabella `admin_settings`
3. **Cloudinary** — Upload immagini/video: `POST /v1_1/{cloudName}/{type}/upload`
4. **Meta Graph API v20.0:**
   - `POST /{pageId}/feed` — Post testo su Facebook
   - `POST /{pageId}/photos` — Post foto su Facebook
   - `POST /{pageId}/video_reels` — Post reel su Facebook
   - `POST /{igUserId}/media` — Post su Instagram
5. **LocaToWeb** — Iframe per tracking GPS live

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
Gestione ibrida impostazioni: carica da Supabase, fallback a localStorage se Supabase non configurato, sincronizza al salvataggio.

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
- Attuale: **€2.500** (5%)
- Progress bar animata nella home

### Tappe (14 stage)
- Km cumulativi: 0, 55, 125, 215, 280, 365, 440, 530, 620, 690, 775, 830, 895, 960, 1000
- Admin dashboard calcola la tappa corrente in base ai giorni trascorsi dall'inizio

---

## 10. Deployment

**Multi-piattaforma:**
- **Vercel** (`vercel.json`)
- **Netlify** (`netlify.toml`)

**Variabili d'ambiente richieste** (`.env.local`):
```
VITE_SUPABASE_URL=<url-supabase>
VITE_SUPABASE_ANON_KEY=<anon-key-supabase>
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
