"use client";

import { motion } from "framer-motion";
import { TIER_NAMES, TIER_UNLOCK_HEAT } from "@/lib/constants";
import type { Tier } from "@/lib/types";

interface TierProgressProps {
  tier: Tier;
  heat: number;
}

export function TierProgress({ tier, heat }: TierProgressProps) {
  const atMax = tier === 4;
  const nextTier = Math.min(4, tier + 1) as 2 | 3 | 4;
  const threshold = atMax ? 0 : TIER_UNLOCK_HEAT[nextTier];
  const pct = atMax ? 1 : Math.min(1, heat / threshold);

  return (
    <div className="flex items-center gap-3" aria-label={`Calor: ${heat.toFixed(1)}`}>
      <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">{TIER_NAMES[tier]}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-ember-deep to-ember-bright origin-left"
          animate={{ scaleX: pct }}
          initial={false}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {atMax ? (
        <span className="text-[10px] uppercase tracking-widest text-ember-bright">MAX</span>
      ) : (
        <span className="text-[10px] tabular-nums text-ink/60">
          {heat.toFixed(1)}/{threshold}
        </span>
      )}
    </div>
  );
}
