"use client";

import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { TIER_NAMES } from "@/lib/constants";
import type { GameState } from "@/lib/types";

interface ResumePromptScreenProps {
  state: GameState;
  onResume: () => void;
  onRestart: () => void;
}

export function ResumePromptScreen({ state, onResume, onRestart }: ResumePromptScreenProps) {
  return (
    <Frame className="justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 my-auto"
      >
        <header className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-ember-bright">La Mecha</p>
          <h1 className="font-display text-4xl tracking-wide">Tienes una partida en curso</h1>
        </header>

        <div className="rounded-2xl bg-surface border border-white/5 p-5 space-y-2 text-sm">
          <Row label="Jugadores" value={`${state.player1Name || "Jugador 1"} y ${state.player2Name || "Jugador 2"}`} />
          <Row label="Nivel actual" value={TIER_NAMES[state.currentTier]} />
          <Row label="Cartas completadas" value={String(state.completedCards.length)} />
          <Row label="Control" value={state.activePlayer === 1 ? state.player1Name || "Jugador 1" : state.player2Name || "Jugador 2"} />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onResume}
            className="min-h-[56px] rounded-2xl bg-gradient-to-r from-ember-deep to-ember-bright font-display text-2xl tracking-[0.15em] uppercase text-white"
          >
            Continuar
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onRestart}
            className="min-h-[48px] rounded-2xl bg-white/5 ring-1 ring-white/10 font-display text-lg tracking-[0.15em] uppercase text-ink/70"
          >
            Empezar de cero
          </motion.button>
        </div>

        <p className="text-xs text-center text-ink/40">
          Empezar de cero conserva tus cartas personalizadas y deshabilitadas.
        </p>
      </motion.div>
    </Frame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.2em] text-ink/40">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
