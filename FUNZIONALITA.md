# Funzionalità — 1000km di Gratitudine

> Documento aggiornabile progressivamente. Ultima modifica: 2026-02-25 (v2)

---

## Panoramica

App web + mobile (PWA + iOS/Android via Capacitor) per il pellegrinaggio spirituale da Bologna a Terranova Sappo Minulio (Calabria), 1000 km in 14 tappe, dal 18 aprile al 1° maggio 2026. Raccolta fondi per Komen Italia (ricerca cancro al seno).

**Dominio live:** https://1000kmdigratitudine.it

---

## Pagine e Route

| Route | Descrizione |
|-------|-------------|
| `/` | Home — hero, countdown, KPI animati, CTA |
| `/il-percorso` | Mappa interattiva con 15 waypoint + tracking live |
| `/madonna-di-san-luca` | Info Santuario di partenza (Bologna) |
| `/ss-crocifisso-nero` | Info Santuario di arrivo (Calabria) + video YouTube |
| `/dona` | Donazione con 4 tier (€10 / €25 / €50 / €100) |
| `/iscriviti?tappa=N` | Iscrizione a una tappa (form + Stripe opzionale) |
| `/iscrizione-successo` | Conferma iscrizione avvenuta |
| `/partecipa` | Signup / Login community |
| `/il-mio-percorso` | Dashboard utente — GPS, stats, condivisione social |
| `/sostenitori` | Lista sostenitori (modificabile da admin) |
| `/sponsor` | Pacchetti sponsorizzazione |
| `/contatti` | Form di contatto |
| `/admin-login` | Login admin via PIN |
| `/admin-live` | Dashboard admin completa (rotta protetta) |

---

## Funzionalità per Area

### 1. Countdown & Stato Evento
- Countdown in tempo reale al 18 aprile 2026 ore 06:00 UTC
- Logica di stato: `prima dell'evento` → `in corso` → `concluso`
- Durante l'evento: mostra il tracking live al posto del countdown

### 2. Mappa Interattiva (`/il-percorso`)
- Mappa Leaflet con 15 waypoint da Bologna a Terranova Sappo Minulio
- Linea del percorso animata
- Marker runner principale con icona emoji (🏃‍♂️)
- Marker community con emoji per tipo attività (corri, cammino, pedalo, nuoto, altro)
- Aggiornamento in tempo reale via Supabase Realtime
- Animazione "fly-to" sul waypoint selezionato
- Pannello info tappa al click sul marker

### 3. GPS Live Tracking — Runner Principale
- Tracciamento GPS continuo (posizione + velocità + accuratezza + heading)
- Supporto **runner 1 e runner 2** (tracciamento indipendente)
- **Web**: `navigator.geolocation.watchPosition()` (richiede HTTPS)
- **Nativo iOS/Android**: `@capacitor/geolocation` con permesso "always"
- Background tracking su iOS/Android (continua con app in background)
- Persistenza su Supabase:
  - `live_position` — posizione corrente (singola riga, upsert)
  - `route_positions` — storico trail (append-only, per sessione giornaliera)
- Fallback: iframe **LocaToWeb** (URL configurabile da admin)
- Calcolo distanza percorsa con formula Haversine

### 4. Community Tracking (`/partecipa` + `/il-mio-percorso`)
- Registrazione con email, password, nome, tipo attività, città
- Login con email e password (Supabase Auth)
- Scelta sport: corri 🏃, cammino 🚶, pedalo 🚴, nuoto 🏊, altro 💪
- Condivisione posizione GPS in tempo reale sulla mappa pubblica
- Start / Stop tracking dalla dashboard utente
- Stats live: km percorsi, velocità, tempo, posizione corrente
- Colori distinti per tipo attività sulla mappa

### 5. Share Card — "Anch'io cammino per una giusta causa"
- **Card visiva** con attività, km percorsi, tempo e logo campagna
- Messaggio pre-compilato per social: *"Anch'io cammino per una giusta causa! Sto partecipando a #1000kmDIGRATITUDINE..."*
- **Condivisione nativa** su iOS/Android tramite `@capacitor/share`
- Fallback Web Share API su browser
- Fallback copia negli appunti se share non disponibile
- Hashtag inclusi: `#1000kmdiGratitudine #Komen #solidarieta #AnchIoCammino`

### 6. Iscrizione Tappe (`/iscriviti`)
- Form con: nome, cognome, email, telefono, tappa (1–14)
- Opzione t-shirt con scelta taglia (XS → XXL)
- Integrazione **Stripe** per pagamento maglietta
- Stati pagamento: gratuito / in attesa / completato / fallito / bonifico
- Pagina di conferma post-iscrizione

