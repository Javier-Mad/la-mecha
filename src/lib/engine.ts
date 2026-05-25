import {
  BOOM_PROBABILITIES,
  FUSE_MAX,
  FUSE_MIN,
  HEAT_GAINS,
  MAX_SESSION_HISTORY,
  MIN_WILD_GATE,
  TIER_MIN_CARDS,
  TIER_UNLOCK_HEAT,
  UNLIMITED_BAILS,
} from "./constants";
import { buildPool, cardRepeatKey, shuffle } from "./deck";
import { CARD_DATABASE } from "@/data/cards";
import type { Card, ClothingState, GameState, PlayerSlot, Tier } from "./types";

export function randomFuseLength(): number {
  return FUSE_MIN + Math.floor(Math.random() * (FUSE_MAX - FUSE_MIN + 1));
}

export function findCard(id: string, customCards: Card[]): Card | undefined {
  return [...CARD_DATABASE, ...customCards].find((c) => c.id === id);
}

// Advance clothing state when a T2 card with undressingTarget is completed.
// clothed → semi → naked (monotonic, never reverses).
function updateClothingState(
  clothingState: ClothingState,
  card: Card,
  activePlayer: PlayerSlot,
): ClothingState {
  if (!card.undressingTarget) return clothingState;
  const advance = (s: ClothingState["player1"]) =>
    s === "clothed" ? "semi" : s === "semi" ? "naked" : "naked";
  const next = { ...clothingState };
  const aKey = activePlayer === 1 ? "player1" : "player2";
  const pKey = activePlayer === 1 ? "player2" : "player1";
  if (card.undressingTarget === "active" || card.undressingTarget === "both") {
    next[aKey] = advance(next[aKey]);
  }
  if (card.undressingTarget === "partner" || card.undressingTarget === "both") {
    next[pKey] = advance(next[pKey]);
  }
  return next;
}

function isActionCard(card: Card): boolean {
  return card.category !== "BOOM" && card.category !== "WILD";
}

function addUnique(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id];
}

function startingHeatForTier(tier: Tier): number {
  return tier === 1 ? 0 : TIER_UNLOCK_HEAT[tier as 2 | 3 | 4];
}

function clothingForTier(tier: Tier): ClothingState {
  return tier >= 3
    ? { player1: "naked", player2: "naked" }
    : { player1: "clothed", player2: "clothed" };
}

function recycleCompletedActionsForTier(
  completedCards: string[],
  tier: Tier,
  customCards: Card[],
): string[] {
  return completedCards.filter((id) => {
    const card = findCard(id, customCards);
    if (card) return !(card.tier === tier && isActionCard(card));
    return !id.startsWith(`T${tier}-`) || id.startsWith(`T${tier}-B`);
  });
}

function clearDeferredForTier(
  deferredCards: string[],
  tier: Tier,
  customCards: Card[],
): string[] {
  return deferredCards.filter((id) => {
    const card = findCard(id, customCards);
    if (card) return card.tier !== tier;
    return !id.startsWith(`T${tier}-`);
  });
}

function deferCard(deferredCards: string[], card: Card | null): string[] {
  if (!card || !isActionCard(card)) return deferredCards;
  return addUnique(deferredCards, card.id);
}

