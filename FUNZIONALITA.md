# Funzionalità — 1000km di Gratitudine

> Documento aggiornabile progressivamente. Ultima modifica: 2026-03-04 (v6)

---

## Panoramica

App web + mobile (PWA + iOS/Android via Capacitor) per il pellegrinaggio spirituale da Bologna a Terranova Sappo Minulio (Calabria), 1000 km in 14 tappe, dal 15 aprile al 1° maggio 2026 (pomeriggio). Raccolta fondi per Komen Italia (ricerca cancro al seno).

**Dominio live:** https://1000kmdigratitudine.it

---

## Pagine e Route

| Route | Componente | Descrizione |
|-------|-----------|-------------|
| `/` | `Index` | Home — hero, countdown, KPI animati, CTA |
| `/il-percorso` | `Percorso` | Mappa interattiva 15 waypoint + tracking live community |
| `/madonna-di-san-luca` | `SanLuca` | Info Santuario di partenza (Bologna) |
| `/ss-crocifisso-nero` | `CrocifissoNero` | Info Santuario di arrivo (Calabria) + video YouTube |
| `/dona` | `Dona` | Donazione con 4 tier (€10 / €25 / €50 / €100) |
| `/iscriviti?tappa=N` | `Iscriviti` | Iscrizione a una tappa (form + Stripe opzionale) |
| `/iscrizione-successo` | `IscrizioneSuccesso` | Conferma iscrizione avvenuta |
| `/partecipa` | `Partecipa` | Signup / Login community (email + password) |
| `/il-mio-percorso` | `IlMioPercorso` | Dashboard utente — GPS, stats, condivisione social |
| `/sostenitori` | `Sostenitori` | Lista sostenitori (modificabile da admin) |
| `/sponsor` | `Sponsor` | Pacchetti sponsorizzazione |
| `/contatti` | `Contatti` | Form di contatto |
| `/atleta/accedi` | `AtletaLogin` | Login / registrazione atleta |
| `/coach-login` | `CoachLogin` | Login coach |
| `/admin-login` | `AdminLogin` | Login admin via PIN |
| `/admin-live` | `AdminLive` | Dashboard admin completa (rotta protetta da `ProtectedAdminRoute`) |
| `*` | `NotFound` | Pagina 404 |

> Tutte le pagine sono caricate in **lazy** (code-splitting automatico via React `Suspense`).

---

## Funzionalità per Area

### 1. Countdown & Stato Evento

- Countdown in tempo reale al **15 aprile 2026 ore 06:00** (`CAMMINO_START`)
- Evento termina il **1 maggio 2026 pomeriggio (18:00)** (`CAMMINO_END`)
- Logica di stato: `prima dell'evento` → `in corso` → `concluso`
- Se GPS runner attivo → mostra tracking live anche fuori dalle date ufficiali
- Badge "In diretta" rosso pulsante visibile quando GPS è attivo o LocaToWeb è configurato

---

### 2. Mappa Interattiva (`/il-percorso`)

- Libreria: **React Leaflet** + OpenStreetMap tiles
- **15 waypoint** da Bologna a Terranova Sappo Minulio
- Linea percorso pianificato (tratteggiata rossa)
- Traccia GPS corridore 1 — **Massimo** (linea verde continua)
- Traccia GPS corridore 2 — **Nunzio** (linea arancione continua)
- Tracce GPS community — una polyline per utente, colore per tipo attività
- Marker runner con emoji animata (gambe in movimento):
  - 🏃‍♂️ Massimo → pin blu `#3b82f6`
  - 🏃‍♂️ Nunzio → pin arancione `#f97316`
- Marker community con emoji per tipo attività (corri 🏃 / cammino 🚶 / altro 💪)
- Marker waypoint: verde (partenza), arancione (tappe intermedie), rosso (arrivo)
- Badge con conteggio iscritti su ogni tappa intermedia
- Popup al click: nome città, data, km progressivi, n° iscritti
- Popup marker runner: velocità km/h + accuratezza GPS
- Animazione **fly-to** sul waypoint selezionato (durata 1.2s)
- Auto-pan sul corridore attivo quando arriva nuova posizione GPS
- Controllo zoom bottom-right; scroll-wheel disabilitato
- Aggiornamento in tempo reale via **Supabase Realtime** (postgres_changes)

---

### 3. GPS Live Tracking — Runner Principale

