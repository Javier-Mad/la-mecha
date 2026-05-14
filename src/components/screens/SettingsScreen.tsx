"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Frame } from "../Frame";
import type { GameState } from "@/lib/types";

interface SettingsScreenProps {
  state: GameState;
  onBack: () => void;
  onReviewDeck: () => void;
  onCustomCards: () => void;
  onUpdateNames: (p1: string, p2: string) => void;
  onResetSession: () => void;
  onResetAll: () => void;
}

export function SettingsScreen({
  state,
  onBack,
  onReviewDeck,
  onCustomCards,
  onUpdateNames,
  onResetSession,
  onResetAll,
}: SettingsScreenProps) {
  const [p1, setP1] = useState(state.player1Name);
  const [p2, setP2] = useState(state.player2Name);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const saveNames = () => {
    if (p1.trim() && p2.trim()) {
      onUpdateNames(p1.trim(), p2.trim());
    }
  };

  return (
    <Frame>
      <header className="flex items-center justify-between pt-4 pb-3">
        <button onClick={onBack} className="text-sm text-ink/70 underline-offset-2 hover:underline">
          ← Volver
        </button>
        <h2 className="font-display text-xl tracking-wide">Ajustes</h2>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto space-y-5 pb-6">
        <section className="rounded-2xl bg-surface border border-white/5 p-4 space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Jugadores</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              maxLength={20}
              className="h-11 rounded-xl bg-bg border border-white/5 px-3 text-ink"
            />
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              maxLength={20}
              className="h-11 rounded-xl bg-bg border border-white/5 px-3 text-ink"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={saveNames}
            className="w-full h-11 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 font-display text-sm tracking-[0.2em] uppercase text-white"
          >
            Guardar nombres
          </motion.button>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={onReviewDeck}
            className="min-h-[64px] rounded-xl bg-surface ring-1 ring-white/5 px-3 text-left hover:bg-white/5"
          >
            <div className="font-display text-base">Revisar deck</div>
            <div className="text-[11px] text-ink/50 mt-1">{state.disabledCards.length} deshabilitadas</div>
          </button>
          <button
            onClick={onCustomCards}
            className="min-h-[64px] rounded-xl bg-surface ring-1 ring-white/5 px-3 text-left hover:bg-white/5"
          >
            <div className="font-display text-base">Personalizadas</div>
            <div className="text-[11px] text-ink/50 mt-1">{state.customCards.length} cartas</div>
          </button>
        </section>

        <section className="rounded-2xl bg-surface border border-white/5 p-4 space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Sesión actual</h3>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onResetSession}
            className="w-full h-11 rounded-xl bg-amber-600/80 hover:bg-amber-500 font-display text-sm tracking-[0.2em] uppercase text-white"
          >
            Reiniciar partida
          </motion.button>
          <p className="text-[11px] text-ink/40">Empieza desde tu nivel inicial. Conserva tus cartas y nombres.</p>
        </section>

        <section className="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-red-300">Zona peligrosa</h3>
          {confirmingAll ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmingAll(false)}
                className="h-11 rounded-xl bg-white/5 ring-1 ring-white/10 text-sm uppercase tracking-widest text-ink/70"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setConfirmingAll(false);
                  onResetAll();
                }}
                className="h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm uppercase tracking-widest"
              >
                Sí, borrar todo
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingAll(true)}
              className="w-full h-11 rounded-xl bg-red-600/80 hover:bg-red-500 font-display text-sm tracking-[0.2em] uppercase text-white"
            >
              Borrar todos los datos
            </button>
          )}
          <p className="text-[11px] text-red-200/60">Borra nombres, cartas personalizadas, deshabilitadas e historial.</p>
        </section>
      </div>
    </Frame>
  );
}
