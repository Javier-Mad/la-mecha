"use client";

import { useEffect, useRef, useState } from "react";

interface CircularTimerProps {
  duration: number; // seconds
  onComplete: () => void;
  onSkip?: () => void;
}

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 238.76

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // AudioContext not available (e.g. SSR, restricted env) — silent skip.
  }
}

export function CircularTimer({ duration, onComplete, onSkip }: CircularTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const completedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        playChime();
        navigator.vibrate?.([200, 100, 200]);
        onComplete();
      }
      return;
    }
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining, onComplete]);

  const progress = remaining / duration; // 1 → 0
  const dashOffset = CIRCUMFERENCE * (1 - progress); // 0 → CIRCUMFERENCE

  const handleSkip = () => {
    setRemaining(0);
    onSkip?.();
    onComplete();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          {/* Track */}
          <circle
            cx="48"
            cy="48"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="5"
          />
          {/* Progress ring */}
          <circle
            cx="48"
            cy="48"
            r={RADIUS}
            fill="none"
            stroke="url(#timerGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B1A1A" />
              <stop offset="100%" stopColor="#FF4500" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center label */}
        <span className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums text-ink">
          {remaining}
        </span>
      </div>

      {remaining > 0 && (
        <button
          onClick={handleSkip}
          className="text-[11px] uppercase tracking-widest text-ink/40 hover:text-ink/70 transition-colors"
        >
          Saltar ›
        </button>
      )}
    </div>
  );
}
