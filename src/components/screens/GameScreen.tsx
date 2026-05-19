"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Frame } from "../Frame";
import { Fuse } from "../Fuse";
import { ActionCard } from "../ActionCard";
import { ActionButtons } from "../ActionButtons";
import { PushCounter } from "../PushCounter";
import { TierProgress } from "../TierProgress";
import { CircularTimer } from "../CircularTimer";
import { findCard } from "@/lib/engine";
import type { GameState } from "@/lib/types";

interface GameScreenProps {
  state: GameState;
  onDoIt: () => void;
  onPush: () => void;
  onOffer: () => void;
  onBail: () => void;
  onOpenSettings: () => void;
  onManualEnd: () => void;
}

export function GameScreen({ state, onDoIt, onPush, onOffer, onBail, onOpenSettings, onManualEnd }: GameScreenProps) {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const activeName = state.activePlayer === 1 ? state.player1Name : state.player2Name;
  const partnerName = state.activePlayer === 1 ? state.player2Name : state.player1Name;

  // Timer flow:
  // 1. Card appears → all buttons available (HACERLA, EMPUJAR, BAIL)
  // 2. Player presses HACERLA on a timed card → timer starts, buttons hidden
  // 3. Timer reaches 0 (or Saltar) → card auto-completes (onDoIt dispatched)
  const [timerActive, setTimerActive] = useState(false);
  useEffect(() => { setTimerActive(false); }, [card?.id]);

  const hasTimer = !!(card && card.duration > 0 && card.category !== "BOOM" && card.category !== "WILD");

  const handleDoIt = () => {
    if (hasTimer && !timerActive) {
      setTimerActive(true); // start countdown, wait for timer to call onDoIt
    } else {
      onDoIt();
    }
  };

  const offerDisabled = state.offerUsedOnCurrentCard;

  return (
    <Frame>
      <header className="pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink/40">Lleva el control</p>
          <h1 className="font-display text-2xl tracking-wide text-ember-bright">{activeName || "Jugador 1"}</h1>
        </div>
        <button
          aria-label="Ajustes"
          onClick={onOpenSettings}
          className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 flex items-center justify-center"
        >
          <GearIcon />
        </button>
      </header>

      <Fuse fuseLength={state.fuseLength} remainingFuse={state.remainingFuse} />

      <section className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
        <AnimatePresence mode="wait">
          {card && (
            <ActionCard
              key={card.id}
              card={card}
              activePlayerName={activeName}
              partnerName={partnerName}
            />
          )}
        </AnimatePresence>

        {/* Timer only shown after HACERLA is pressed on a timed card */}
        {timerActive && hasTimer && (
          <CircularTimer
            key={card!.id}
            duration={card!.duration}
            onComplete={onDoIt}
          />
        )}
      </section>

      <section className="space-y-3 mb-3">
        <div className="flex items-center justify-between">
          <PushCounter count={state.pushCount} />
        </div>
        <TierProgress tier={state.currentTier} heat={state.heat} />
      </section>

      {/* Action buttons hidden while timer is running */}
      {!timerActive && (
        <ActionButtons
          onDoIt={handleDoIt}
          onPush={onPush}
          onOffer={onOffer}
          onBail={onBail}
          bailsRemaining={state.bailsRemaining}
          doItDisabled={false}
          offerDisabled={offerDisabled}
        />
      )}

      {/* "Terminar juego" — only available in T4 after earning MIN_WILD_GATE completions.
          Matches the same gate as the WILD card so the option appears around the same
          time the card could naturally draw. */}
      {state.currentTier === 4 && state.completedInCurrentTier >= 8 && (
        <button
          onClick={onManualEnd}
          className="w-full text-center text-[11px] uppercase tracking-[0.25em] text-ink/25 hover:text-ink/50 py-3 transition-colors"
        >
          Terminar juego
        </button>
      )}
    </Frame>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink/70">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
