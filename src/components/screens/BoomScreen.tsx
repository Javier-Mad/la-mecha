"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Frame } from "../Frame";
import { ExplosionFx } from "../ExplosionFx";
import type { GameState } from "@/lib/types";

interface BoomScreenProps {
  state: GameState;
  onContinue: () => void;
}

export function BoomScreen({ state, onContinue }: BoomScreenProps) {
  // Partner takes control on BOOM — we display the FUTURE active player.
  const nextActiveName =
    state.activePlayer === 1 ? state.player2Name || "Jugador 2" : state.player1Name || "Jugador 1";

  const [showFx, setShowFx] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShowFx(false), 800);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Frame>
      {showFx && <ExplosionFx />}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: [0, -10, 9, -7, 6, -3, 0] }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6"
      >
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 16, bounce: 0.22 }}
          className="font-display text-7xl tracking-[0.15em] text-ember-bright drop-shadow-[0_0_32px_rgba(255,69,0,0.7)]"
        >
          ¡BOOM!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-ink/80 max-w-xs"
        >
          Demasiado. El control cambia.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
          className="font-display text-4xl tracking-wide text-ember-bright"
        >
          {nextActiveName}
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onContinue}
          whileTap={{ scale: 0.96 }}
          className="mt-6 min-h-[56px] px-8 rounded-2xl bg-gradient-to-r from-ember-deep to-ember-bright font-display text-xl tracking-[0.2em] uppercase text-white"
        >
          Continuar
        </motion.button>
      </motion.div>
    </Frame>
  );
}
