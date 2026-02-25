/**
 * ShareCard.tsx
 * ─────────────
 * Card visiva "Anch'io cammino per una giusta causa" con condivisione social.
 * Mostra attività, km percorsi e invito a sostenere.
 */

import { useRef } from "react";
import { Share2, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/capacitorGeo";
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABEL,
  ACTIVITY_COLOR,
  ACTIVITY_GERUND,
  type ActivityType,
} from "@/lib/communityTracking";

interface ShareCardProps {
  activityType: ActivityType;
  displayName: string;
  kmTracked: number;
  elapsed?: number;
}

export default function ShareCard({
  activityType,
  displayName,
  kmTracked,
  elapsed,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const emoji = ACTIVITY_EMOJI[activityType];
  const label = ACTIVITY_LABEL[activityType];
  const color = ACTIVITY_COLOR[activityType];
  const gerund = ACTIVITY_GERUND[activityType];

  function formatTime(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  }

  async function handleShare() {
    const kmText = kmTracked > 0.1 ? `${kmTracked.toFixed(1)} km ${gerund}` : "";
    const timeText = elapsed && elapsed > 0 ? ` in ${formatTime(elapsed)}` : "";
    const statsLine = kmText ? `\n${emoji} ${kmText}${timeText}\n` : "\n";

    const text =
      `Anch'io cammino per una giusta causa! 💗\n` +
      `${statsLine}` +
      `Sto partecipando a #1000kmDIGRATITUDINE — un cammino di solidarietà ` +
      `da Bologna alla Calabria per sostenere la ricerca sul cancro al seno con Komen Italia.\n\n` +
      `Unisciti anche tu! 👉 1000kmdigratitudine.it/partecipa\n\n` +
      `#1000kmdiGratitudine #Komen #solidarieta #AnchIoCammino`;

    const shareData = {
      title: "Anch'io cammino per una giusta causa!",
      text,
      url: "https://1000kmdigratitudine.it/partecipa",
    };

    // Prova condivisione nativa (Capacitor Share o Web Share API)
    if (isNativeApp()) {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: shareData.title,
          text,
          url: shareData.url,
          dialogTitle: "Condividi la tua attività",
        });
        return;
      } catch {
        // Fallback alla Web Share API
      }
    }

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Chiuso dal utente, non è un errore
      }
    }

    // Ultimo fallback: copia negli appunti
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${text}\n\n${shareData.url}`);
      toast.success("Copiato negli appunti!", {
        description: "Incollalo nel tuo social preferito",
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Card visiva */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border-2 p-6"
        style={{ borderColor: `${color}40`, background: `${color}08` }}
      >
        {/* Badge attività */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">{emoji}</span>
          <div>
            <p
              className="text-xs font-body font-bold uppercase tracking-widest"
              style={{ color }}
            >
              {label}
            </p>
            <p className="text-sm font-body text-muted-foreground">{displayName}</p>
          </div>
        </div>

        {/* Messaggio principale */}
        <h3 className="font-heading text-xl font-bold text-foreground leading-snug mb-3">
          Anch'io cammino per una giusta causa!
        </h3>

        {/* Stats */}
        {kmTracked > 0.01 && (
          <div className="flex gap-4 mb-4">
            <div className="bg-white/80 rounded-xl px-4 py-2 shadow-sm">
              <p className="text-lg font-heading font-bold text-foreground">
                {kmTracked.toFixed(1)}
              </p>
              <p className="text-[10px] font-body text-muted-foreground uppercase">km</p>
            </div>
            {elapsed != null && elapsed > 0 && (
              <div className="bg-white/80 rounded-xl px-4 py-2 shadow-sm">
                <p className="text-lg font-heading font-bold text-foreground">
                  {formatTime(elapsed)}
                </p>
                <p className="text-[10px] font-body text-muted-foreground uppercase">tempo</p>
              </div>
            )}
          </div>
        )}

        {/* Causa */}
        <p className="text-xs font-body text-muted-foreground leading-relaxed">
          <Heart className="w-3 h-3 inline-block text-dona mr-1" />
          Raccolta fondi per <strong>Komen Italia</strong> — ricerca cancro al seno
        </p>

        {/* Watermark */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="font-heading text-xs font-bold text-foreground/60">
            1000<span style={{ color }}>KM</span>DIGRATITUDINE
          </span>
          <span className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
            <ExternalLink className="w-2.5 h-2.5" />
            1000kmdigratitudine.it
          </span>
        </div>
      </div>

      {/* Bottone condividi */}
      <Button
        variant="dona"
        size="lg"
        className="w-full"
        onClick={handleShare}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Condividi sui social
      </Button>
    </div>
  );
}
