import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getLtwUrl, setLtwUrl, clearLtwUrl } from "@/lib/ltwStore";
import {
  CheckCircle, Trash2, ExternalLink, Settings, ChevronDown, ChevronUp,
  Send, Facebook, Instagram,
} from "lucide-react";

// ─── Costanti ────────────────────────────────────────────────────────────────
const CAMMINO_START = new Date("2026-04-18T06:00:00");

const HASHTAGS =
  "#1000kmdigratitudine #gratitudepath #camminodigratitudine " +
  "#bologna #calabria #italia #solidarietà #raccoltafondi #ciclismo #running";

const tappe = [
  { giorno: 1,  da: "Bologna",           a: "Faenza",                  km: 55  },
  { giorno: 2,  da: "Faenza",            a: "Rimini",                  km: 70  },
  { giorno: 3,  da: "Rimini",            a: "Ancona",                  km: 90  },
  { giorno: 4,  da: "Ancona",            a: "Porto San Giorgio",       km: 65  },
  { giorno: 5,  da: "Porto San Giorgio", a: "Pescara",                 km: 85  },
  { giorno: 6,  da: "Pescara",           a: "Vasto",                   km: 75  },
  { giorno: 7,  da: "Vasto",             a: "Campobasso",              km: 90  },
  { giorno: 8,  da: "Campobasso",        a: "Avellino",                km: 90  },
  { giorno: 9,  da: "Avellino",          a: "Sala Consilina",          km: 70  },
  { giorno: 10, da: "Sala Consilina",    a: "Scalea",                  km: 85  },
  { giorno: 11, da: "Scalea",            a: "Paola",                   km: 55  },
  { giorno: 12, da: "Paola",             a: "Pizzo Calabro",           km: 65  },
  { giorno: 13, da: "Pizzo Calabro",     a: "Rosarno",                 km: 65  },
  { giorno: 14, da: "Rosarno",           a: "Terranova Sappo Minulio", km: 40  },
];

// ─── Keys localStorage ────────────────────────────────────────────────────────
const K = {
  fbPageId:   "gp_fb_page_id",
  fbToken:    "gp_fb_token",
  igUserId:   "gp_ig_user_id",
  igImageUrl: "gp_ig_image_url",
};

function ls(key: string) {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val.trim()); } catch {}
}

// ─── Template post ────────────────────────────────────────────────────────────
function buildMessage(ltwUrl: string, isTraining: boolean): string {
  if (isTraining) {
    return (
      `🚴‍♂️ Allenamento in preparazione per i 1000 Km di Gratitudine!\n\n` +
      `Il 18 aprile partirò da Bologna per raggiungere Terranova Sappo Minulio (RC): ` +
      `1000 km, 14 tappe, 1 obiettivo.\n\n` +
      `📍 Seguimi live: ${ltwUrl}\n\n` +
      HASHTAGS
    );
  }
  const now = new Date();
  const diff = Math.floor((now.getTime() - CAMMINO_START.getTime()) / 86400000);
  const t = tappe[Math.max(0, Math.min(diff, 13))];
  return (
    `🚴‍♂️ Giorno ${t.giorno} del Gratitude Path!\n\n` +
    `Oggi: ${t.da} → ${t.a} · ${t.km} km\n\n` +
    `Sto percorrendo 1000 km da Bologna a Terranova Sappo Minulio (RC) ` +
    `per raccogliere fondi per la ricerca e la solidarietà.\n\n` +
    `📍 Seguimi in diretta: ${ltwUrl}\n\n` +
    HASHTAGS
  );
}

// ─── Chiamate Meta Graph API ──────────────────────────────────────────────────
async function postToFacebook(pageId: string, token: string, message: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  return res.json();
}

