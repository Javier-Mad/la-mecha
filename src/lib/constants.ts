import type { CardCategory, Tier, ToyType } from "./types";

export const STORAGE_KEY = "la-mecha-state";
export const STORAGE_VERSION = "v4";

export const TIER_NAMES: Record<Tier, string> = {
  1: "Chispa",
  2: "Calor",
  3: "Fuego",
  4: "Ignición",
};

export const TIER_DESCRIPTIONS: Record<Tier, string> = {
  1: "Warm-up. Ropa puesta. Contacto ligero. Risa y conexión.",
  2: "Calor. Ropa empieza a salir. Tacto más intencional.",
  3: "Fuego. Sin ropa. Sin filtros. Cuerpo completo.",
  4: "Ignición. Total. Sin nombres. Solo cuerpo y deseo.",
};

// Probabilistic BOOM per push (20% / 45% / 100%).
// Index 0 = push #1, index 1 = push #2, index 2 = push #3+
export const BOOM_PROBABILITIES = [0.2, 0.45, 1.0] as const;

// Heat gains per action
export const HEAT_GAINS = {
  doIt: 1.0,
  push: 0.5,
  boom: 1.0,
  offerAccepted: 1.5,
} as const;

// Heat thresholds to unlock each tier.
// BOTH this AND TIER_MIN_CARDS must be satisfied simultaneously.
export const TIER_UNLOCK_HEAT: Record<2 | 3 | 4, number> = {
  2: 8.0,
  3: 16.0,
  4: 24.0,
};

// Minimum cards completed in the current tier before the next tier unlocks.
export const TIER_MIN_CARDS: Record<2 | 3 | 4, number> = {
  2: 10,
  3: 12,
  4: 14,
};

// BOOM density per tier — used for deck weaving
export const BOOM_DENSITY: Record<Tier, number> = {
  1: 0.12,
  2: 0.2,
  3: 0.3,
  4: 0.53,
};

export const FUSE_MIN = 2;
export const FUSE_MAX = 6;

// Minimum cards completed in the current tier before the WILD card can appear.
// Prevents the session-ending WILD from drawing too early on a fresh tier.
export const MIN_WILD_GATE = 8;
export const MAX_CUSTOM_CARDS_PER_PLAYER = 5;
export const MAX_SESSION_HISTORY = 5;

// Base categories always active; optional ones are toggled in setup
export const BASE_CATEGORIES: CardCategory[] = ["TOQUE", "SENSACIÓN", "VERBAL", "MUTUO"];
export const OPTIONAL_CATEGORIES: CardCategory[] = ["TEASE", "ROUGH", "VENDADOS", "JUGUETES", "ROLES"];

export const TOY_LABELS: Record<ToyType, string> = {
  VIBRADOR_PEQUEÑO: "Vibrador pequeño",
  VIBRADOR_GRANDE: "Vibrador grande",
  SUCCIONADOR: "Succionador",
  MASTURBADOR: "Masturbador",
  ANILLO: "Anillo vibrador",
};

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  TOQUE: "Toque",
  SENSACIÓN: "Sensación",
  VERBAL: "Verbal",
  MUTUO: "Mutuo",
  TEASE: "Tease",
  ROUGH: "Rough",
  VENDADOS: "Vendados",
  JUGUETES: "Juguetes",
  ROLES: "Roles",
  BOOM: "BOOM",
  WILD: "Wild",
};

// Tailwind classes are static strings so the JIT can scan them.
export const CATEGORY_BADGE_CLASSES: Record<CardCategory, string> = {
  TOQUE: "bg-rose-500/20 text-rose-300 ring-rose-400/40",
  SENSACIÓN: "bg-purple-500/20 text-purple-300 ring-purple-400/40",
  VERBAL: "bg-blue-500/20 text-blue-300 ring-blue-400/40",
  MUTUO: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40",
  TEASE: "bg-pink-500/20 text-pink-300 ring-pink-400/40",
  ROUGH: "bg-red-800/30 text-red-300 ring-red-500/40",
  VENDADOS: "bg-slate-600/30 text-slate-200 ring-slate-400/40",
  JUGUETES: "bg-cyan-500/20 text-cyan-300 ring-cyan-400/40",
  ROLES: "bg-amber-500/20 text-amber-200 ring-amber-400/50",
  BOOM: "bg-red-600/30 text-red-200 ring-red-400/60 animate-pulse_red",
  WILD: "bg-amber-400/20 text-amber-200 ring-amber-400/50",
};

export const NAUGHTINESS_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Romántico",
  2: "Juguetón",
  3: "Atrevido",
  4: "Explícito",
  5: "Sin límites",
};
