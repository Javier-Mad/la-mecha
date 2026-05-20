import {
  BOOM_PROBABILITIES,
  FUSE_MAX,
  FUSE_MIN,
  HEAT_GAINS,
  MAX_SESSION_HISTORY,
  MIN_WILD_GATE,
  TIER_MIN_CARDS,
  TIER_UNLOCK_HEAT,
} from "./constants";
import { buildActiveDeck, drawNext } from "./deck";
import { CARD_DATABASE } from "@/data/cards";
import type { Card, GameState, Tier } from "./types";

export function randomFuseLength(): number {
  return FUSE_MIN + Math.floor(Math.random() * (FUSE_MAX - FUSE_MIN + 1));
}

export function findCard(id: string, customCards: Card[]): Card | undefined {
  return [...CARD_DATABASE, ...customCards].find((c) => c.id === id);
}

// Count completed non-BOOM action cards for the given tier from the completedCards array.
// BOOM IDs use the pattern T{tier}-B{n}; action IDs use T{tier}-{n} (no B suffix).
// This is the authoritative unlock gate — the completedInCurrentTier counter is kept for
// the heat-meter UI but can drift (e.g. if a null card somehow triggers applyDoIt).
function countTierActions(completedCards: string[], tier: Tier): number {
  const prefix = `T${tier}-`;
  const boomPrefix = `T${tier}-B`;
  return completedCards.filter((id) => id.startsWith(prefix) && !id.startsWith(boomPrefix)).length;
}

// One place that owns "draw the next card". Builds the active deck filtered by
// session config, peels off the next un-shown ID, returns card + new shownIds.
// WILD cards are gated behind MIN_WILD_GATE completions in the current tier so
// the session-ending WILD can't appear on the first few T4 draws.
export function drawCard(state: GameState): { card: Card | null; nextShownIds: string[] } {
  const raw = buildActiveDeck(
    state.currentTier,
    state.disabledCards,
    state.customCards,
    state.activeCategories,
    state.activeToys,
    state.naughtinessLevel,
    state.heat,
  );
  const deck = state.completedInCurrentTier < MIN_WILD_GATE
    ? raw.filter((c) => c.category !== "WILD")
    : raw;
  return drawNext(deck, state.shownCardIds);
}

// Draw the next ACTION card — strips BOOM and WILD from the candidate pool.
// Called after any BOOM event to guarantee no consecutive BOOMs.
function drawActionCard(state: GameState): { card: Card | null; nextShownIds: string[] } {
  const deck = buildActiveDeck(
    state.currentTier,
    state.disabledCards,
    state.customCards,
    state.activeCategories,
    state.activeToys,
    state.naughtinessLevel,
    state.heat,
  ).filter((c) => c.category !== "BOOM" && c.category !== "WILD");
  return drawNext(deck, state.shownCardIds);
}

// Apply the current card as "done" — add heat, draw a new card, keep same player.
// Fuse persists; only push counter resets.
// Only action cards (non-BOOM, non-WILD, non-null) are counted toward tier progress.
export function applyDoIt(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  // Guard: only real action cards count. BOOM/WILD cards should never reach applyDoIt,
  // but if they do (e.g. via a stale state), don't inflate the completion counter.
  const isAction = !!(card && card.category !== "BOOM" && card.category !== "WILD");
  const completed = isAction ? [...state.completedCards, card!.id] : state.completedCards;
  const newHeat = state.heat + HEAT_GAINS.doIt;
  // Use the authoritative ID-based count as the source of truth for tier gating.
  // completedInCurrentTier is kept in sync for the heat-meter UI.
  const newCompletedInTier = isAction
    ? countTierActions(completed, state.currentTier)
    : state.completedInCurrentTier;

  // Tier unlock fires before drawing the next card.
  // Both conditions must be met: heat threshold AND minimum action cards in current tier.
  if (state.currentTier < 4) {
    const nextTier = (state.currentTier + 1) as 2 | 3 | 4;
    const heatMet = newHeat >= TIER_UNLOCK_HEAT[nextTier];
    const cardsMet = newCompletedInTier >= TIER_MIN_CARDS[nextTier];
    console.log(
      `[TierUnlock] tier=${state.currentTier}→${nextTier} heat=${newHeat.toFixed(1)}/${TIER_UNLOCK_HEAT[nextTier]} cards=${newCompletedInTier}/${TIER_MIN_CARDS[nextTier]} heatMet=${heatMet} cardsMet=${cardsMet}`,
    );
    if (heatMet && cardsMet) {
      return applyTierUnlock({
        ...state,
        completedCards: completed,
        completedInCurrentTier: newCompletedInTier,
        heat: newHeat,
        pushCount: 0,
        currentCardId: null,
      });
    }
  }

  // Thread the updated counter into drawCard so the WILD gate uses the fresh value.
  const { card: nextCard, nextShownIds } = drawCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    shownCardIds: state.shownCardIds,
  });

  return resolveDrawnCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    pushCount: 0,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    screen: "game",
  }, nextCard);
}

