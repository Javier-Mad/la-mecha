import { CARD_DATABASE } from "@/data/cards";
import { BOOM_DENSITY } from "./constants";
import type { Card, CardCategory, Tier, ToyType } from "./types";

// Fisher-Yates in place.
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Build the active pool for the current tier. Exact match: only cards whose
// tier === currentTier are included. Lower-tier cards must NOT bleed into
// higher tiers — each tier has its own purpose-built card set.
// Filters by session config (categories, toys, naughtiness, min_heat warm-up).
// BOOMs and WILDs bypass category/naughtiness filters (they're always available).
export function buildActiveDeck(
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

  const pool: Card[] = allCards.filter((c) => {
    if (!c.active || c.tier !== currentTier || disabled.has(c.id)) return false;
    // min_heat warm-up gate: cards require a minimum heat level before appearing.
    // max_heat expiry gate intentionally removed — card heat windows were calibrated
    // for old T2 threshold (3.0); with new thresholds (T2=8.0, T3=16.0, T4=24.0),
    // all T1 cards would expire before T2 unlocks, freezing the deck.
    if (currentHeat < c.min_heat) return false;
    // BOOMs and WILDs bypass category/toy/naughtiness filters.
    if (c.category === "BOOM" || c.category === "WILD") return true;
    // Action cards: check category, naughtiness, and toy availability.
    if (!activeCategories.includes(c.category)) return false;
    if (c.naughtiness > naughtinessLevel) return false;
    if (c.toyRequired && !toySet.has(c.toyRequired)) return false;
    return true;
  });

  // Split pool into BOOMs and everything else (actions + WILDs).
  const booms: Card[] = [];
  const actions: Card[] = [];
  for (const card of pool) {
    if (card.category === "BOOM") booms.push(card);
    else actions.push(card);
  }

  shuffle(actions);
  shuffle(booms);

  // Target density: current-tier density applied to the final deck size.
  const density = BOOM_DENSITY[currentTier];
  const targetBoomCount = Math.min(
    booms.length,
    Math.round((actions.length * density) / (1 - density)),
  );

  if (targetBoomCount === 0 || actions.length === 0) {
    return [...actions, ...booms.slice(0, targetBoomCount)];
  }

  // Weave: insert BOOMs at evenly-spaced slots with jitter.
  const finalLength = actions.length + targetBoomCount;
  const spacing = finalLength / targetBoomCount;
  const woven: Card[] = [];
  let actionIdx = 0;
  let boomIdx = 0;
  // Guard: first BOOM slot must be >= 1 so the deck never opens on a BOOM.
  // At high BOOM densities (T4: 53%, spacing ≈ 1.88) the formula would compute
  // Math.floor(0.94) = 0, putting a BOOM at position 0 every time and causing
  // an inescapable BOOM loop whenever the deck reshuffles.
  let nextBoomAt = Math.max(
    1,
    Math.floor(spacing / 2) +
    Math.floor(Math.random() * Math.max(1, Math.floor(spacing / 3))),
  );

  for (let i = 0; i < finalLength; i++) {
    if (boomIdx < targetBoomCount && i >= nextBoomAt) {
      woven.push(booms[boomIdx++]);
      const jitter =
        Math.floor(Math.random() * Math.max(1, Math.floor(spacing / 3))) -
        Math.floor(spacing / 6);
      nextBoomAt = i + Math.max(1, Math.round(spacing + jitter));
    } else if (actionIdx < actions.length) {
      woven.push(actions[actionIdx++]);
    } else if (boomIdx < targetBoomCount) {
      woven.push(booms[boomIdx++]);
    }
  }

  return woven;
}

// Pull the next card. If we've burned the deck, reshuffle the unshown pool.
export function drawNext(
  deck: Card[],
  shownIds: string[],
): { card: Card | null; nextShownIds: string[] } {
  const shown = new Set(shownIds);
  const remaining = deck.filter((c) => !shown.has(c.id));

  if (remaining.length === 0) {
    if (deck.length === 0) return { card: null, nextShownIds: [] };
    // On reshuffle, avoid BOOM/WILD cards — BOOMs must only appear via push probability
    // or BOOM-weaving, never as an immediate "first card after reshuffle" draw.
    const actionPool = deck.filter((c) => c.category !== "BOOM" && c.category !== "WILD");
    const pool = actionPool.length > 0 ? actionPool : deck.filter((c) => c.category !== "BOOM");
    if (pool.length === 0) return { card: null, nextShownIds: [] };
    const card = pool[Math.floor(Math.random() * pool.length)];
    return { card, nextShownIds: [card.id] };
  }

  const card = remaining[0];
  return { card, nextShownIds: [...shownIds, card.id] };
}