- Tracciamento GPS continuo: lat, lng, speed (m/s), accuracy (m), heading (°)
- Supporto **runner 1 (Massimo)** e **runner 2 (Nunzio)** — tracciamento indipendente
- **Web**: `navigator.geolocation.watchPosition()` (richiede HTTPS)
- **Nativo iOS/Android**: `@capacitor/geolocation` con permesso "always"
- Background tracking su iOS/Android (continua con app in background)
- Persistenza su Supabase:
  - `live_position` — posizione corrente (upsert su riga id=1 o id=2)
  - `route_positions` — storico trail (append-only, filtrato: ogni 30m o 60s)
- `session_id` = data corrente formattata (`todaySessionId()`) — permette caricamento per giornata
- Calcolo distanza percorsa: formula **Haversine** (`distanceMeters()`)
- Fallback: iframe **LocaToWeb** (URL configurabile da admin, salvato in localStorage)

---

### 4. Community Tracking (`/partecipa` + `/il-mio-percorso`)

#### Registrazione / Login
- **OAuth social**: Google, Facebook, Apple — tramite `supabase.auth.signInWithOAuth()`
  - Redirect a `/partecipa` dopo il provider
  - Se utente nuovo senza profilo → form di completamento (nome, attività, città)
  - Se profilo esistente → redirect diretto a `/il-mio-percorso`
