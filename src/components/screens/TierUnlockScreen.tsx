"use client";

import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { TIER_DESCRIPTIONS, TIER_NAMES } from "@/lib/constants";
import type { Tier } from "@/lib/types";

interface TierUnlockScreenProps {
  fromTier: Tier;
  onContinue: () => void;
}

const PARTICLE_COUNT = 18;

export function TierUnlockScreen({ fromTier, onContinue }: TierUnlockScreenProps) {
  const nextTier = Math.min(4, fromTier + 1) as Tier;

  return (
    <Frame>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
          const dist = 220 + Math.random() * 80;
          return (
            <motion.span
              key={i}
              initial={{
                left: "50%",
                top: "50%",
                x: "-50%",
                y: "-50%",
                scale: 0.4,
                opacity: 0.9,
              }}
              animate={{
                x: `calc(-50% + ${Math.cos(angle) * dist}px)`,
                y: `calc(-50% + ${Math.sin(angle) * dist}px)`,
                scale: 0.1,
                opacity: 0,
              }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute h-2 w-2 rounded-full bg-ember-bright shadow-[0_0_8px_rgba(255,69,0,0.8)]"
            />
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10"
      >
        <p className="text-[10px] uppercase tracking-[0.4em] text-ember-bright">Nivel desbloqueado</p>
        <h1 className="font-display text-6xl tracking-wide text-ember-bright drop-shadow-[0_0_24px_rgba(255,69,0,0.5)]">
          {TIER_NAMES[nextTier]}
        </h1>
        <p className="text-base text-ink/80 max-w-xs">{TIER_DESCRIPTIONS[nextTier]}</p>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onContinue}
          className="mt-6 min-h-[56px] px-8 rounded-2xl bg-gradient-to-r from-ember-deep to-ember-bright font-display text-xl tracking-[0.2em] uppercase text-white"
        >
          Continuar
        </motion.button>
      </motion.div>
    </Frame>
  );
}