function removeDeferredCard(deferredCards: string[], card: Card | null): string[] {
  if (!card) return deferredCards;
  return deferredCards.filter((id) => id !== card.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE DRAW FUNCTION. No other function draws cards. All draw logic lives here.
//
// Rules applied in order:
//   1. Build the strict active deck for the current tier.
//   2. Apply completedCards, excludedFromNextDraw, and last-3 shown filters.
//   3. Pool exhausted → recycle completed action cards for this tier only.
//      Keep excluded so the current card can't be re-drawn immediately.
//   4. Buffer: while actionCardsAfterBoom < 2, force action cards only
//      (no BOOM, no WILD). Guarantees ≥ 2 action cards between every BOOM.
//   5. WILD gated behind MIN_WILD_GATE T4 completions and not inside buffer.
//   6. If heat outruns tier progress and strict max_heat leaves no cards,
//      relax max_heat as a last resort so the game never lands on a blank card.
//   7. PUSH can prefer higher-naughtiness cards after the BOOM roll is survived.
//   8. Random pick from remaining candidates.
// ─────────────────────────────────────────────────────────────────────────────
interface DrawOptions {
  blockBoom?: boolean;
  minimumNaughtiness?: number;
}

function preferNaughtierCards(candidates: Card[], minimumNaughtiness?: number): Card[] {
  if (!minimumNaughtiness) return candidates;

  const target = Math.max(1, Math.min(5, Math.floor(minimumNaughtiness)));
  for (let floor = target; floor >= 1; floor--) {
    const preferred = candidates.filter((card) => card.naughtiness >= floor);
    if (preferred.length > 0) return preferred;
  }

  return candidates;
}

function drawNextCard(
  state: GameState,
  options: DrawOptions = {},
): {
  card: Card | null;
  nextShownIds: string[];
  nextCompletedCards: string[];
  nextSeenCardKeys: string[];
  nextDeferredCards: string[];
  nextExcludedFromNextDraw: string[];
} {
  const inBoomBuffer = state.actionCardsAfterBoom < 2;
  const allowWild =
    state.currentTier === 4 &&
    state.completedInCurrentTier >= MIN_WILD_GATE &&
    !state.lastCardWasBoom &&
    !inBoomBuffer;

  const makePool = (
    completedCards: string[],
    seenCardKeys: string[],
    deferredCards: string[],
    lastShownCards: string[],
    ignoreMaxHeat = false,
  ) =>
    buildPool(
      state.currentTier,
      state.disabledCards,
      state.customCards,
      state.activeCategories,
      state.activeToys,
      state.naughtinessLevel,
      state.heat,
      state.clothingState,
      state.activePlayer,
      [...completedCards, ...deferredCards],
      seenCardKeys,
      state.excludedFromNextDraw,
      lastShownCards,
      allowWild,
      ignoreMaxHeat,
    );

  let completedCards = state.completedCards;
  let seenCardKeys = state.seenCardKeys ?? [];
  let deferredCards = state.deferredCards ?? [];
  let lastShownCards = state.shownCardIds.slice(-3);
  let ignoreMaxHeat = false;
  let candidates = makePool(completedCards, seenCardKeys, deferredCards, lastShownCards);

  if (candidates.length === 0) {
    completedCards = recycleCompletedActionsForTier(completedCards, state.currentTier, state.customCards);
    candidates = makePool(completedCards, seenCardKeys, deferredCards, lastShownCards);
  }

  if (candidates.length === 0 && lastShownCards.length > 0) {
    lastShownCards = [];
    candidates = makePool(completedCards, seenCardKeys, deferredCards, lastShownCards);
  }

  if (candidates.length === 0 && deferredCards.length > 0) {
    deferredCards = clearDeferredForTier(deferredCards, state.currentTier, state.customCards);
    candidates = makePool(completedCards, seenCardKeys, deferredCards, lastShownCards);
  }

  if (candidates.length === 0 && seenCardKeys.length > 0) {
    seenCardKeys = [];
    candidates = makePool(completedCards, seenCardKeys, deferredCards, lastShownCards);
  }

  if (candidates.length === 0) {
    ignoreMaxHeat = true;
    completedCards = recycleCompletedActionsForTier(completedCards, state.currentTier, state.customCards);
    lastShownCards = [];
    candidates = makePool(completedCards, seenCardKeys, deferredCards, lastShownCards, ignoreMaxHeat);
  }

  const forceActionOnly = inBoomBuffer || candidates.every((card) => !isActionCard(card));
  if (forceActionOnly || options.blockBoom) {
    const constrainCandidates = (cards: Card[]) =>
      forceActionOnly
        ? cards.filter(isActionCard)
        : cards.filter((card) => card.category !== "BOOM");

    let constrainedCandidates = constrainCandidates(candidates);
    if (constrainedCandidates.length === 0) {
      completedCards = recycleCompletedActionsForTier(completedCards, state.currentTier, state.customCards);
      constrainedCandidates = constrainCandidates(makePool(completedCards, seenCardKeys, deferredCards, lastShownCards, ignoreMaxHeat));
    }
    if (constrainedCandidates.length === 0 && deferredCards.length > 0) {
      deferredCards = clearDeferredForTier(deferredCards, state.currentTier, state.customCards);
      constrainedCandidates = constrainCandidates(makePool(completedCards, seenCardKeys, deferredCards, lastShownCards, ignoreMaxHeat));
    }
    if (constrainedCandidates.length === 0 && seenCardKeys.length > 0) {
      seenCardKeys = [];
      constrainedCandidates = constrainCandidates(makePool(completedCards, seenCardKeys, deferredCards, lastShownCards, ignoreMaxHeat));
    }
    if (constrainedCandidates.length === 0 && !ignoreMaxHeat) {
      ignoreMaxHeat = true;
      completedCards = recycleCompletedActionsForTier(completedCards, state.currentTier, state.customCards);
      lastShownCards = [];
      constrainedCandidates = constrainCandidates(makePool(completedCards, seenCardKeys, deferredCards, lastShownCards, ignoreMaxHeat));
    }
    candidates = constrainedCandidates;
  }

  candidates = preferNaughtierCards(candidates, options.minimumNaughtiness);

  if (candidates.length === 0) {
    return {
      card: null,
      nextShownIds: state.shownCardIds,
      nextCompletedCards: completedCards,
      nextSeenCardKeys: seenCardKeys,
      nextDeferredCards: deferredCards,
      nextExcludedFromNextDraw: state.excludedFromNextDraw,
    };
  }

  shuffle(candidates);
  const card = candidates[0];
  const nextSeenCardKeys = isActionCard(card)
    ? addUnique(seenCardKeys, cardRepeatKey(card))
    : seenCardKeys;

  return {
    card,
    nextShownIds: [...lastShownCards.slice(-2), card.id],
    nextCompletedCards: completedCards,
    nextSeenCardKeys,
    nextDeferredCards: deferredCards,
    nextExcludedFromNextDraw: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION HANDLERS
// Pattern: exclude currentCardId → draw → clear excluded, update lastCardWasBoom
// and actionCardsAfterBoom. BOOM resets actionCardsAfterBoom to 0. Action cards
// increment it (capped at 2). WILD/null leave it unchanged.
// ─────────────────────────────────────────────────────────────────────────────

function nextActionCount(prev: number, drawnCard: Card | null): number {
  if (!drawnCard) return prev; // no card drawn (empty deck) — preserve current buffer state
  if (drawnCard.category === "BOOM") return 0; // BOOM resets the buffer
  if (drawnCard.category === "WILD") return prev; // WILD doesn't count toward buffer
  return Math.min(2, prev + 1);
}

// Apply the current card as "done" — add heat, draw a new card, keep same player.
// Only action cards (non-BOOM, non-WILD, non-null) count toward tier progress.
export function applyDoIt(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const isAction = !!(card && card.category !== "BOOM" && card.category !== "WILD");
  const completed = isAction ? [...state.completedCards, card!.id] : state.completedCards;
  const newHeat = state.heat + HEAT_GAINS.doIt;
  const newClothingState = isAction && card
    ? updateClothingState(state.clothingState, card, state.activePlayer)
    : state.clothingState;
  const newCompletedInTier = isAction
    ? state.completedInCurrentTier + 1
    : state.completedInCurrentTier;

  if (state.currentTier < 4) {
    const nextTier = (state.currentTier + 1) as 2 | 3 | 4;
    const heatMet = newHeat >= TIER_UNLOCK_HEAT[nextTier];
    const cardsMet = newCompletedInTier >= TIER_MIN_CARDS[nextTier];
    if (heatMet && cardsMet) {
      return applyTierUnlock({
        ...state,
        completedCards: completed,
        seenCardKeys: state.seenCardKeys ?? [],
        deferredCards: [],
        completedInCurrentTier: newCompletedInTier,
        heat: newHeat,
        clothingState: newClothingState,
        pushCount: 0,
        currentCardId: null,
        excludedFromNextDraw: [],
      });
    }
  }

  const fuseLength = randomFuseLength();
  const excludedFromNextDraw = card ? [card.id] : [];
  const deferredCards = removeDeferredCard(state.deferredCards, card ?? null);
  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard({
    ...state,
    completedCards: completed,
    deferredCards,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    clothingState: newClothingState,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    clothingState: newClothingState,
    // Completing a card resets the push streak and fuse — fresh start for the next card.
    pushCount: 0,
    fuseLength,
    remainingFuse: fuseLength,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: nextCard?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, nextCard ?? null),
    screen: "game",
  }, nextCard);
}

// PUSH. Fuse decrements (decorative), push counter increments.
// Probabilistic BOOM: 20% on push 1, 45% on push 2, 100% on push 3+.
export function applyPush(state: GameState): GameState {
  const nextPushCount = state.pushCount + 1;
  const nextFuse = Math.max(0, state.remainingFuse - 1);
  const newHeat = state.heat + HEAT_GAINS.push;
  const currentCard = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const excludedFromNextDraw = currentCard ? [currentCard.id] : [];
  const deferredCards = deferCard(state.deferredCards, currentCard ?? null);
  const minimumNaughtiness = currentCard
    ? Math.min(5, currentCard.naughtiness + nextPushCount)
    : undefined;
  const probIdx = Math.min(nextPushCount - 1, BOOM_PROBABILITIES.length - 1);
  const boomProb = BOOM_PROBABILITIES[probIdx];

  if (Math.random() < boomProb) {
    return transitionToBoom({
      ...state,
      remainingFuse: nextFuse,
      heat: newHeat + HEAT_GAINS.boom,
      deferredCards,
      excludedFromNextDraw,
    }, excludedFromNextDraw);
  }

  // Survived — exclude current card, draw next.
  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard({
    ...state,
    deferredCards,
    pushCount: nextPushCount,
    remainingFuse: nextFuse,
    heat: newHeat,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  }, { blockBoom: true, minimumNaughtiness });

  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    pushCount: nextPushCount,
    remainingFuse: nextFuse,
    heat: newHeat,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: nextCard?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, nextCard ?? null),
    screen: "game",
  }, nextCard);
}