- **Email + password**: signup e login via Supabase Auth
- Dati profilo: nome visualizzato, tipo attività, città
- Creazione record `profiles` al signup con `upsertProfile()`
- Redirect a `/il-mio-percorso` dopo login
- Messaggio di errore dedicato se email già registrata (guida l'utente al login)

> **Nota Supabase**: disabilitare "Enable email confirmations" in Auth Settings per permettere login immediato senza verifica email.

#### Tipi di attività (enum: `ActivityType`)
| Valore | Emoji | Colore marker |
|--------|-------|--------------|
| `corri` | 🏃 | `#3b82f6` blu |
| `cammino` | 🚶 | `#22c55e` verde |
| `altro` | 💪 | `#8b5cf6` viola |

> **Nota SQL**: il commento nel `community-schema.sql` menziona anche `pedalo` e `nuoto` come valori possibili per `activity_type`, ma non esiste un CHECK constraint nel DB e il frontend (TypeScript + UI) espone solo i 3 valori sopra. Eventuali valori aggiuntivi sono estendibili senza migrazioni.

#### Dashboard utente (`/il-mio-percorso`)
- Start / Stop tracking GPS
- Stats live: km percorsi, velocità (km/h), tempo trascorso, punti registrati, accuratezza GPS
- Posizione live su `community_live_position` (upsert ogni callback GPS)
- Storico su `community_route_positions` (append ogni 30m o 60s)
- `session_id` = data del giorno (come i runner principali)
- Cleanup automatico: `setCommunityInactive(userId)` chiamato su Stop e al logout

#### Visibilità sulla mappa pubblica
- La posizione appare sulla mappa di `/il-percorso` in tempo reale
- **Soglia staleness: 10 minuti** (`COMMUNITY_STALE_MS`) — se l'aggiornamento GPS è più vecchio di 10 min, il marker scompare automaticamente (protezione contro crash/chiusura browser senza "Ferma")
- Cleanup periodico lato client ogni 60s in `Percorso.tsx`
- Triplo livello di protezione: query DB filtrata, state cleanup, guard nel rendering

---

### 5. Share Card — "Anch'io cammino per una giusta causa"

- Card visiva con: tipo attività, km percorsi, tempo, logo campagna
- **Testi completamente configurabili da admin** (titolo, corpo, tag social, hashtag, URL)
- Valori di default integrati nel codice (`SHARE_DEFAULTS`) se admin non ha configurato nulla
- Testi letti da Supabase `site_settings` (id=2, lettura pubblica senza auth)
- **Condivisione nativa** su iOS/Android tramite `@capacitor/share`
- Fallback: **Web Share API** su browser moderni
- Fallback finale: copia negli appunti (`navigator.clipboard`)

---

### 6. Iscrizione Tappe (`/iscriviti`)

- Form con: nome, cognome, email, telefono, tappa (1–14)
- Selezione tappa pre-compilata via query param `?tappa=N`
- Opzione t-shirt con scelta taglia (XS → XXL)
- Integrazione **Stripe** per pagamento maglietta
- Stati pagamento: `gratuito` / `in_attesa` / `completato` / `fallito` / `in_attesa_bonifico`
- Funzione RPC Supabase `get_iscritti_per_tappa()` per contatori per tappa

---

### 7. Donazioni (`/dona`)

- 4 tier predefiniti: **€10 / €25 / €50 / €100**
- Trust badges per sicurezza pagamento
- Obiettivo: **€50.000** per Komen Italia
- Barra di progresso animata

---

### 8. Santuari

- **San Luca** (`/madonna-di-san-luca`): storia, immagini, testo
- **Crocifisso Nero** (`/ss-crocifisso-nero`): storia, immagini + **fino a 3 video YouTube**
  - Video configurabili da admin (id, titolo, descrizione)
  - Letti da `site_settings` id=1 (pubblica) + cache localStorage

---

### 9. Sostenitori (`/sostenitori`)

- Lista con nome, testo descrittivo, logo URL
- Struttura: `{ title, intro, items: Sostenitore[] }`
- Contenuto leggibile pubblicamente
- **Modificabile solo da admin** autenticati (RLS protetta)
- Persistenza: Supabase `sostenitori_page` + fallback localStorage

---

### 10. Dashboard Admin (`/admin-live`)

- Accesso protetto via PIN (`VITE_ADMIN_PIN`) — componente `ProtectedAdminRoute`

#### Configurazione credenziali (tab dedicato)
- Facebook: Page ID, Access Token
- Instagram: User ID, Access Token
- Cloudinary: Cloud Name, Upload Preset
- YouTube: 3 video per la pagina Crocifisso Nero (id, titolo, descrizione)
- Persistenza: Supabase `admin_settings` (per user_id) + cache localStorage

#### Condivisione Social (tab "Condivisione")
- Campi configurabili: titolo, corpo messaggio, tag social, hashtag, URL link
- **Anteprima live** del post durante la modifica
- Salvati su `site_settings` id=2 (lettura pubblica senza auth)

#### Gestione GPS Runner
- Impostare / aggiornare posizione live runner 1 (Massimo) e runner 2 (Nunzio)
- Visualizzare posizione corrente e velocità in tempo reale
- Cancellare storico route per sessione/runner

#### Gestione LocaToWeb
- Impostare / rimuovere URL iframe tracking esterno
- URL salvato in localStorage via `ltwStore.ts`
- Può essere passato anche via query param `?ltw=<url>` sulla pagina `/il-percorso`

#### Post Social Media
- Pubblicare su **Facebook Page**: testo / foto / video-reel
- Pubblicare su **Instagram**: foto
- API: **Meta Graph API v20**
- Generazione automatica caption da dati tappa corrente
- Hashtag predefiniti: `#1000kmdigratitudine #camminodigratitudine #bologna #calabria`
- Modalità "allenamento" (template caption diverso)
- Feedback toast errori/successo per ogni post

#### Upload Media
- Upload su **Cloudinary** (immagini e video)
- Libreria media con URL pronti per i social

#### Generazione Snapshot Mappa
- Mappa statica via **Geoapify Static Maps API** (`mapSnapshot.ts`)
- Usata per OG image preview e screenshot per social
- Mostra percorso (polyline rossa), marker start/end, posizione corrente opzionale

#### Gestione Sostenitori
- Aggiungere / modificare / rimuovere sostenitori dalla lista pubblica

---

### 11. Sistema Atleta / Coach

#### Area Atleta (`/atleta/accedi`)
- Login e registrazione con email + password (via Supabase Auth)
- Profilo atleta: dati personali, storico sessioni, rischio infortuni
- Valutazione per sessione (wellness check-in)
- Sincronizzazione profilo cross-device tramite Supabase `athlete_profiles`

#### Area Coach (`/coach-login`)
- Login dedicato per coach
- Dashboard analisi allenamenti con import file **FIT / TCX**
- Visualizzazione dati sessioni: km, dislivello, frequenza cardiaca
- Ring SVG per metriche chiave + KPI cards
- Sezione valutazione atleti in carico
- Persistenza sessioni su Supabase (sync cross-device)
- Gestione profilo coach con upsert su Supabase

#### Login dropdown in navbar
- Il bottone **Login** in header è ora un menu a tendina con tre voci:
  - *Area Atleta* → `/atleta/accedi`
  - *Area Coach* → `/coach-login`
  - *Admin* → `/admin-login`
- **Desktop**: hover dropdown con icona + descrizione per ogni voce
- **Mobile**: accordion animato (framer-motion) che si apre/chiude
- File: `src/components/Layout.tsx`

---

### 12. App Nativa iOS / Android (Capacitor)

- **App ID**: `it.gratitudepath.app`
- Build per **iOS** (App Store) e **Android** (Play Store)
- **Flusso app nativa**:
  1. Splash screen con logo e colori brand (navy + arancione)
  2. `NativeRedirect` sulla root `/` → se non loggato: `/partecipa`, se loggato: `/il-mio-percorso`
  3. `NativeLayout`: layout dedicato senza header/footer/barra DONA per esperienza app pulita
- GPS background con `distanceFilter: 10m`
- Messaggio notifica background: *"Tracciamento GPS percorso in corso..."*
- Safe area per notch iPhone (padding `pt-safe`)
- `@capacitor/share`: condivisione nativa verso qualsiasi app social

---

### 12. PWA

- Manifest: nome, icone (512px maskable + apple-touch-icon), display standalone
- Service Worker con **auto-update** (aggiornamento immediato alla nuova versione)
- Theme color: `#ffffff`

---

## Database Supabase

| Tabella | Scopo | RLS |
|---------|-------|-----|
| `admin_settings` | Credenziali admin (FB, IG, Cloudinary, YT, share) — JSONB | Solo il proprio `user_id` |
| `site_settings` | Config pubbliche: video YT (id=1), testi share (id=2) — JSONB | Lettura pubblica, scrittura solo admin autenticati |
| `sostenitori_page` | Pagina sostenitori (JSONB: title, intro, items[]) | Lettura pubblica, scrittura solo admin autenticati |
| `iscrizioni` | Iscrizioni alle tappe + stato pagamento Stripe | INSERT pubblico, lettura/update solo admin |
| `live_position` | Posizione corrente runner 1 e 2 (id=1,2 — upsert) | Lettura pubblica, scrittura solo autenticati |
| `route_positions` | Storico trail runner (append-only, con `session_id` e `runner_id`) | Lettura pubblica, scrittura solo autenticati |
| `profiles` | Profili utenti community (display_name, activity_type, city) | Lettura pubblica, scrittura proprio profilo |
| `community_live_position` | Posizione live utenti community (un record per user_id) | Lettura pubblica, scrittura proprio record |
| `community_route_positions` | Storico trail community (append-only, con `session_id` e `user_id`) | Lettura pubblica, scrittura proprio record; DELETE proprio record |

### Strategia di persistenza dati

- **Supabase** è la fonte di verità per tutti i dati
- **localStorage** è usato come cache/fallback (se Supabase non configurato o offline)
- I dati su Supabase **non vengono toccati** durante deploy/aggiornamenti dell'app
- Script di setup: `supabase-schema.sql` · `live_position.sql` · `community-schema.sql` · `site-settings.sql`

### Realtime (Supabase postgres_changes)

| Canale | Tabella | Eventi | Uso |
|--------|---------|--------|-----|
| `live-pos-channel-1` | `live_position` | `UPDATE` (id=1) | Aggiorna posizione runner 1 in tempo reale |
| `live-pos-channel-2` | `live_position` | `UPDATE` (id=2) | Aggiorna posizione runner 2 in tempo reale |
| `route-pos-channel-1` | `route_positions` | `INSERT` (runner_id=1) | Aggiunge punti traccia runner 1 |
| `route-pos-channel-2` | `route_positions` | `INSERT` (runner_id=2) | Aggiunge punti traccia runner 2 |
| `community-live-channel` | `community_live_position` | `*` | Aggiorna/rimuove marker community |
| `community-route-positions-channel` | `community_route_positions` | `INSERT` | Aggiunge punti traccia community |

---

## Integrazioni Esterne

| Servizio | Utilizzo |
|----------|----------|
| **Supabase** | DB PostgreSQL, Auth (email/password), Realtime, RLS |
| **Stripe** | Pagamento magliette iscritti |
| **Meta Graph API v20** | Post su Facebook Page e Instagram Business |
| **Cloudinary** | Upload e hosting media (foto/video) |
| **Geoapify** | Generazione mappa statica (snapshot) per social / OG image |
| **LocaToWeb** | Tracking GPS esterno opzionale (iframe) |
| **OpenStreetMap** | Tile layer per la mappa interattiva Leaflet |
| **Capacitor** | Runtime nativo iOS/Android |

---

## Tappe (14 tappe, 1000 km totali)

| # | Da | A | Km | Data |
|---|----|---|----|------|
| 1 | Bologna | Faenza | 55 | 15 aprile |
| 2 | Faenza | Rimini | 70 | 16 aprile |
| 3 | Rimini | Ancona | 90 | 17 aprile |
| 4 | Ancona | Porto San Giorgio | 65 | 18 aprile |
| 5 | Porto San Giorgio | Pescara | 85 | 19 aprile |
| 6 | Pescara | Vasto | 75 | 20 aprile |
| 7 | Vasto | Campobasso | 90 | 21 aprile |
| 8 | Campobasso | Avellino | 90 | 22 aprile |
| 9 | Avellino | Sala Consilina | 70 | 23 aprile |
| 10 | Sala Consilina | Scalea | 85 | 24 aprile |
| 11 | Scalea | Paola | 55 | 25 aprile |
| 12 | Paola | Pizzo Calabro | 65 | 26 aprile |
| 13 | Pizzo Calabro | Rosarno | 65 | 27 aprile |
| 14 | Rosarno | Terranova Sappo Minulio | 40 | 28 aprile |
| **Totale** | | | **1000** | |

**Waypoint sulla mappa**: 15 (Bologna + 14 destinazioni tappe)

---

## Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI) + Framer Motion
- **Routing**: React Router v6 (lazy loading di tutte le pagine)
- **Form**: React Hook Form + Zod
- **State server**: TanStack Query v5
- **Mappa**: React Leaflet + Leaflet 1.9
- **Test**: Vitest
- **Deploy**: Vercel (principale) / Netlify (alternativo)

---

## Comandi Principali

```bash
npm run dev           # Dev server → http://localhost:8080
npm run build         # Build produzione
npm run lint          # Lint ESLint
npm run test          # Unit test (vitest)

# Capacitor (app nativa)
npm run cap:sync      # Sincronizza build web → progetti nativi
npm run cap:build     # Build produzione + sync
npm run cap:ios       # Build + apri Xcode (per firma e pubblicazione App Store)
npm run cap:android   # Build + apri Android Studio (per firma e pubblicazione Play Store)
```

---

## TODO / Da sviluppare

> Aggiornare questa sezione man mano che emergono nuove funzionalità da implementare.

- [ ] ...

---

## Changelog

| Data | Versione | Modifica |
|------|----------|----------|
| 2026-02-25 | v1 | Documento creato |
| 2026-02-25 | v2 | Aggiunta sezione 5 (ShareCard), aggiornata sezione 11 (App Nativa con flusso e componenti), aggiunti comandi Capacitor |
| 2026-02-25 | v3 | Testi condivisione social configurabili da admin. Tabella `site_settings` + fix RLS `sostenitori_page`. Documentata strategia persistenza dati e policy RLS per ogni tabella |
| 2026-02-26 | v4 | Revisione completa da audit codebase: corretto ActivityType (solo 3 valori: corri/cammino/altro, rimossi pedalo/nuoto non esistenti); completata tabella tappe con tutti i 14 valori reali; aggiunto Geoapify alle integrazioni; aggiunti nomi runner (Massimo/Nunzio) e colori marker; documentata tabella Realtime subscriptions; aggiornata sezione Community con fix marker stale (COMMUNITY_STALE_MS 10 min, cleanup periodico, guard rendering) |
| 2026-03-03 | v5 | Aggiunto sistema multi-utente: Area Atleta (`/atleta/accedi`) con profilo e sessioni, Area Coach (`/coach-login`) con analisi FIT/TCX, KPI cards e ring SVG. Login dropdown unificato in navbar (desktop hover + mobile accordion) con 3 voci: Atleta / Coach / Admin. Aggiornate route in tabella pagine. Migliorato messaggio errore email già registrata nei form di registrazione. |
| 2026-03-04 | v6 | Aggiornate date evento: partenza **15 aprile 2026** (era 18 aprile), arrivo **1 maggio 2026 pomeriggio (18:00)**. Aggiornate tutte le 14 tappe con date corrette (shift -3 giorni: 15 apr → 28 apr). Aggiornati `CAMMINO_START`, countdown e tutti i testi nelle pagine. |