async function postToInstagram(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string,
) {
  // Step 1: crea container media
  const createRes = await fetch(
    `https://graph.facebook.com/v20.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    },
  );
  const created = await createRes.json();
  if (created.error) throw new Error(created.error.message);

  // Step 2: pubblica il container
  const publishRes = await fetch(
    `https://graph.facebook.com/v20.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: created.id, access_token: token }),
    },
  );
  return publishRes.json();
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function AdminLive() {
  // ─ Live tracking ─
  const [ltwUrl, setLtwUrlLocal] = useState(getLtwUrl);
  const [ltwSaved, setLtwSaved] = useState(false);

  // ─ Social settings ─
  const [showSettings, setShowSettings] = useState(false);
  const [fbPageId,   setFbPageId]   = useState(() => ls(K.fbPageId));
  const [fbToken,    setFbToken]    = useState(() => ls(K.fbToken));
  const [igUserId,   setIgUserId]   = useState(() => ls(K.igUserId));
  const [igImageUrl, setIgImageUrl] = useState(() => ls(K.igImageUrl));

  // ─ Post composer ─
  const isTraining = new Date() < CAMMINO_START;
  const [message, setMessage] = useState(() =>
    buildMessage(getLtwUrl() || "https://locatoweb.com/map/single/...", isTraining),
  );
  const [postFb, setPostFb] = useState(true);
  const [postIg, setPostIg] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ ok: string[]; err: string[] } | null>(null);

  // Aggiorna template quando cambia ltwUrl
  useEffect(() => {
    if (ltwUrl) setMessage(buildMessage(ltwUrl, isTraining));
  }, [ltwUrl, isTraining]);

  // ─ Salva impostazioni social ─
  function saveSettings() {
    lsSet(K.fbPageId,   fbPageId);
    lsSet(K.fbToken,    fbToken);
    lsSet(K.igUserId,   igUserId);
    lsSet(K.igImageUrl, igImageUrl);
    setShowSettings(false);
  }

  // ─ Salva URL LocaToWeb ─
  function handleSaveLtw() {
    setLtwUrl(ltwUrl);
    setLtwSaved(true);
    setTimeout(() => setLtwSaved(false), 2500);
  }

  async function handleCopyShareLink() {
    const url = `${window.location.origin}/il-percorso?ltw=${encodeURIComponent(ltwUrl)}`;
    await navigator.clipboard.writeText(url);
  }

  // ─ Pubblica ─
  async function handlePublish() {
    setPosting(true);
    setPostResult(null);
    const ok: string[] = [];
    const err: string[] = [];

    if (postFb) {
      try {
        const res = await postToFacebook(fbPageId, fbToken, message);
        if (res.error) err.push(`Facebook: ${res.error.message}`);
        else ok.push("Facebook");
      } catch (e) {
        err.push(`Facebook: ${String(e)}`);
      }
    }

    if (postIg) {
      if (!igImageUrl) {
        err.push("Instagram: nessun URL immagine nelle impostazioni");
      } else {
        try {
          const res = await postToInstagram(igUserId, fbToken, igImageUrl, message);
          if (res.error) err.push(`Instagram: ${res.error.message}`);
          else ok.push("Instagram");
        } catch (e) {
          err.push(`Instagram: ${String(e)}`);
        }
      }
    }

    setPostResult({ ok, err });
    setPosting(false);
  }

  const canPublish =
    (postFb || postIg) &&
    !!ltwUrl &&
    !!fbToken &&
    (postFb ? !!fbPageId : true) &&
    (postIg ? !!igUserId : true);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 pb-16">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="pt-6 pb-2 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin · Gratitude Path</h1>
          <p className="text-muted-foreground text-sm font-body mt-1">
            {isTraining ? "Modalità allenamento" : "Cammino in corso 🚴‍♂️"}
          </p>
        </div>

        {/* ── Sezione 1: LocaToWeb ── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide">
            📍 Link Live Tracking
          </h2>
          {ls(K.fbToken) === "" && (
            <div/>
          )}
          {getLtwUrl() && (
            <p className="text-xs text-green-600 font-mono break-all mb-2">{getLtwUrl()}</p>
          )}
          <input
            type="url"
            placeholder="https://locatoweb.com/map/single/..."
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono mb-1 focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
            value={ltwUrl}
            onChange={e => { setLtwUrlLocal(e.target.value); setLtwSaved(false); }}
            onPaste={e => {
              const pasted = e.clipboardData.getData("text").trim();
              if (pasted.startsWith("https://locatoweb.com/")) {
                e.preventDefault();
                setLtwUrlLocal(pasted);
                setLtwUrl(pasted);
                setLtwSaved(true);
                setMessage(buildMessage(pasted, isTraining));
                setTimeout(() => setLtwSaved(false), 2500);
              }
            }}
          />
          <p className="text-xs text-muted-foreground mb-3">💡 Incolla → si salva automaticamente</p>
          <div className="flex gap-2">
            <button
              onClick={handleSaveLtw}
              disabled={!ltwUrl.startsWith("https://locatoweb.com/")}
              className="flex-1 flex items-center justify-center gap-1.5 bg-dona text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
            >
              {ltwSaved ? <><CheckCircle className="w-4 h-4" />Salvato!</> : "Salva"}
            </button>
            {ltwUrl && (
              <button
                onClick={handleCopyShareLink}
                className="px-3 border border-dona/30 text-dona rounded-lg text-sm hover:bg-dona/5"
                title="Copia link condivisibile"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { clearLtwUrl(); setLtwUrlLocal(""); }}
              className="px-3 border border-border text-muted-foreground rounded-lg text-sm hover:bg-muted"
              title="Cancella URL"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Sezione 2: Pubblica sui social ── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
            📣 Pubblica sui social
          </h2>

          {/* Template buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMessage(buildMessage(ltwUrl || "https://...", true))}
              className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
            >
              Template allenamento
            </button>
            <button
              onClick={() => setMessage(buildMessage(ltwUrl || "https://...", false))}
              className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
            >
              Template evento
            </button>
          </div>

          {/* Testo post */}
          <textarea
            rows={9}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-body mb-3 focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />

          {/* Toggle piattaforme */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setPostFb(v => !v)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all
                ${postFb ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground"}`}
            >
              <Facebook className="w-4 h-4" /> Facebook
            </button>
            <button
              onClick={() => setPostIg(v => !v)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all
                ${postIg ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent" : "border-border text-muted-foreground"}`}
            >
              <Instagram className="w-4 h-4" /> Instagram
            </button>
          </div>

          {/* Risultato */}
          {postResult && (
            <div className="mb-3 space-y-1">
              {postResult.ok.map(p => (
                <p key={p} className="text-xs text-green-600 font-semibold">✓ Pubblicato su {p}</p>
              ))}
              {postResult.err.map(e => (
                <p key={e} className="text-xs text-red-500">{e}</p>
              ))}
            </div>
          )}

          {/* Avviso se mancano credenziali */}
          {!fbToken && (
            <p className="text-xs text-amber-600 mb-3">
              ⚠️ Imposta le credenziali Meta nelle{" "}
              <button onClick={() => setShowSettings(true)} className="underline">Impostazioni</button>{" "}
              per poter pubblicare.
            </p>
          )}

          <button
            onClick={handlePublish}
            disabled={!canPublish || posting}
            className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4" />
            {posting ? "Pubblicazione in corso…" : "Pubblica ora"}
          </button>
        </div>

        {/* ── Sezione 3: Impostazioni social (collapsibile) ── */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSettings(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Impostazioni social (Meta)
            </span>
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSettings && (
            <div className="px-5 pb-5 border-t border-border space-y-3 pt-4">
              <p className="text-xs text-muted-foreground">
                Inserisci i dati del tuo app Meta (Business Portfolio <strong>1000kmdigratitudine</strong>).{" "}
                Salvati solo sul tuo dispositivo.
              </p>

              <Field label="Facebook Page ID" value={fbPageId} onChange={setFbPageId}
                placeholder="123456789012345" />
              <Field label="Facebook Page Access Token (long-lived)" value={fbToken} onChange={setFbToken}
                placeholder="EAABsb..." type="password" />
              <Field label="Instagram Business User ID" value={igUserId} onChange={setIgUserId}
                placeholder="17841400..." />
              <Field label="URL immagine per post Instagram"
                value={igImageUrl} onChange={setIgImageUrl}
                placeholder="https://tuosito.com/og-image.jpg"
                hint="Deve essere un URL pubblico (es. l'immagine hero del sito già online)" />

              <button
                onClick={saveSettings}
                className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity mt-2"
              >
                Salva impostazioni
              </button>

              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Come ottenere le credenziali Meta →
                </summary>
                <ol className="mt-2 text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>
                    Vai su <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline text-dona">developers.facebook.com</a> → "Le mie app" → "Crea app"
                  </li>
                  <li>Tipo: <strong>Business</strong>, collega al Portfolio <strong>1000kmdigratitudine</strong></li>
                  <li>Aggiungi prodotto: <strong>Facebook Login for Business</strong> + <strong>Instagram Graph API</strong></li>
                  <li>
                    Vai su <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="underline text-dona">Graph API Explorer</a> → seleziona la tua app → genera token con permessi:
                    <br /><code className="bg-muted px-1 rounded text-[10px]">pages_manage_posts, pages_read_engagement, instagram_content_publish, instagram_basic</code>
                  </li>
                  <li>Converti in <strong>long-lived token</strong> (dura 60 giorni): usa il <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noreferrer" className="underline text-dona">Token Debugger</a></li>
                  <li>
                    <strong>Page ID</strong>: visita la tua Pagina Facebook → "Informazioni" → ID pagina
                  </li>
                  <li>
                    <strong>Instagram User ID</strong>: nel Graph Explorer chiama <code className="bg-muted px-1 rounded text-[10px]">GET /me/accounts</code> poi <code className="bg-muted px-1 rounded text-[10px]">GET /&#123;page-id&#125;?fields=instagram_business_account</code>
                  </li>
                </ol>
              </details>
            </div>
          )}
        </div>

        <div className="text-center pt-2">
          <Link to="/il-percorso" className="text-sm text-dona underline font-body">
            ← Vai alla pagina Percorso
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Helper campo input ────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = "text", hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