### 7. Donazioni (`/dona`)
- 4 tier predefiniti: €10, €25, €50, €100
- Trust badges per sicurezza pagamento
- Obiettivo: €50.000 per Komen Italia
- Barra di progresso animata (attualmente mock al 5%)

### 8. Santuari
- **San Luca** (`/madonna-di-san-luca`): storia, immagini, testo
- **Crocifisso Nero** (`/ss-crocifisso-nero`): storia, immagini + **video YouTube** (gestibili da admin)

### 9. Sostenitori (`/sostenitori`)
- Lista con nome, testo descrittivo, logo
- Contenuto **modificabile da admin** (salvataggio su Supabase + fallback localStorage)

### 10. Dashboard Admin (`/admin-live`)
- Accesso protetto via PIN (`VITE_ADMIN_PIN`)

#### Configurazione credenziali
- Facebook: Page ID, Access Token
- Instagram: User ID, Access Token
- Cloudinary: Cloud Name, Upload Preset
- YouTube: 3 video per la pagina Crocifisso Nero (id, titolo, descrizione)

#### Gestione GPS
- Impostare / aggiornare posizione live runner 1 e runner 2
- Cancellare storico route per sessione/runner
- Visualizzare stats GPS in tempo reale

#### Gestione LocaToWeb
- Impostare / rimuovere URL iframe tracking esterno

#### Post Social Media
- Pubblicare su **Facebook Page**: testo / foto / video-reel
- Pubblicare su **Instagram**: foto
- Generazione automatica caption da dati tappa corrente
- Hashtag predefiniti: `#1000kmdigratitudine #camminodigratitudine #bologna #calabria`
- Modalità "allenamento" (template caption diverso)
- Feedback errori/successo per ogni post

#### Upload Media
- Upload su **Cloudinary** (immagini e video)
- Libreria media con URL pronti per i social

#### Gestione Sostenitori
- Aggiungere / modificare / rimuovere sostenitori

### 11. App Nativa iOS / Android (Capacitor)
- **App ID**: `it.gratitudepath.app`
- Build per **iOS** (App Store) e **Android** (Play Store)
- **Flusso app nativa**:
  1. Splash screen con logo e colori brand (navy + arancione)
  2. Se non loggato → schermata Registrazione (layout minimale, no header/footer)
  3. Se loggato → Dashboard GPS direttamente
- **NativeLayout**: layout dedicato senza header/footer/barra DONA per esperienza app pulita
- **NativeRedirect**: redirect automatico dalla home al flusso community
- GPS background con distanceFilter 10m
- Messaggio notifica background: "Tracciamento GPS percorso in corso..."
- Safe area per notch iPhone (padding `pt-safe`)
- **`@capacitor/share`**: condivisione nativa verso qualsiasi app social

### 12. PWA
- Manifest: nome, icone, display standalone
- Service Worker con **auto-update** (aggiornamento immediato alla nuova versione)
- Icone: 512px maskable + apple-touch-icon
- Theme color: #ffffff

---

## Database Supabase

| Tabella | Scopo |
|---------|-------|
| `admin_settings` | Credenziali admin (FB, IG, Cloudinary, YT) |
| `iscrizioni` | Iscrizioni alle tappe + stato pagamento Stripe |
| `live_position` | Posizione corrente runner (singola riga) |
| `route_positions` | Storico trail runner (append-only) |
| `profiles` | Profili utenti community |
| `community_live_position` | Posizione live utenti community |
| `community_route_positions` | Storico trail utenti community |

---

## Integrazioni Esterne

| Servizio | Utilizzo |
|----------|----------|
| **Supabase** | DB, Auth, Realtime, Edge Functions |
| **Stripe** | Pagamento magliette iscritti |
| **Meta Graph API v20** | Post su Facebook Page e Instagram |
| **Cloudinary** | Upload e hosting media (foto/video) |
| **LocaToWeb** | Tracking GPS esterno (opzionale, iframe) |
| **Leaflet** | Mappa interattiva |
| **Capacitor** | Runtime nativo iOS/Android |

---

## Tappe (14 tappe, 1000 km totali)

| # | Da | A | Km |
|---|----|---|----|
| 1 | Bologna | Faenza | 55 |
| 2 | Faenza | Rimini | 70 |
| 3 | Rimini | Fano | 90 |
| … | … | … | … |
| 14 | Rosarno | Terranova Sappo Minulio | 40 |

---

## Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion
- **Routing**: React Router v6
- **Form**: React Hook Form + Zod
- **State server**: TanStack Query v5
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

| Data | Modifica |
|------|----------|
| 2026-02-25 | Documento creato |
| 2026-02-25 | Aggiunta sezione 5 (ShareCard), aggiornata sezione 11 (App Nativa con flusso e componenti), aggiunti comandi Capacitor |
