"use client";

import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { TIER_NAMES } from "@/lib/constants";
import type { GameState } from "@/lib/types";

interface GameOverScreenProps {
  state: GameState;
  onReturnToSetup: () => void;
}

export function GameOverScreen({ state, onReturnToSetup }: GameOverScreenProps) {
  const lastSession = state.sessionHistory[0];
  return (
    <Frame>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6"
      >
        <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">Victoria</p>
        <h1 className="font-display text-5xl tracking-wide text-ember-bright">
          La mecha se consumió
        </h1>
        <p className="text-base text-ink/80 max-w-xs leading-relaxed">
          Quédense aquí. Hablen o no hablen. La partida termina; la noche, no.
        </p>

        {lastSession && (
          <div className="rounded-2xl bg-surface ring-1 ring-white/5 p-4 grid grid-cols-2 gap-3 text-sm w-full max-w-xs mt-2">
            <Stat label="Cartas" value={String(lastSession.cardsCompleted)} />
            <Stat label="Nivel" value={TIER_NAMES[lastSession.tiersReached as 1 | 2 | 3 | 4] || ""} />
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onReturnToSetup}
          className="mt-4 min-h-[56px] px-8 rounded-2xl bg-gradient-to-r from-ember-deep to-ember-bright font-display text-xl tracking-[0.2em] uppercase text-white"
        >
          Volver al inicio
        </motion.button>
      </motion.div>
    </Frame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.25em] text-ink/40">{label}</span>
      <span className="text-ink font-display text-2xl tracking-wide">{value}</span>
    </div>
  );
}
