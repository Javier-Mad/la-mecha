"use client";

import { motion } from "framer-motion";
// Push 3 is guaranteed BOOM (100% probability), so we always show 3 slots.
const MAX_VISIBLE_PUSHES = 3;

export function PushCounter({ count }: { count: number }) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${count} de ${MAX_VISIBLE_PUSHES} empujes consecutivos`}
    >
      <span className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Empujes</span>
      <div className="flex gap-1.5">
        {Array.from({ length: MAX_VISIBLE_PUSHES }).map((_, i) => {
          const filled = i < count;
          return (
            <motion.span
              key={i}
              animate={
                filled
                  ? { scaleX: 1, opacity: 1 }
                  : { scaleX: 0.7, opacity: 0.25 }
              }
              initial={false}
              transition={
                filled
                  ? { type: "spring", stiffness: 500, damping: 28 }
                  : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
              }
              className={`block h-1.5 w-4 rounded-full origin-left ${filled ? "bg-ember-bright" : "bg-white/40"}`}
            />
          );
        })}
      </div>
    </div>
  );
}
