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
import { buildPool, shuffle } from "./deck";
import { CARD_DATABASE } from "@/data/cards";
import type { Card, GameState, PlayerSlot, Tier } from "./types";

export function randomFuseLength(): number {
  return FUSE_MIN + Math.floor(Math.random() * (FUSE_MAX - FUSE_MIN + 1));
}

export function findCard(id: string, customCards: Card[]): Card | undefined {
  return [...CARD_DATABASE, ...customCards].find((c) => c.id === id);
}

// Count completed non-BOOM action cards for the given tier from the completedCards array.
// BOOM IDs use the pattern T{tier}-B{n}; action IDs use T{tier}-{n} (no B suffix).
// Authoritative unlock gate — immune to completedInCurrentTier counter drift.
function countTierActions(completedCards: string[], tier: Tier): number {
  const prefix = `T${tier}-`;
  const boomPrefix = `T${tier}-B`;
  return completedCards.filter((id) => id.startsWith(prefix) && !id.startsWith(boomPrefix)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE DRAW FUNCTION. No other function draws cards. All draw logic lives here.
//
// Rules applied in order:
//   1. Build pool for current tier (via buildPool, includes progressive relaxation).
//   2. Remove already-shown cards (shownCardIds) and the just-played card
//      (excludedFromNextDraw) from candidates.
//   3. Pool exhausted → recycle: clear shownCardIds, keep excluded so the
//      current card can't be re-drawn immediately after a reshuffle.
//   4. No BOOM right after BOOM (lastCardWasBoom flag).
//   5. WILD gated behind MIN_WILD_GATE T4 completions and not right after BOOM.
//   6. Anti-repeat: prefer cards not in the last 2 shown.
//   7. Random pick from remaining candidates.
// ─────────────────────────────────────────────────────────────────────────────
function drawNextCard(state: GameState): { card: Card | null; nextShownIds: string[] } {
  const excluded = new Set(state.excludedFromNextDraw);

  const pool = buildPool(
    state.currentTier,
    state.disabledCards,
    state.customCards,
    state.activeCategories,
    state.activeToys,
    state.naughtinessLevel,
    state.heat,
  );

  if (pool.length === 0) return { card: null, nextShownIds: [] };

  const shownSet = new Set(state.shownCardIds);

  // Remove shown + excluded from candidates.
  let candidates = pool.filter((c) => !shownSet.has(c.id) && !excluded.has(c.id));
  let baseShownIds = state.shownCardIds;

  // Deck exhausted → recycle. Keep excluded to block the current card post-reshuffle.
  if (candidates.length === 0) {
    baseShownIds = [];
    candidates = pool.filter((c) => !excluded.has(c.id));
    // Edge case: excluded is the only card in the pool.
    if (candidates.length === 0) candidates = pool;
  }

  // Special rules.
  let filtered = candidates.filter((c) => {
    if (state.lastCardWasBoom && c.category === "BOOM") return false;
    if (c.category === "WILD") {
      return state.completedInCurrentTier >= MIN_WILD_GATE && !state.lastCardWasBoom;
    }
    return true;
  });
  // Fallback: if rules eliminated everything, use unfiltered candidates.
  if (filtered.length === 0) filtered = candidates;

  // Anti-repeat: prefer cards not seen in the last 2 draws.
  const recent = new Set(baseShownIds.slice(-2));
  const preferred = filtered.filter((c) => !recent.has(c.id));
  const finalPool = preferred.length > 0 ? preferred : filtered;

  shuffle(finalPool);
  const card = finalPool[0];

  return {
    card,
    nextShownIds: baseShownIds.includes(card.id) ? baseShownIds : [...baseShownIds, card.id],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION HANDLERS
// Pattern: exclude currentCardId → draw → clear excluded, set lastCardWasBoom.
// ─────────────────────────────────────────────────────────────────────────────

// Apply the current card as "done" — add heat, draw a new card, keep same player.
// Only action cards (non-BOOM, non-WILD, non-null) count toward tier progress.
export function applyDoIt(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const isAction = !!(card && card.category !== "BOOM" && card.category !== "WILD");
  const completed = isAction ? [...state.completedCards, card!.id] : state.completedCards;
  const newHeat = state.heat + HEAT_GAINS.doIt;
  const newCompletedInTier = isAction
    ? countTierActions(completed, state.currentTier)
    : state.completedInCurrentTier;

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
        excludedFromNextDraw: [],
      });
    }
  }

  const excludedFromNextDraw = card ? [card.id] : [];
  const { card: nextCard, nextShownIds } = drawNextCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    pushCount: 0,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: [],
    lastCardWasBoom: nextCard?.category === "BOOM",
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
      lastCardWasBoom: true,
    });
  }

  // Survived — exclude current card, draw next.
  const currentCard = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const excludedFromNextDraw = currentCard ? [currentCard.id] : [];

  const { card: nextCard, nextShownIds } = drawNextCard({
    ...state,
    pushCount: nextPushCount,
    remainingFuse: nextFuse,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...state,
    pushCount: nextPushCount,
    remainingFuse: nextFuse,
    heat: state.heat + HEAT_GAINS.push,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: [],
    lastCardWasBoom: nextCard?.category === "BOOM",
    screen: "game",
  }, nextCard);
}

