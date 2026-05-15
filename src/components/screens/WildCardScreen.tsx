"use client";

import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { findCard } from "@/lib/engine";
import type { GameState } from "@/lib/types";

interface WildCardScreenProps {
  state: GameState;
  onContinue: () => void;
}

export function WildCardScreen({ state, onContinue }: WildCardScreenProps) {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;

  return (
    <Frame>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center gap-6 text-center"
      >
        <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">Wild</p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 ring-1 ring-amber-400/40 p-6 max-w-sm shadow-[0_0_60px_rgba(217,119,6,0.25)]"
        >
          <p className="font-display text-2xl leading-snug text-amber-50">{card?.action ?? ""}</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.96 }}
          onClick={onContinue}
          className="min-h-[56px] px-8 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-800 font-display text-xl tracking-[0.2em] uppercase text-amber-50"
        >
          Terminar
        </motion.button>
      </motion.div>
    </Frame>
  );
}