// BAIL: safe skip — draws a new card without any BOOM risk. Costs one bail.
export function applyBail(state: GameState): GameState {
  const hasUnlimitedBails = state.bailsRemaining === UNLIMITED_BAILS;
  if (!hasUnlimitedBails && state.bailsRemaining <= 0) return state;
  const currentCard = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  const excludedFromNextDraw = currentCard ? [currentCard.id] : [];
  const deferredCards = deferCard(state.deferredCards, currentCard ?? null);

  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard({
    ...state,
    deferredCards,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  }, { blockBoom: true });

  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    bailsRemaining: hasUnlimitedBails ? UNLIMITED_BAILS : state.bailsRemaining - 1,
    // BAIL is a safe skip — reset push streak so the next card starts with fresh risk.
    pushCount: 0,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: nextCard?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, nextCard ?? null),
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
  const executingPlayer = state.activePlayer === 1 ? 2 : 1;
  const newClothingState = isAction && card
    ? updateClothingState(state.clothingState, card, executingPlayer)
    : state.clothingState;
  const newCompletedInTier = isAction
    ? state.completedInCurrentTier + 1
    : state.completedInCurrentTier;
  const fuseLength = randomFuseLength();

  if (state.currentTier < 4) {
    const nextTier = (state.currentTier + 1) as 2 | 3 | 4;
    const heatMet = newHeat >= TIER_UNLOCK_HEAT[nextTier];
    const cardsMet = newCompletedInTier >= TIER_MIN_CARDS[nextTier];
    if (heatMet && cardsMet) {
      return applyTierUnlock({
        ...state,
        completedCards: completed,
        seenCardKeys: state.seenCardKeys ?? [],
        deferredCards: [],
        completedInCurrentTier: newCompletedInTier,
        heat: newHeat,
        clothingState: newClothingState,
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
  const deferredCards = removeDeferredCard(state.deferredCards, card ?? null);
  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard({
    ...state,
    completedCards: completed,
    deferredCards,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    clothingState: newClothingState,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    completedInCurrentTier: newCompletedInTier,
    heat: newHeat,
    clothingState: newClothingState,
    // Partner executing the card means a clean handoff — reset push streak and fuse.
    pushCount: 0,
    fuseLength,
    remainingFuse: fuseLength,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: nextCard?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, nextCard ?? null),
    offerUsedOnCurrentCard: false,
    screen: "game",
  }, nextCard);
}

// RECHAZA: consequences depend on who the card was addressed to.
// TÚ cards: the active player tried to dodge their own card via OFFER → counts as PUSH.
// PAREJA / MUTUO cards: negotiation fell through, no heat/BOOM consequence;
// defer that card and draw another so OFFER never stalls the session.
export function applyOfferReject(state: GameState): GameState {
  const card = state.currentCardId ? findCard(state.currentCardId, state.customCards) : null;
  if (card?.quien === "TÚ") {
    return applyPush({ ...state, screen: "game", previousScreen: null });
  }

  const excludedFromNextDraw = card ? [card.id] : [];
  const deferredCards = deferCard(state.deferredCards, card ?? null);
  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard({
    ...state,
    deferredCards,
    lastCardWasBoom: false,
    excludedFromNextDraw,
  }, { blockBoom: true });

  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: nextCard?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, nextCard ?? null),
    offerUsedOnCurrentCard: false,
    screen: "game",
    previousScreen: null,
  }, nextCard);
}

