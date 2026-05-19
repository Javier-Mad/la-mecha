"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { ActionCard } from "../ActionCard";
import { CircularTimer } from "../CircularTimer";
import { findCard } from "@/lib/engine";
import type { GameState } from "@/lib/types";

interface OfferScreenProps {
  state: GameState;
  onAccept: () => void;
  onReject: () => void;
}

export function OfferScreen({ state, onAccept, onReject }: OfferScreenProps) {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const activeName = state.activePlayer === 1 ? state.player1Name : state.player2Name;
  const partnerName = state.activePlayer === 1 ? state.player2Name : state.player1Name;

  // For timed cards: partner presses Aceptar → timer runs → onAccept fires on complete.
  // For instant cards: Aceptar fires onAccept immediately.
  const [executing, setExecuting] = useState(false);
  const hasTimer = !!(card && card.duration > 0);

  const handleAccept = () => {
    if (hasTimer) {
      setExecuting(true);
    } else {
      onAccept();
    }
  };

  return (
    <Frame>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-4 py-6">
        <header className="text-center space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink/40">
            {executing
              ? `${partnerName || "Tu pareja"} ejecutando…`
              : `${activeName || "Jugador 1"} te ofrece esta carta`}
          </p>
          <h2 className="font-display text-3xl tracking-wide text-ember-bright">{partnerName || "Tu pareja"}</h2>
          {!executing && <p className="text-sm text-ink/60">¿Acepta hacer esto?</p>}
        </header>

        <div className="flex-1 flex items-center justify-center">
          {card && (
            <ActionCard
              key={card.id}
              card={card}
              activePlayerName={partnerName}
              partnerName={activeName}
            />
          )}
        </div>

        {executing ? (
          /* Partner is executing — show timer, no buttons */
          <div className="flex flex-col items-center gap-3 pb-4">
            <CircularTimer
              key={card!.id}
              duration={card!.duration}
              onComplete={onAccept}
            />
          </div>
        ) : (
          /* Decision phase — show Rechazar / Aceptar */
          <>
            <p className="text-center text-xs text-ink/40 px-4">
              Si acepta, tu pareja ejecuta esta acción. Tú sigues con el control.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onReject}
                className="min-h-[56px] rounded-2xl bg-white/5 ring-1 ring-white/15 font-display text-xl tracking-[0.15em] uppercase text-ink/80 hover:bg-white/10"
              >
                Rechazar
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleAccept}
                className="min-h-[56px] rounded-2xl bg-emerald-600/90 ring-1 ring-emerald-300/30 font-display text-xl tracking-[0.15em] uppercase text-white hover:bg-emerald-500"
              >
                Aceptar
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </Frame>
  );
}
