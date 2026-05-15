"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Frame } from "../Frame";
import {
  BASE_CATEGORIES,
  NAUGHTINESS_LABELS,
  OPTIONAL_CATEGORIES,
  TIER_DESCRIPTIONS,
  TIER_NAMES,
  TOY_LABELS,
} from "@/lib/constants";
import type { CardCategory, Tier, ToyType } from "@/lib/types";

interface SetupConfig {
  activeToys: ToyType[];
  activeCategories: CardCategory[];
  naughtinessLevel: 1 | 2 | 3 | 4 | 5;
  bailsTotal: number;
  availableTime: "15min" | "30min" | "unlimited";
}

interface SetupScreenProps {
  player1Name: string;
  player2Name: string;
  startingTier: Tier;
  onCommit: (p1: string, p2: string, tier: Tier, config: SetupConfig) => void;
}

const TIERS: Tier[] = [1, 2, 3, 4];
const ALL_TOYS: ToyType[] = ["VIBRADOR_PEQUEÑO", "VIBRADOR_GRANDE", "SUCCIONADOR", "MASTURBADOR", "ANILLO"];
const BAIL_OPTIONS = [0, 1, 3, 5];
const TIME_OPTIONS: { value: SetupConfig["availableTime"]; label: string }[] = [
  { value: "15min", label: "15 min" },
  { value: "30min", label: "30 min" },
  { value: "unlimited", label: "Sin límite" },
];

