export type Tier = 1 | 2 | 3 | 4;

export type CardCategory =
  | "TOQUE"
  | "SENSACIÓN"
  | "VERBAL"
  | "MUTUO"
  | "TEASE"
  | "ROUGH"
  | "VENDADOS"
  | "JUGUETES"
  | "ROLES"
  | "BOOM"
  | "WILD";

export type ToyType =
  | "VIBRADOR_PEQUEÑO"
  | "VIBRADOR_GRANDE"
  | "SUCCIONADOR"
  | "MASTURBADOR"
  | "ANILLO";

export type Quien = "TÚ" | "PAREJA" | "MUTUO";

export interface Card {
  id: string;
  tier: Tier;
  category: CardCategory;
  naughtiness: 1 | 2 | 3 | 4 | 5;
  quien: Quien;
  action: string;
  duration: number;
  toyRequired?: ToyType;
  min_heat: number;
  max_heat: number;
  active: boolean;
  custom: boolean;
}

export type Screen =
  | "resume-prompt"
  | "setup"
  | "deck-review"
  | "custom-cards"
  | "game"
  | "offer"
  | "boom"
  | "tier-unlock"
  | "wild"
  | "game-over"
  | "settings";

export type PlayerSlot = 1 | 2;

export interface SessionHistoryEntry {
  date: string;
  tiersReached: number;
  cardsCompleted: number;
}

export interface GameState {
  // Setup-level (persisted "session prefs")
  player1Name: string;
  player2Name: string;
  startingTier: Tier;
  disabledCards: string[];
  customCards: Card[];
  sessionHistory: SessionHistoryEntry[];

  // Session config (from setup form)
  activeToys: ToyType[];
  activeCategories: CardCategory[];
  naughtinessLevel: 1 | 2 | 3 | 4 | 5;
  bailsTotal: number;
  availableTime: "15min" | "30min" | "unlimited";

  // Active session (persisted as part of "in progress")
  inProgress: boolean;
  currentTier: Tier;
  activePlayer: PlayerSlot;
  completedCards: string[];
  completedInCurrentTier: number;
  heat: number;
  bailsRemaining: number;

  // Transient (also persisted so Continuar works)
  currentCardId: string | null;
  fuseLength: number;
  remainingFuse: number;
  pushCount: number;
  offerUsedOnCurrentCard: boolean;
  // IDs excluded from the very next draw. Populated with currentCardId before each draw so
  // the current card can't be re-drawn immediately after a reshuffle. Cleared once a new
  // card is successfully selected.
  excludedFromNextDraw: string[];
  // True when the last resolved card was a BOOM. Prevents drawNextCard from picking
  // another BOOM immediately, avoiding consecutive-BOOM loops.
  lastCardWasBoom: boolean;
  // How many non-BOOM action cards have been drawn since the last BOOM event.
  // drawNextCard blocks BOOM (and WILD) until this reaches 2, guaranteeing a
  // minimum 2-card action buffer between every BOOM.
  actionCardsAfterBoom: number;

  // UI (NOT persisted — derived from state on hydrate)
  screen: Screen;
  shownCardIds: string[];
  previousScreen: Screen | null;
}
