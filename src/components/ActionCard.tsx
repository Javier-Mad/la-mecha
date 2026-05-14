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

      {card.duration > 0 && (
        <div className="mt-4 text-center text-xs uppercase tracking-widest text-current/60">
          {card.duration} segundos
        </div>
      )}
    </motion.div>
  );
}
