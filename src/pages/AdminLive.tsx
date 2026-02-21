import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLtwUrl, setLtwUrl, clearLtwUrl } from "@/lib/ltwStore";
import { CheckCircle, Trash2, ExternalLink } from "lucide-react";

export default function AdminLive() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Carica URL corrente da localStorage al mount
  useEffect(() => {
    setUrl(getLtwUrl());
  }, []);

  function handleSave() {
    setLtwUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClear() {
    clearLtwUrl();
    setUrl("");
    setSaved(false);
  }

  async function handleCopyLink() {
    const shareUrl = `${window.location.origin}/il-percorso?ltw=${encodeURIComponent(url)}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const isValidUrl = url.startsWith("https://locatoweb.com/");
  const currentSaved = getLtwUrl();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
            Admin · Live Tracking
          </h1>
          <p className="text-muted-foreground text-sm font-body">
            Aggiorna ogni mattina il link LocaToWeb prima di partire
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-md">

          {/* Stato attuale */}
          {currentSaved && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 font-body font-semibold mb-1">Link attualmente salvato:</p>
              <p className="text-xs font-mono text-green-800 break-all">{currentSaved}</p>
            </div>
          )}

          {/* Input */}
          <label className="block text-sm font-semibold text-foreground mb-2">
            Nuovo link LocaToWeb
          </label>
          <input
            type="url"
            placeholder="https://locatoweb.com/map/single/..."
            className="w-full border border-border rounded-lg px-3 py-3 text-sm font-mono mb-1 focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
            value={url}
            onChange={e => { setUrl(e.target.value); setSaved(false); }}
            onPaste={e => {
              // Salva automaticamente al paste
              const pasted = e.clipboardData.getData("text").trim();
              if (pasted.startsWith("https://locatoweb.com/")) {
                setUrl(pasted);
                setLtwUrl(pasted);
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
                e.preventDefault();
              }
            }}
          />
          <p className="text-xs text-muted-foreground font-body mb-5">
            💡 Puoi anche incollare direttamente — si salva in automatico
          </p>

          {/* Pulsanti */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={handleSave}
              disabled={!isValidUrl}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                bg-dona text-white hover:opacity-90"
            >
              {saved
                ? <><CheckCircle className="w-4 h-4" /> Salvato!</>
                : "Salva"
              }
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg py-2.5 px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition-all border border-border"
            >
              <Trash2 className="w-4 h-4" />
              Cancella
            </button>
          </div>

          {/* Copia link condivisibile */}
          {isValidUrl && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-body mb-2">
                Oppure condividi questo link — chi lo apre vede il tracking live:
              </p>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-semibold text-dona border border-dona/30 hover:bg-dona/5 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {copied ? "✓ Link copiato!" : "Copia link condivisibile"}
              </button>
            </div>
          )}
        </div>

        {/* Come usare */}
        <div className="mt-6 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Come usare ogni giorno</h2>
          <ol className="space-y-2 text-sm font-body text-muted-foreground list-decimal list-inside">
            <li>Avvia l'app LocaToWeb sul telefono</li>
            <li>Copia il link che appare (es. <span className="font-mono text-xs">…/map/single/123456</span>)</li>
            <li>Torna qui, incolla nel campo qui sopra → salva in automatico</li>
            <li>La sezione "Segui in diretta" sul sito mostrerà il tuo live tracking</li>
          </ol>
        </div>

        <div className="mt-4 text-center">
          <Link to="/il-percorso" className="text-sm text-dona underline font-body">
            ← Vai alla pagina Percorso
          </Link>
        </div>
      </div>
    </div>
  );
}
