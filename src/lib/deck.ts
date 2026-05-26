import { CARD_DATABASE } from "@/data/cards";
import type { Card, CardCategory, ClothingRequirementStatus, ClothingState, ClothingStatus, PlayerSlot, Tier, ToyType } from "./types";

// Fisher-Yates in place.
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function targetStatuses(
  clothingState: ClothingState,
  activePlayer: PlayerSlot,
  target: "active" | "partner" | "both",
): ClothingStatus[] {
  const activeKey = activePlayer === 1 ? "player1" : "player2";
  const partnerKey = activePlayer === 1 ? "player2" : "player1";
  if (target === "active") return [clothingState[activeKey]];
  if (target === "partner") return [clothingState[partnerKey]];
  return [clothingState.player1, clothingState.player2];
}

function matchesClothingRequirement(
  statuses: ClothingStatus[],
  requirement: ClothingRequirementStatus,
): boolean {
  if (requirement === "has-clothing") return statuses.some((status) => status !== "naked");
  if (requirement === "underwear") return statuses.every((status) => status === "underwear");
  return statuses.every((status) => status === "naked");
}

// Clothing gate: returns false if the card can't be played given current clothing states.
// A card is unavailable when it removes clothing from someone already naked, or when
// it assumes a specific state (underwear/naked) that has not been reached yet.
export function isCardAvailableForClothing(
  card: Card,
  clothingState: ClothingState,
  activePlayer: PlayerSlot,
): boolean {
  if (card.clothingRequirement) {
    const statuses = targetStatuses(clothingState, activePlayer, card.clothingRequirement.target);
    if (!matchesClothingRequirement(statuses, card.clothingRequirement.status)) return false;
  }

  if (!card.undressingTarget) return true;

  const statuses = targetStatuses(clothingState, activePlayer, card.undressingTarget);
  if (card.undressingAmount === "final") {
    return statuses.every((status) => status === "underwear");
  }

  return statuses.some((status) => status !== "naked");
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

function normalizeActionText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b\d+\s*(segundos?|s|minutos?|min)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function cardRepeatKeys(card: Card): string[] {
  if (card.category === "BOOM" || card.category === "WILD") return [card.id];

  const text = normalizeActionText(card.action);
  const keys = new Set<string>();
  keys.add(card.repeatKey ? `manual:${card.repeatKey}` : `copy:${text}`);

  const verbs: Array<[string, string[]]> = [
    ["kiss", ["besa", "besale", "besalo", "besan", "beso"]],
    ["lick", ["lame", "lengua"]],
    ["bite", ["muerd", "mord", "nalgada", "golpe"]],
    ["massage", ["masaje", "aceite"]],
    ["touch", ["acaricia", "toca", "recorre", "traza", "explora", "palma", "dedo", "mano"]],
    ["breath", ["respira", "sopla", "aire frio", "inhala"]],
    ["verbal", ["dile", "susurra", "dicen", "dice", "pregunta"]],
    ["ice", ["hielo", "frio", "fria"]],
    ["blindfold", ["venda", "vendale", "ojos"]],
    ["undress", ["quita", "quitar", "desviste", "desnuda", "prenda", "ropa"]],
    ["restraint", ["sujeta", "muneca", "munecas", "no te muevas", "no puede moverse", "no puedes moverte"]],
    ["hair-control", ["cabello", "cabeza", "jalale", "toma su cabeza"]],
    ["oral", ["sexo oral", "usa tu boca", "da sexo oral", "boca", "69"]],
    ["hand-stimulation", ["estimula", "masturb"]],
    ["grinding", ["frotan", "friccion", "piel contra piel", "sin penetracion", "pegados"]],
    ["penetration", ["penetracion", "posicion", "misionero", "desde atras"]],
    ["toy", ["vibrador", "succionador", "masturbador", "manga", "juguete", "anillo", "usalo", "pasalo"]],
    ["roleplay", ["rol", "personaje", "disfraz", "escena", "papel", "actua", "actuar", "desconocidos"]],
    ["edging", ["borde", "terminar", "acerca demasiado", "punto de no retorno", "permiso"]],
  ];

  const zones: Array<[string, string[]]> = [
    ["face-mouth", ["cara", "mandibula", "labio", "boca", "mirada"]],
    ["neck-ear", ["cuello", "nuca", "oreja", "oido", "lobulo", "cabello"]],
    ["shoulders-back", ["hombro", "hombros", "espalda", "columna", "clavicula"]],
    ["hands-arms", ["mano", "manos", "dedos", "muneca", "munecas", "brazo"]],
    ["chest-ribs", ["pecho", "corazon", "costillas", "pezon", "pezones"]],
    ["torso-hips", ["abdomen", "vientre", "cadera", "caderas", "cintura"]],
    ["legs-butt", ["muslo", "muslos", "gluteos", "rodillas", "pies", "tobillo"]],
    ["intimate", ["centro", "zonas intimas", "ropa interior", "sexo oral", "69", "por fuera"]],
    ["whole-body", ["cuerpo", "piel"]],
    ["role-disguise", ["disfraz", "prenda", "accesorio", "camisa", "lentes"]],
    ["role-strangers", ["desconocidos", "primera vez", "presentarse"]],
    ["role-command", ["ordena", "obedec", "permiso", "manda", "instruccion"]],
    ["role-performance", ["modelo", "fotogra", "show", "demostracion", "escenario"]],
  ];

  const matchedVerbs = verbs.filter(([, terms]) => hasAny(text, terms)).map(([key]) => key);
  const matchedZones = zones.filter(([, terms]) => hasAny(text, terms)).map(([key]) => key);

  if (card.category === "JUGUETES") {
    const toy = card.toyRequired ?? "generic";
    if (matchedZones.length > 0) {
      for (const zone of matchedZones) keys.add(`toy:${toy}:${zone}`);
    } else {
      keys.add(`toy:${toy}:${card.quien}`);
    }
    return [...keys];
  }

  for (const verb of matchedVerbs) {
    for (const zone of matchedZones) keys.add(`idea:${verb}:${zone}`);
  }

  if (matchedVerbs.length > 0 && matchedZones.length === 0) {
    for (const verb of matchedVerbs) keys.add(`mode:${verb}:${card.category}`);
  }
  if (matchedVerbs.length === 0) keys.add(`category:${card.category}:${card.quien}`);
  return [...keys];
}

export function cardRepeatKey(card: Card): string {
  return cardRepeatKeys(card)[0];
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
    if (isActionCard(card) && cardRepeatKeys(card).some((key) => seenKeys.has(key))) return false;
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
