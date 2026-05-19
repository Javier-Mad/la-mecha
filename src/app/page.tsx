"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameState } from "@/hooks/useGameState";
import { ResumePromptScreen } from "@/components/screens/ResumePromptScreen";
import { SetupScreen } from "@/components/screens/SetupScreen";
import { DeckReviewScreen } from "@/components/screens/DeckReviewScreen";
import { CustomCardScreen } from "@/components/screens/CustomCardScreen";
import { GameScreen } from "@/components/screens/GameScreen";
import { OfferScreen } from "@/components/screens/OfferScreen";
import { BoomScreen } from "@/components/screens/BoomScreen";
import { TierUnlockScreen } from "@/components/screens/TierUnlockScreen";
import { WildCardScreen } from "@/components/screens/WildCardScreen";
import { GameOverScreen } from "@/components/screens/GameOverScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import type { Screen } from "@/lib/types";

export default function Page() {
  const { state, dispatch, resetStorage } = useGameState();

  const goTo = (screen: Screen) => dispatch({ type: "GO_TO", screen });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.screen}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {state.screen === "resume-prompt" && (
          <ResumePromptScreen
            state={state}
            onResume={() => dispatch({ type: "GO_TO", screen: "game" })}
            onRestart={() => dispatch({ type: "RESET_SESSION" })}
          />
        )}

        {state.screen === "setup" && (
          <SetupScreen
            player1Name={state.player1Name}
            player2Name={state.player2Name}
            startingTier={state.startingTier}
            onCommit={(p1, p2, tier, config) => {
              dispatch({
                type: "COMMIT_SETUP",
                payload: {
                  player1Name: p1,
                  player2Name: p2,
                  startingTier: tier,
                  activeToys: config.activeToys,
                  activeCategories: config.activeCategories,
                  naughtinessLevel: config.naughtinessLevel,
                  bailsTotal: config.bailsTotal,
                  availableTime: config.availableTime,
                },
              });
              dispatch({ type: "START_GAME" });
            }}
          />
        )}

        {state.screen === "deck-review" && (
          <DeckReviewScreen
            disabledCards={state.disabledCards}
            customCards={state.customCards}
            onToggle={(cardId) => dispatch({ type: "TOGGLE_CARD", cardId })}
            onBack={() => goTo(state.previousScreen === "settings" ? "settings" : "setup")}
          />
        )}

        {state.screen === "custom-cards" && (
          <CustomCardScreen
            customCards={state.customCards}
            onAdd={(card) => dispatch({ type: "ADD_CUSTOM", card })}
            onRemove={(cardId) => dispatch({ type: "REMOVE_CUSTOM", cardId })}
            onBack={() => goTo(state.previousScreen === "settings" ? "settings" : "setup")}
          />
        )}

        {state.screen === "game" && (
          <GameScreen
            state={state}
            onDoIt={() => dispatch({ type: "DO_IT" })}
            onPush={() => dispatch({ type: "PUSH" })}
            onOffer={() => dispatch({ type: "OFFER" })}
            onBail={() => dispatch({ type: "BAIL" })}
            onOpenSettings={() => goTo("settings")}
            onManualEnd={() => dispatch({ type: "MANUAL_END" })}
          />
        )}

        {state.screen === "offer" && (
          <OfferScreen
            state={state}
            onAccept={() => dispatch({ type: "OFFER_ACCEPT" })}
            onReject={() => dispatch({ type: "OFFER_REJECT" })}
          />
        )}

        {state.screen === "boom" && (
          <BoomScreen state={state} onContinue={() => dispatch({ type: "BOOM_ACK" })} />
        )}

        {state.screen === "tier-unlock" && (
          <TierUnlockScreen
            fromTier={state.currentTier}
            onContinue={() => dispatch({ type: "TIER_UNLOCK_ACK" })}
          />
        )}

        {state.screen === "wild" && (
          <WildCardScreen state={state} onContinue={() => dispatch({ type: "WILD_ACK" })} />
        )}

        {state.screen === "game-over" && (
          <GameOverScreen state={state} onReturnToSetup={() => dispatch({ type: "RESET_SESSION" })} />
        )}

        {state.screen === "settings" && (
          <SettingsScreen
            state={state}
            onBack={() => goTo("game")}
            onReviewDeck={() => goTo("deck-review")}
            onCustomCards={() => goTo("custom-cards")}
            onUpdateNames={(p1, p2) => dispatch({ type: "SET_NAMES", player1: p1, player2: p2 })}
            onResetSession={() => dispatch({ type: "RESET_SESSION" })}
            onResetAll={resetStorage}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
