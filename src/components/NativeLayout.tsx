/**
 * NativeLayout.tsx
 * ────────────────
 * Layout minimale per l'esperienza app nativa (iOS / Android).
 * Nessun header/footer/barra DONA ORA — solo safe-area e contenuto.
 */

import { isNativeApp } from "@/lib/capacitorGeo";
import Layout from "./Layout";

interface Props {
  children: React.ReactNode;
}

export default function NativeLayout({ children }: Props) {
  // Su browser/PWA usa il Layout completo con header e footer
  if (!isNativeApp()) {
    return <Layout>{children}</Layout>;
  }

  // Su app nativa: layout minimale con safe area
  return (
    <div className="min-h-screen flex flex-col bg-background pt-safe pb-safe">
      <main className="flex-1">{children}</main>
    </div>
  );
}
