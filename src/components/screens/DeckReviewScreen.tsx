"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { TypeBadge } from "../TypeBadge";
import { CARD_DATABASE } from "@/data/cards";
import { TIER_NAMES } from "@/lib/constants";
import type { Card, Tier } from "@/lib/types";

interface DeckReviewScreenProps {
  disabledCards: string[];
  customCards: Card[];
  onToggle: (cardId: string) => void;
  onBack: () => void;
}

const FILTERS: Array<{ key: "ALL" | Tier; label: string }> = [
  { key: "ALL", label: "Todo" },
  { key: 1, label: "T1" },
  { key: 2, label: "T2" },
  { key: 3, label: "T3" },
  { key: 4, label: "T4" },
];

export function DeckReviewScreen({ disabledCards, customCards, onToggle, onBack }: DeckReviewScreenProps) {
  const [filter, setFilter] = useState<"ALL" | Tier>("ALL");
  const disabled = useMemo(() => new Set(disabledCards), [disabledCards]);

  const all = useMemo(
    () => [...CARD_DATABASE, ...customCards].filter((c) => filter === "ALL" || c.tier === filter),
    [filter, customCards],
  );

  return (
    <Frame>
      <header className="flex items-center justify-between pt-4 pb-3 sticky top-0 bg-bg/95 backdrop-blur z-10">
        <button onClick={onBack} className="text-sm text-ink/70 underline-offset-2 hover:underline">
          ← Volver
        </button>
        <h2 className="font-display text-xl tracking-wide">Revisar deck</h2>
        <span className="text-xs text-ink/50 w-12 text-right">{all.length - all.filter((c) => disabled.has(c.id)).length} on</span>
      </header>

      <div className="flex gap-2 pb-3 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={String(f.key)}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest ring-1 ${
              filter === f.key
                ? "bg-ember-bright/20 text-ember-bright ring-ember-bright/40"
                : "bg-white/5 text-ink/60 ring-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-6 space-y-2">
        {all.map((card) => {
          const off = disabled.has(card.id);
          return (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggle(card.id)}
              className={`w-full text-left rounded-xl p-3 ring-1 transition-colors ${
                off ? "bg-white/[0.02] ring-white/5 opacity-50" : "bg-surface ring-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <TypeBadge category={card.category} />
                  <span className="text-[10px] uppercase tracking-widest text-ink/40">
                    {card.id} · {TIER_NAMES[card.tier]}
                  </span>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-widest ${
                    off ? "text-ink/40" : "text-emerald-300"
                  }`}
                >
                  {off ? "OFF" : "ON"}
                </span>
              </div>
              <p className="text-sm text-ink/90 leading-snug">{card.action}</p>
            </motion.button>
          );
        })}
      </div>
    </Frame>
  );
}