// PUSH. Fuse decrements (decorative), push counter increments.
// Probabilistic BOOM: 20% on push 1, 45% on push 2, 100% on push 3+.
export function applyPush(state: GameState): GameState {
  const nextPushCount = state.pushCount + 1;
  const nextFuse = Math.max(0, state.remainingFuse - 1);
  const probIdx = Math.min(nextPushCount - 1, BOOM_PROBABILITIES.length - 1);
  const boomProb = BOOM_PROBABILITIES[probIdx];

  if (Math.random() < boomProb) {
    return transitionToBoom({
      ...state,
      pushCount: nextPushCount,
      remainingFuse: nextFuse,
      heat: state.heat + HEAT_GAINS.boom,
    });
  }

  // Survived — draw next card. If THAT card is a BOOM type, resolveDrawnCard routes to boom.
  const { card: nextCard, nextShownIds } = drawCard({
    ...state,
    pushCount: nextPushCount,
    remainingFuse: nextFuse,
  });

  return resolveDrawnCard({
    ...state,
    pushCount: nextPushCount,
    remainingFuse: nextFuse,
    heat: state.heat + HEAT_GAINS.push,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    screen: "game",
  }, nextCard);
}

// BAIL: safe skip — draws a new card without any BOOM risk. Costs one bail.
export function applyBail(state: GameState): GameState {
  if (state.bailsRemaining <= 0) return state;
  const { card: nextCard, nextShownIds } = drawCard(state);
  return resolveDrawnCard({
    ...state,
    bailsRemaining: state.bailsRemaining - 1,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    offerUsedOnCurrentCard: false,
  }, nextCard);
}

// OFFER → show the partner the card.
// Blocked if offer was already used on this card (after a reject).
export function applyOffer(state: GameState): GameState {
  if (state.offerUsedOnCurrentCard) return state;
  return { ...state, offerUsedOnCurrentCard: true, screen: "offer", previousScreen: "game" };
}

// Partner ACEPTA: partner executes the card (counts as completed).
// Active player does NOT change — OFFER is a delegation, not a control transfer.
// Fresh fuse and push counter. Draw next card under the same active player.
// Same isAction guard and countTierActions logic as applyDoIt.
export function applyOfferAccept(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const isAction = !!(card && card.category !== "BOOM" && card.category !== "WILD");
  const completed = isAction ? [...state.completedCards, card!.id] : state.completedCards;
  const newHeat = state.heat + HEAT_GAINS.offerAccepted;
  const newCompletedInTier = isAction
    ? countTierActions(completed, state.currentTier)
    : state.completedInCurrentTier;
  const fuseLength = randomFuseLength();

  // Check tier unlock on offer-accepted heat gain too.
  // Both conditions must be met: heat threshold AND minimum action cards in current tier.
  if (state.currentTier < 4) {
    const nextTier = (state.currentTier + 1) as 2 | 3 | 4;
    const heatMet = newHeat >= TIER_UNLOCK_HEAT[nextTier];
    const cardsMet = newCompletedInTier >= TIER_MIN_CARDS[nextTier];
    console.log(
      `[TierUnlock/Offer] tier=${state.currentTier}→${nextTier} heat=${newHeat.toFixed(1)}/${TIER_UNLOCK_HEAT[nextTier]} cards=${newCompletedInTier}/${TIER_MIN_CARDS[nextTier]} heatMet=${heatMet} cardsMet=${cardsMet}`,
    );
    if (heatMet && cardsMet) {
      return applyTierUnlock({
        ...state,
        completedCards: completed,
        completedInCurrentTier: newCompletedInTier,
        heat: newHeat,
        pushCount: 0,
        fuseLength,
        remainingFuse: fuseLength,
        offerUsedOnCurrentCard: false,
        currentCardId: null,
      });
    }
  }

  // Thread the updated counter into drawCard so the WILD gate uses the fresh value.
  const { card: nextCard, nextShownIds } = drawCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    shownCardIds: state.shownCardIds,
  });

  return resolveDrawnCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    pushCount: 0,
    fuseLength,
    remainingFuse: fuseLength,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    offerUsedOnCurrentCard: false,
    screen: "game",
  }, nextCard);
}

// RECHAZA: consequences depend on who the card was addressed to.
// TÚ cards: the active player tried to dodge their own card via OFFER → counts as PUSH.
// PAREJA / MUTUO cards: negotiation fell through, no consequence, return to same card.
export function applyOfferReject(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  if (card?.quien === "TÚ") {
    // Dodging → PUSH consequence: push counter increments, BOOM probability evaluated.
    return applyPush({ ...state, screen: "game", previousScreen: null });
  }
  return { ...state, screen: "game", previousScreen: null };
}