// BAIL: safe skip — draws a new card without any BOOM risk. Costs one bail.
export function applyBail(state: GameState): GameState {
  if (state.bailsRemaining <= 0) return state;
  const currentCard = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const excludedFromNextDraw = currentCard ? [currentCard.id] : [];

  const { card: nextCard, nextShownIds } = drawNextCard({
    ...state,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...state,
    bailsRemaining: state.bailsRemaining - 1,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: [],
    lastCardWasBoom: nextCard?.category === "BOOM",
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
export function applyOfferAccept(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const isAction = !!(card && card.category !== "BOOM" && card.category !== "WILD");
  const completed = isAction ? [...state.completedCards, card!.id] : state.completedCards;
  const newHeat = state.heat + HEAT_GAINS.offerAccepted;
  const newCompletedInTier = isAction
    ? countTierActions(completed, state.currentTier)
    : state.completedInCurrentTier;
  const fuseLength = randomFuseLength();

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
        excludedFromNextDraw: [],
      });
    }
  }

  const excludedFromNextDraw = card ? [card.id] : [];
  const { card: nextCard, nextShownIds } = drawNextCard({
    ...state,
    completedCards: completed,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    lastCardWasBoom: false,
    excludedFromNextDraw,
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
    excludedFromNextDraw: [],
    lastCardWasBoom: nextCard?.category === "BOOM",
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
    return applyPush({ ...state, screen: "game", previousScreen: null });
  }
  return { ...state, screen: "game", previousScreen: null };
}

// Manual session end — player explicitly chooses to finish in T4.
export function applyManualEnd(state: GameState): GameState {
  return endSession(state);
}

// Show BOOM screen. Actual state update (swap, fuse reset) happens on BOOM_ACK.
function transitionToBoom(state: GameState): GameState {
  return { ...state, screen: "boom" };
}

// Called from the BOOM screen "Continuar". Swaps player, draws an action card.
export function applyBoomAck(state: GameState): GameState {
  const swapped = swapPlayer(state);
  const fuseLength = randomFuseLength();
  // Exclude the BOOM card that just resolved so it can't open the next hand.
  const boomCardId = state.currentCardId;
  const excludedFromNextDraw = boomCardId ? [boomCardId] : [];

  // state.lastCardWasBoom is already true here (set by transitionToBoom or resolveDrawnCard).
  // drawNextCard will filter out any BOOM cards automatically.
  const { card: nextCard, nextShownIds } = drawNextCard({
    ...swapped,
    shownCardIds: state.shownCardIds,
    lastCardWasBoom: true,
    excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...swapped,
    pushCount: 0,
    fuseLength,
    remainingFuse: fuseLength,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: [],
    lastCardWasBoom: false,  // BOOM is resolved; next card is guaranteed action
    screen: "game",
  }, nextCard);
}

// User dismisses the tier-unlock screen — bump the tier, reset fuse, draw first card.
export function applyTierUnlock(state: GameState): GameState {
  const nextTier = Math.min(4, state.currentTier + 1) as Tier;
  const fuseLength = randomFuseLength();
  return {
    ...state,
    currentTier: nextTier,
    completedInCurrentTier: 0,
    fuseLength,
    remainingFuse: fuseLength,
    pushCount: 0,
    shownCardIds: [],
    excludedFromNextDraw: [],
    lastCardWasBoom: false,
    screen: "tier-unlock",
  };
}

// Called when the player acknowledges the tier-unlock screen and wants to continue.
export function applyTierUnlockAck(state: GameState): GameState {
  const { card: nextCard, nextShownIds } = drawNextCard(state);
  return resolveDrawnCard({
    ...state,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: [],
    lastCardWasBoom: nextCard?.category === "BOOM",
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
// drawNextCard handles its own recycling — a null result means no cards are available
// at all (all disabled / too restrictive settings). No retry needed here.
function resolveDrawnCard(state: GameState, card: Card | null): GameState {
  if (!card) {
    return { ...state, screen: "game", currentCardId: null, offerUsedOnCurrentCard: false };
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
// Active player is randomised — either player can go first.
export function startNewSession(state: GameState): GameState {
  const fuseLength = randomFuseLength();
  const activePlayer: PlayerSlot = Math.random() < 0.5 ? 1 : 2;
  const fresh: GameState = {
    ...state,
    inProgress: true,
    currentTier: state.startingTier,
    activePlayer,
    completedCards: [],
    completedInCurrentTier: 0,
    heat: 0,
    bailsRemaining: state.bailsTotal,
    fuseLength,
    remainingFuse: fuseLength,
    pushCount: 0,
    shownCardIds: [],
    excludedFromNextDraw: [],
    lastCardWasBoom: false,
    previousScreen: null,
    offerUsedOnCurrentCard: false,
    screen: "game",
  };
  const { card, nextShownIds } = drawNextCard(fresh);
  return resolveDrawnCard(
    {
      ...fresh,
      currentCardId: card?.id ?? null,
      shownCardIds: nextShownIds,
      lastCardWasBoom: card?.category === "BOOM",
    },
    card,
  );
}