// Manual session end — player explicitly chooses to finish in T4.
export function applyManualEnd(state: GameState): GameState {
  return endSession(state);
}

// Show BOOM screen. The BOOM state itself is resolved immediately; BOOM_ACK only
// transfers control and draws the next forced action card.
function transitionToBoom(state: GameState, excludedFromNextDraw = state.excludedFromNextDraw): GameState {
  return {
    ...state,
    currentCardId: null,
    pushCount: 0,
    excludedFromNextDraw,
    lastCardWasBoom: true,
    actionCardsAfterBoom: 0,
    offerUsedOnCurrentCard: false,
    screen: "boom",
  };
}

// Called from the BOOM screen "Continuar". Swaps player, draws an action card.
export function applyBoomAck(state: GameState): GameState {
  const swapped = swapPlayer(state);
  const fuseLength = randomFuseLength();

  // state.lastCardWasBoom is already true here (set by transitionToBoom or resolveDrawnCard).
  // drawNextCard will filter out any BOOM cards automatically.
  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard({
    ...swapped,
    shownCardIds: state.shownCardIds,
    lastCardWasBoom: true,
    excludedFromNextDraw: state.excludedFromNextDraw,
  });

  return resolveDrawnCard({
    ...swapped,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    pushCount: 0,
    fuseLength,
    remainingFuse: fuseLength,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: false,
    // actionCardsAfterBoom is already 0 (set when BOOM fired); drawNextCard enforced
    // the buffer. After this guaranteed action draw, increment it.
    actionCardsAfterBoom: nextActionCount(0, nextCard ?? null),
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
    // T2 is the undressing phase. T3/T4 assume both players are already naked.
    clothingState: nextTier === 2 ? clothingForTier(2) : clothingForTier(nextTier),
    fuseLength,
    remainingFuse: fuseLength,
    pushCount: 0,
    deferredCards: [],
    shownCardIds: [],
    excludedFromNextDraw: [],
    lastCardWasBoom: false,
    actionCardsAfterBoom: 2,
    screen: "tier-unlock",
  };
}

// Called when the player acknowledges the tier-unlock screen and wants to continue.
export function applyTierUnlockAck(state: GameState): GameState {
  const {
    card: nextCard,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard(state);
  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    currentCardId: nextCard?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: nextCard?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, nextCard ?? null),
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
    return transitionToBoom({
      ...fresh,
      completedCards: addUnique(fresh.completedCards, card.id),
      heat: fresh.heat + HEAT_GAINS.boom,
    }, [card.id]);
  }
  if (card.category === "WILD") {
    return { ...fresh, screen: "wild" };
  }
  return fresh;
}

