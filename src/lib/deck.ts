import { CARD_DATABASE } from "@/data/cards";
import type { Card, CardCategory, ClothingState, PlayerSlot, Tier, ToyType } from "./types";

// Fisher-Yates in place.
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// T2 clothing gate: returns false if the card can't be played given current clothing states.
// A card is unavailable when it targets someone who is already 'naked' —
// there is nothing left to remove.
export function isCardAvailableForClothing(
  card: Card,
  clothingState: ClothingState,
  activePlayer: PlayerSlot,
): boolean {
  if (!card.undressingTarget) return true; // no clothing dependency
  const activeKey = activePlayer === 1 ? "player1" : "player2";
  const partnerKey = activePlayer === 1 ? "player2" : "player1";
  if (card.undressingTarget === "active") return clothingState[activeKey] !== "naked";
  if (card.undressingTarget === "partner") return clothingState[partnerKey] !== "naked";
  // "both": needs at least one player who still has clothing to remove
  return clothingState.player1 !== "naked" || clothingState.player2 !== "naked";
}

interface ActiveDeckOptions {
  tier: Tier;
  currentHeat: number;
  activePlayer: PlayerSlot;
  disabledIds: string[];
  customCards: Card[];
  activeCategories: CardCategory[];
  activeToys: ToyType[];
  naughtinessLevel: number;
  completedCards: string[];
  seenCardKeys: string[];
  excludedFromNextDraw: string[];
  lastShownCards: string[];
  clothingState: ClothingState;
  allowWild: boolean;
  ignoreMaxHeat?: boolean;
}

function isActionCard(card: Card): boolean {
  return card.category !== "BOOM" && card.category !== "WILD";
}

export function cardRepeatKey(card: Card): string {
  if (card.category === "BOOM" || card.category === "WILD") return card.id;
  if (card.repeatKey) return card.repeatKey;
  return card.action
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b\d+\s*(segundos?|s|minutos?|min)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getActiveDeck(options: ActiveDeckOptions): Card[] {
  const disabled = new Set(options.disabledIds);
  const completed = new Set(options.completedCards);
  const seenKeys = new Set(options.seenCardKeys);
  const excluded = new Set(options.excludedFromNextDraw);
  const lastShown = new Set(options.lastShownCards);
  const activeToys = new Set(options.activeToys);
  const allCards = [...CARD_DATABASE, ...options.customCards];

  return allCards.filter((card) => {
    if (card.tier !== options.tier) return false;
    if (!card.active) return false;
    if (disabled.has(card.id)) return false;
    if (card.min_heat > options.currentHeat) return false;
    if (!options.ignoreMaxHeat && card.max_heat < options.currentHeat) return false;
    if (card.category === "WILD" && !options.allowWild) return false;
    if (isActionCard(card)) {
      if (!options.activeCategories.includes(card.category)) return false;
      if (card.naughtiness > options.naughtinessLevel) return false;
    }
    if (completed.has(card.id)) return false;
    if (isActionCard(card) && seenKeys.has(cardRepeatKey(card))) return false;
    if (excluded.has(card.id)) return false;
    if (lastShown.has(card.id)) return false;
    if (card.toyRequired && !activeToys.has(card.toyRequired)) return false;
    return isCardAvailableForClothing(card, options.clothingState, options.activePlayer);
  });
}

export function buildPool(
  currentTier: Tier,
  disabledIds: string[],
  customCards: Card[],
  activeCategories: CardCategory[],
  activeToys: ToyType[],
  naughtinessLevel: number,
  currentHeat: number,
  clothingState: ClothingState,
  activePlayer: PlayerSlot,
  completedCards: string[],
  seenCardKeys: string[],
  excludedFromNextDraw: string[],
  lastShownCards: string[],
  allowWild: boolean,
  ignoreMaxHeat = false,
): Card[] {
  return shuffle(getActiveDeck({
    tier: currentTier,
    currentHeat,
    activePlayer,
    disabledIds,
    customCards,
    activeCategories,
    activeToys,
    naughtinessLevel,
    completedCards,
    seenCardKeys,
    excludedFromNextDraw,
    lastShownCards,
    clothingState,
    allowWild,
    ignoreMaxHeat,
  }));
}
