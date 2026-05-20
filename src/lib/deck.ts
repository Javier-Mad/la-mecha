import { CARD_DATABASE } from "@/data/cards";
import type { Card, CardCategory, Tier, ToyType } from "./types";

// Fisher-Yates in place.
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Minimum action cards in the pool before progressive filter relaxation kicks in.
const MIN_POOL_ACTIONS = 8;

// Core card filter. BOOMs and WILDs always pass (never gated by category/toy/naughtiness).
function filterCards(
  allCards: Card[],
  currentTier: Tier,
  disabled: Set<string>,
  activeCategories: CardCategory[],
  toySet: Set<ToyType>,
  naughtinessLevel: number,
  currentHeat: number,
): Card[] {
  return allCards.filter((c) => {
    if (!c.active || c.tier !== currentTier || disabled.has(c.id)) return false;
    if (currentHeat < c.min_heat) return false;
    // BOOMs and WILDs bypass category/toy/naughtiness filters.
    if (c.category === "BOOM" || c.category === "WILD") return true;
    if (!activeCategories.includes(c.category)) return false;
    if (c.naughtiness > naughtinessLevel) return false;
    if (c.toyRequired && !toySet.has(c.toyRequired)) return false;
    return true;
  });
}

function actionCount(pool: Card[]): number {
  return pool.filter((c) => c.category !== "BOOM" && c.category !== "WILD").length;
}

// Build the eligible card pool for the current tier. Returns a shuffled flat array —
// no BOOM weaving. BOOM-after-BOOM prevention is handled in engine.drawNextCard via
// the lastCardWasBoom flag, which is more reliable than pre-baked deck positions.
//
// Exact-tier match only: cards whose tier !== currentTier never appear.
// Progressive relaxation fires when action count < MIN_POOL_ACTIONS:
//   1. Ignore toy requirements
//   2. Naughtiness +1
//   3. Add VERBAL category
export function buildPool(
  currentTier: Tier,
  disabledIds: string[],
  customCards: Card[],
  activeCategories: CardCategory[],
  activeToys: ToyType[],
  naughtinessLevel: number,
  currentHeat: number,
): Card[] {
  const disabled = new Set(disabledIds);
  const toySet = new Set(activeToys);
  const allCards = [...CARD_DATABASE, ...customCards];

  let pool = filterCards(allCards, currentTier, disabled, activeCategories, toySet, naughtinessLevel, currentHeat);

  if (actionCount(pool) < MIN_POOL_ACTIONS) {
    const noToys = filterCards(allCards, currentTier, disabled, activeCategories, new Set<ToyType>(), naughtinessLevel, currentHeat);
    if (actionCount(noToys) > actionCount(pool)) pool = noToys;
  }

  if (actionCount(pool) < MIN_POOL_ACTIONS) {
    const relaxedN = Math.min(5, naughtinessLevel + 1) as 1 | 2 | 3 | 4 | 5;
    const looserN = filterCards(allCards, currentTier, disabled, activeCategories, new Set<ToyType>(), relaxedN, currentHeat);
    if (actionCount(looserN) > actionCount(pool)) pool = looserN;
  }

  if (actionCount(pool) < MIN_POOL_ACTIONS) {
    const relaxedN = Math.min(5, naughtinessLevel + 1) as 1 | 2 | 3 | 4 | 5;
    const withVerbal: CardCategory[] = [...new Set([...activeCategories, "VERBAL" as CardCategory])];
    const looserV = filterCards(allCards, currentTier, disabled, withVerbal, new Set<ToyType>(), relaxedN, currentHeat);
    if (actionCount(looserV) > actionCount(pool)) pool = looserV;
  }

  return shuffle([...pool]);
}