// Defensive recovery for persisted sessions that were saved after the deck
// temporarily returned no card. Used when returning to the game screen.
export function recoverMissingCard(state: GameState): GameState {
  if (!state.inProgress || state.currentCardId || state.screen !== "game") return state;

  const {
    card,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard(state, { blockBoom: true });

  return resolveDrawnCard({
    ...state,
    completedCards: nextCompletedCards,
    seenCardKeys: nextSeenCardKeys,
    deferredCards: nextDeferredCards,
    currentCardId: card?.id ?? null,
    shownCardIds: nextShownIds,
    excludedFromNextDraw: nextExcludedFromNextDraw,
    lastCardWasBoom: card?.category === "BOOM",
    actionCardsAfterBoom: nextActionCount(state.actionCardsAfterBoom, card ?? null),
    screen: "game",
  }, card);
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
    seenCardKeys: [],
    deferredCards: [],
    completedInCurrentTier: 0,
    heat: startingHeatForTier(state.startingTier),
    bailsRemaining: state.bailsTotal,
    fuseLength,
    remainingFuse: fuseLength,
    pushCount: 0,
    clothingState: clothingForTier(state.startingTier),
    shownCardIds: [],
    excludedFromNextDraw: [],
    lastCardWasBoom: false,
    actionCardsAfterBoom: 2,
    previousScreen: null,
    offerUsedOnCurrentCard: false,
    screen: "game",
  };
  const {
    card,
    nextShownIds,
    nextCompletedCards,
    nextSeenCardKeys,
    nextDeferredCards,
    nextExcludedFromNextDraw,
  } = drawNextCard(fresh);
  return resolveDrawnCard(
    {
      ...fresh,
      completedCards: nextCompletedCards,
      seenCardKeys: nextSeenCardKeys,
      deferredCards: nextDeferredCards,
      currentCardId: card?.id ?? null,
      shownCardIds: nextShownIds,
      excludedFromNextDraw: nextExcludedFromNextDraw,
      lastCardWasBoom: card?.category === "BOOM",
      actionCardsAfterBoom: nextActionCount(2, card ?? null),
    },
    card,
  );
}
