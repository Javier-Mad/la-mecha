"use client";

import { useEffect, useReducer, useRef } from "react";
import {
  applyBail,
  applyBoomAck,
  applyDoIt,
  applyManualEnd,
  applyOffer,
  applyOfferAccept,
  applyOfferReject,
  applyPush,
  applyTierUnlockAck,
  applyWildAck,
  startNewSession,
} from "@/lib/engine";
import { BASE_CATEGORIES } from "@/lib/constants";
import { clearState, loadState, saveState } from "@/lib/storage";
import type { Card, CardCategory, ClothingState, GameState, Screen, Tier, ToyType } from "@/lib/types";

const initialState: GameState = {
  player1Name: "",
  player2Name: "",
  startingTier: 1,
  disabledCards: [],
  customCards: [],
  sessionHistory: [],

  activeToys: [],
  activeCategories: [...BASE_CATEGORIES],
  naughtinessLevel: 3,
  bailsTotal: 3,
  availableTime: "unlimited",

  inProgress: false,
  currentTier: 1,
  activePlayer: 1,
  completedCards: [],
  completedInCurrentTier: 0,
  heat: 0,
  bailsRemaining: 3,

  clothingState: { player1: "clothed", player2: "clothed" } as ClothingState,

  currentCardId: null,
  fuseLength: 0,
  remainingFuse: 0,
  pushCount: 0,
  offerUsedOnCurrentCard: false,
  excludedFromNextDraw: [],
  lastCardWasBoom: false,
  actionCardsAfterBoom: 2,

  screen: "setup",
  shownCardIds: [],
  previousScreen: null,
};

interface SetupPayload {
  player1Name: string;
  player2Name: string;
  startingTier: Tier;
  activeToys: ToyType[];
  activeCategories: CardCategory[];
  naughtinessLevel: 1 | 2 | 3 | 4 | 5;
  bailsTotal: number;
  availableTime: "15min" | "30min" | "unlimited";
}

type Action =
  | { type: "HYDRATE"; payload: Partial<GameState> }
  | { type: "COMMIT_SETUP"; payload: SetupPayload }
  | { type: "GO_TO"; screen: Screen }
  | { type: "START_GAME" }
  | { type: "DO_IT" }
  | { type: "PUSH" }
  | { type: "BAIL" }
  | { type: "OFFER" }
  | { type: "OFFER_ACCEPT" }
  | { type: "OFFER_REJECT" }
  | { type: "BOOM_ACK" }
  | { type: "TIER_UNLOCK_ACK" }
  | { type: "WILD_ACK" }
  | { type: "TOGGLE_CARD"; cardId: string }
  | { type: "ADD_CUSTOM"; card: Card }
  | { type: "REMOVE_CUSTOM"; cardId: string }
  | { type: "SET_NAMES"; player1: string; player2: string }
  | { type: "RESET_SESSION" }
  | { type: "RESET_ALL" }
  | { type: "MANUAL_END" };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };

    case "COMMIT_SETUP":
      return {
        ...state,
        player1Name: action.payload.player1Name,
        player2Name: action.payload.player2Name,
        startingTier: action.payload.startingTier,
        activeToys: action.payload.activeToys,
        activeCategories: action.payload.activeCategories,
        naughtinessLevel: action.payload.naughtinessLevel,
        bailsTotal: action.payload.bailsTotal,
        availableTime: action.payload.availableTime,
      };

    case "GO_TO":
      return { ...state, previousScreen: state.screen, screen: action.screen };

    case "START_GAME":
      return startNewSession(state);

    case "DO_IT":
      return applyDoIt(state);

    case "PUSH":
      return applyPush(state);

    case "BAIL":
      return applyBail(state);

    case "OFFER":
      return applyOffer(state);

    case "OFFER_ACCEPT":
      return applyOfferAccept(state);

    case "OFFER_REJECT":
      return applyOfferReject(state);

    case "BOOM_ACK":
      return applyBoomAck(state);

    case "TIER_UNLOCK_ACK":
      return applyTierUnlockAck(state);

    case "WILD_ACK":
      return applyWildAck(state);

    case "TOGGLE_CARD": {
      const isDisabled = state.disabledCards.includes(action.cardId);
      return {
        ...state,
        disabledCards: isDisabled
          ? state.disabledCards.filter((id) => id !== action.cardId)
          : [...state.disabledCards, action.cardId],
      };
    }

    case "ADD_CUSTOM":
      return { ...state, customCards: [...state.customCards, action.card] };

    case "REMOVE_CUSTOM":
      return {
        ...state,
        customCards: state.customCards.filter((c) => c.id !== action.cardId),
      };

    case "SET_NAMES":
      return { ...state, player1Name: action.player1, player2Name: action.player2 };

    case "RESET_SESSION":
      // Keep library prefs (custom cards, disabled list, history, names, config).
      return {
        ...state,
        inProgress: false,
        currentTier: state.startingTier,
        activePlayer: 1,
        completedCards: [],
        heat: 0,
        bailsRemaining: state.bailsTotal,
        currentCardId: null,
        fuseLength: 0,
        remainingFuse: 0,
        pushCount: 0,
        completedInCurrentTier: 0,
        offerUsedOnCurrentCard: false,
        clothingState: { player1: "clothed", player2: "clothed" } as ClothingState,
        excludedFromNextDraw: [],
        lastCardWasBoom: false,
        actionCardsAfterBoom: 2,
        shownCardIds: [],
        screen: "setup",
        previousScreen: null,
      };

    case "RESET_ALL":
      return { ...initialState, screen: "setup" };

    case "MANUAL_END":
      return applyManualEnd(state);

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  // Hydrate from localStorage on first mount.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const persisted = loadState();
    if (persisted) {
      const screen: Screen = persisted.inProgress ? "resume-prompt" : "setup";
      dispatch({
        type: "HYDRATE",
        payload: { ...persisted, screen, shownCardIds: [], excludedFromNextDraw: [], previousScreen: null },
      });
    }
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    saveState(state);
  }, [state]);

  return {
    state,
    dispatch,
    resetStorage: () => {
      clearState();
      dispatch({ type: "RESET_ALL" });
    },
  };
}