export function SetupScreen({ player1Name, player2Name, startingTier, onCommit }: SetupScreenProps) {
  const [p1, setP1] = useState(player1Name);
  const [p2, setP2] = useState(player2Name);
  const [tier, setTier] = useState<Tier>(startingTier);
  const [activeToys, setActiveToys] = useState<ToyType[]>([]);
  const [optionalCats, setOptionalCats] = useState<CardCategory[]>([]);
  const [naughtiness, setNaughtiness] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [bails, setBails] = useState(3);
  const [availableTime, setAvailableTime] = useState<SetupConfig["availableTime"]>("unlimited");

  const canStart = p1.trim().length > 0 && p2.trim().length > 0;

  const toggleToy = (toy: ToyType) =>
    setActiveToys((prev) =>
      prev.includes(toy) ? prev.filter((t) => t !== toy) : [...prev, toy],
    );

  const toggleOptCat = (cat: CardCategory) =>
    setOptionalCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );

  const handleCommit = () => {
    if (!canStart) return;
    onCommit(p1.trim(), p2.trim(), tier, {
      activeToys,
      activeCategories: [...BASE_CATEGORIES, ...optionalCats],
      naughtinessLevel: naughtiness,
      bailsTotal: bails,
      availableTime,
    });
  };

  return (
    <Frame>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col gap-6 pt-6 pb-8"
      >
        <header className="text-center space-y-1">
          <p className="text-[10px] uppercase tracking-[0.4em] text-ember-bright">La Mecha</p>
          <h1 className="font-display text-5xl tracking-wide">Empieza la noche</h1>
          <p className="text-sm text-ink/60">Un juego de empujar tu suerte</p>
        </header>

        {/* Names */}
        <section className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Jugador 1</span>
            <input
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              maxLength={20}
              placeholder="Tu nombre"
              className="mt-1 w-full h-12 rounded-xl bg-surface border border-white/5 px-4 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ember-bright/60"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Jugador 2</span>
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              maxLength={20}
              placeholder="Su nombre"
              className="mt-1 w-full h-12 rounded-xl bg-surface border border-white/5 px-4 text-ink placeholder:text-ink/30 focus:outline-none focus:border-ember-bright/60"
            />
          </label>
        </section>

        {/* Tier */}
        <section className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50 px-1">Nivel inicial</span>
          <div className="grid grid-cols-2 gap-2">
            {TIERS.map((t) => {
              const active = t === tier;
              return (
                <motion.button
                  key={t}
                  onClick={() => setTier(t)}
                  whileTap={{ scale: 0.97 }}
                  className={`min-h-[80px] rounded-2xl p-3 text-left ring-1 transition-colors duration-200 ${
                    active
                      ? "bg-gradient-to-br from-ember-deep/50 to-ember-bright/25 ring-ember-bright/70 shadow-[0_0_20px_rgba(255,69,0,0.12)]"
                      : "bg-surface ring-white/5 hover:ring-white/15 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl tracking-wide">{TIER_NAMES[t]}</span>
                    <span className="text-[10px] uppercase tracking-widest text-ink/40">T{t}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-ink/60">{TIER_DESCRIPTIONS[t]}</p>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Naughtiness slider */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Intensidad</span>
            <span className="text-xs text-ember-bright font-semibold">{NAUGHTINESS_LABELS[naughtiness]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={naughtiness}
            onChange={(e) => setNaughtiness(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="w-full accent-ember-bright"
          />
          <div className="flex justify-between px-0.5">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <span key={n} className={`text-[9px] tabular-nums ${n === naughtiness ? "text-ember-bright" : "text-ink/30"}`}>
                {n}
              </span>
            ))}
          </div>
        </section>

        {/* Optional categories */}
        <section className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50 px-1">Categorías opcionales</span>
          <div className="flex flex-wrap gap-2">
            {OPTIONAL_CATEGORIES.map((cat) => {
              const on = optionalCats.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleOptCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ring-1 transition-colors ${
                    on
                      ? "bg-ember-deep/40 ring-ember-bright/50 text-ember-bright"
                      : "bg-white/5 ring-white/10 text-ink/50 hover:ring-white/20"
                  }`}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </section>

        {/* Toys */}
        <section className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50 px-1">Juguetes disponibles esta noche</span>
          <div className="space-y-1.5">
            {ALL_TOYS.map((toy) => {
              const on = activeToys.includes(toy);
              return (
                <button
                  key={toy}
                  onClick={() => toggleToy(toy)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ring-1 text-left transition-colors ${
                    on
                      ? "bg-cyan-500/10 ring-cyan-400/40 text-cyan-300"
                      : "bg-white/[0.03] ring-white/5 text-ink/50 hover:ring-white/10"
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center ring-1 flex-shrink-0 ${on ? "bg-cyan-500 ring-cyan-400" : "ring-white/20"}`}>
                    {on && <CheckIcon />}
                  </span>
                  <span className="text-sm">{TOY_LABELS[toy]}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bails */}
        <section className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50 px-1">Bails disponibles</span>
          <div className="grid grid-cols-4 gap-2">
            {BAIL_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setBails(n)}
                className={`min-h-[44px] rounded-xl ring-1 text-sm font-display tracking-wider transition-colors ${
                  bails === n
                    ? "bg-ember-deep/40 ring-ember-bright/50 text-ember-bright"
                    : "bg-white/5 ring-white/10 text-ink/60 hover:ring-white/20"
                }`}
              >
                {n === 0 ? "0" : n}
              </button>
            ))}
          </div>
        </section>

        {/* Time */}
        <section className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50 px-1">Tiempo disponible</span>
          <div className="grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAvailableTime(value)}
                className={`min-h-[44px] rounded-xl ring-1 text-sm transition-colors ${
                  availableTime === value
                    ? "bg-ember-deep/40 ring-ember-bright/50 text-ember-bright font-semibold"
                    : "bg-white/5 ring-white/10 text-ink/60 hover:ring-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <motion.button
          whileTap={{ scale: canStart ? 0.97 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          disabled={!canStart}
          onClick={handleCommit}
          className="mt-auto min-h-[64px] rounded-2xl bg-gradient-to-r from-ember-deep to-ember-bright font-display text-2xl tracking-[0.2em] uppercase text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(255,69,0,0.2)]"
        >
          Encender la mecha
        </motion.button>
      </motion.div>
    </Frame>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1.5,5 4,7.5 8.5,2.5" />
    </svg>
  );
}
