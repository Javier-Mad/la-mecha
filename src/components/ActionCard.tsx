"use client";

import { motion } from "framer-motion";
import { TierBadge } from "./TierBadge";
import { TypeBadge } from "./TypeBadge";
import type { Card } from "@/lib/types";

interface ActionCardProps {
  card: Card;
  activePlayerName: string;
  partnerName: string;
  variant?: "normal" | "boom" | "wild";
}

function interpolate(text: string, player: string, partner: string): string {
  return text.replaceAll("{jugador}", player || "tú").replaceAll("{pareja}", partner || "tu pareja");
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 15.5 14" />
    </svg>
  );
}

const QUIEN_LABEL: Record<string, string | null> = {
  PAREJA: "Tu pareja ejecuta esto",
  MUTUO: "Los dos",
  TÚ: null, // active player executes — no label needed
};

export function ActionCard({ card, activePlayerName, partnerName, variant = "normal" }: ActionCardProps) {
  const surface =
    variant === "boom"
      ? "bg-red-600 text-white border-red-400/60"
      : variant === "wild"
      ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border-amber-500/40"
      : "bg-surface text-ink border-white/5";

  const text = interpolate(card.action, activePlayerName, partnerName);
  const quienLabel = QUIEN_LABEL[card.quien] ?? null;
  const clothingAction = card.undressingAmount === "final" ? "Quita última prenda" : "Quita una capa";
  const clothingLabel = card.undressingTarget
    ? card.undressingTarget === "both"
      ? `${clothingAction}: ambos`
      : card.undressingTarget === "active"
      ? `${clothingAction}: ${activePlayerName || "jugador activo"}`
      : `${clothingAction}: ${partnerName || "pareja"}`
    : null;

  return (
    <motion.div
      key={card.id}
      initial={{ y: 28, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 26 } }}
      exit={{ y: -20, opacity: 0, scale: 0.96, transition: { duration: 0.14, ease: [0.77, 0, 0.175, 1] } }}
      className={`rounded-2xl border ${surface} p-6 shadow-[0_8px_40px_rgba(255,69,0,0.08)] w-full`}
    >
      <div className="flex items-center justify-between mb-5">
        <TypeBadge category={card.category} />
        <TierBadge tier={card.tier} />
      </div>

      <p className="font-display text-2xl leading-tight tracking-wide text-center">
        {text}
      </p>

      {quienLabel && (
        <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-current/50">
          {quienLabel}
        </p>
      )}

      {clothingLabel && (
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-amber-200/70">
          {clothingLabel}
        </p>
      )}

      {card.duration > 0 && (
        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 ring-1 ring-white/10 px-3 py-1 text-[11px] tabular-nums text-current/55 tracking-wide">
            <ClockIcon />
            {card.duration}s
          </span>
        </div>
      )}
    </motion.div>
  );
}
