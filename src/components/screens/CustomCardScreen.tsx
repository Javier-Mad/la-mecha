"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Frame } from "../Frame";
import { TypeBadge } from "../TypeBadge";
import { CATEGORY_LABEL, MAX_CUSTOM_CARDS_PER_PLAYER } from "@/lib/constants";
import type { Card, CardCategory, Tier } from "@/lib/types";

interface CustomCardScreenProps {
  customCards: Card[];
  onAdd: (card: Card) => void;
  onRemove: (cardId: string) => void;
  onBack: () => void;
}

const CATEGORY_OPTIONS: CardCategory[] = ["TOQUE", "SENSACIÓN", "VERBAL", "MUTUO", "TEASE", "ROUGH", "VENDADOS"];
const TIER_OPTIONS: Tier[] = [1, 2, 3, 4];
const MAX = MAX_CUSTOM_CARDS_PER_PLAYER * 2;

export function CustomCardScreen({ customCards, onAdd, onRemove, onBack }: CustomCardScreenProps) {
  const [action, setAction] = useState("");
  const [category, setCategory] = useState<CardCategory>("TOQUE");
  const [tier, setTier] = useState<Tier>(1);
  const [duration, setDuration] = useState(15);

  const atMax = customCards.length >= MAX;
  const trimmed = action.trim();
  const canAdd = !atMax && trimmed.length >= 3;

  const submit = () => {
    if (!canAdd) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `CUSTOM-${crypto.randomUUID().slice(0, 8)}`
        : `CUSTOM-${Date.now().toString(36)}`;
    onAdd({
      id,
      tier,
      category,
      naughtiness: 2,
      quien: "TÚ",
      action: trimmed,
      duration,
      min_heat: 0,
      max_heat: 10,
      active: true,
      custom: true,
    });
    setAction("");
  };

  return (
    <Frame>
      <header className="flex items-center justify-between pt-4 pb-3">
        <button onClick={onBack} className="text-sm text-ink/70 underline-offset-2 hover:underline">
          ← Volver
        </button>
        <h2 className="font-display text-xl tracking-wide">Personalizadas</h2>
        <span className="text-xs text-ink/50 w-12 text-right">{customCards.length}/{MAX}</span>
      </header>

      <section className="rounded-2xl bg-surface border border-white/5 p-4 space-y-3 mb-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Acción</span>
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Ej: Bésale despacio detrás de la oreja"
            className="mt-1 w-full rounded-xl bg-bg border border-white/5 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-ember-bright/60"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Categoría</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CardCategory)}
              className="mt-1 w-full h-10 rounded-xl bg-bg border border-white/5 px-2 text-sm text-ink"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Nivel</span>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value) as Tier)}
              className="mt-1 w-full h-10 rounded-xl bg-bg border border-white/5 px-2 text-sm text-ink"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Duración: {duration}s</span>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full accent-ember-bright"
          />
        </label>

        <motion.button
          whileTap={{ scale: canAdd ? 0.96 : 1 }}
          onClick={submit}
          disabled={!canAdd}
          className="w-full min-h-[48px] rounded-xl bg-emerald-600/90 hover:bg-emerald-500 font-display text-lg tracking-[0.15em] uppercase text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {atMax ? "Límite alcanzado" : "Añadir carta"}
        </motion.button>
      </section>

      <div className="flex-1 overflow-y-auto pb-6 space-y-2">
        {customCards.length === 0 ? (
          <p className="text-sm text-ink/40 text-center mt-6">
            Aún no has añadido cartas personalizadas. Pueden ser tan suaves o tan intensas como quieras.
          </p>
        ) : (
          customCards.map((card) => (
            <div key={card.id} className="rounded-xl bg-surface ring-1 ring-white/5 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <TypeBadge category={card.category} />
                  <span className="text-[10px] uppercase tracking-widest text-ink/40">T{card.tier}</span>
                </div>
                <button onClick={() => onRemove(card.id)} className="text-xs text-red-400 hover:text-red-300">
                  Eliminar
                </button>
              </div>
              <p className="text-sm text-ink/90 leading-snug">{card.action}</p>
            </div>
          ))
        )}
      </div>
    </Frame>
  );
}