// Manual session end — player explicitly chooses to finish in T4.
// Equivalent to drawing the WILD card; jumps straight to game-over.
export function applyManualEnd(state: GameState): GameState {
  return endSession(state);
}

// Show BOOM screen. Actual state update (swap, fuse reset) happens on BOOM_ACK.
function transitionToBoom(state: GameState): GameState {
  return { ...state, screen: "boom" };
}

// Called from the BOOM screen "Continuar".
export function applyBoomAck(state: GameState): GameState {
  const swapped = swapPlayer(state);
  const fuseLength = randomFuseLength();

  // Draw an ACTION card — never a BOOM — to prevent consecutive BOOMs.
  // With high BOOM density (T4: 53%) the deck can otherwise open on BOOM-after-BOOM.
  const { card: nextCard, nextShownIds } = drawActionCard({
    ...swapped,
    shownCardIds: state.shownCardIds,
  });

  return resolveDrawnCard({
    ...swapped,
    pushCount: 0,
    fuseLength,
    remainingFuse: fuseLength,
    // heat already includes HEAT_GAINS.boom from applyPush → transitionToBoom; do not re-add.
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    screen: "game",
  }, nextCard);
}

// User dismisses the tier-unlock screen — bump the tier, reset fuse, draw first card.
export function applyTierUnlock(state: GameState): GameState {
  const nextTier = Math.min(4, state.currentTier + 1) as Tier;
  const fuseLength = randomFuseLength();
  const next: GameState = {
    ...state,
    currentTier: nextTier,
    completedInCurrentTier: 0,
    fuseLength,
    remainingFuse: fuseLength,
    pushCount: 0,
    shownCardIds: [],
    screen: "tier-unlock",
  };
  return next;
}

// Called when the player acknowledges the tier-unlock screen and wants to continue.
export function applyTierUnlockAck(state: GameState): GameState {
  const { card: nextCard, nextShownIds } = drawCard(state);
  return resolveDrawnCard({
    ...state,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    screen: "game",
  }, nextCard);
}

// WILD screen "Terminar" — v4 has a single WILD (T4-15 VICTORIA), always ends session.
export function applyWildAck(state: GameState): GameState {
  return endSession(state);
}

function swapPlayer(state: GameState): GameState {
  return { ...state, activePlayer: state.activePlayer === 1 ? 2 : 1 };
}

// Append session to history, mark not in progress, jump to game-over screen.
function endSession(state: GameState): GameState {
  const entry = {
    date: new Date().toISOString(),
    tiersReached: state.currentTier,
    cardsCompleted: state.completedCards.length,
  };
  const history = [entry, ...state.sessionHistory].slice(0, MAX_SESSION_HISTORY);
  return {
    ...state,
    inProgress: false,
    sessionHistory: history,
    screen: "game-over",
  };
}

// After any draw, decide which screen to land on based on the drawn card category.
// Per spec: the game NEVER ends automatically from card exhaustion — only the WILD
// card ends a session. On deck exhaustion, reshuffle and keep going.
function resolveDrawnCard(state: GameState, card: Card | null): GameState {
  if (!card) {
    // Deck exhausted — clear shownCardIds and retry once with a fresh draw.
    const { card: reshuffled, nextShownIds } = drawCard({ ...state, shownCardIds: [] });
    if (!reshuffled) {
      // Truly no cards pass the current filter (all disabled/too restrictive).
      // Stay on game screen; player can open settings to re-enable cards.
      // Reset offerUsedOnCurrentCard so OFFER button isn't stuck blocked.
      return { ...state, screen: "game", currentCardId: null, offerUsedOnCurrentCard: false };
    }
    return resolveDrawnCard(
      { ...state, shownCardIds: nextShownIds, currentCardId: reshuffled.id },
      reshuffled,
    );
  }
  const fresh = { ...state, offerUsedOnCurrentCard: false };
  if (card.category === "BOOM") {
    return { ...fresh, screen: "boom" };
  }
  if (card.category === "WILD") {
    return { ...fresh, screen: "wild" };
  }
  return fresh;
}

// Game-start: pick fuse length, build deck, draw the first card.
export function startNewSession(state: GameState): GameState {
  const fuseLength = randomFuseLength();
  const fresh: GameState = {
    ...state,
    inProgress: true,
    currentTier: state.startingTier,
    activePlayer: 1,
    completedCards: [],
    completedInCurrentTier: 0,
    heat: 0,
    bailsRemaining: state.bailsTotal,
    fuseLength,
    remainingFuse: fuseLength,
    pushCount: 0,
    shownCardIds: [],
    previousScreen: null,
    offerUsedOnCurrentCard: false,
    screen: "game",
  };
  const { card, nextShownIds } = drawCard(fresh);
  return resolveDrawnCard(
    { ...fresh, currentCardId: card?.id ?? null, shownCardIds: nextShownIds },
    card,
  );
}
