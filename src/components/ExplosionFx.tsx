"use client";

import { motion } from "framer-motion";

const SHARDS = 14;

export function ExplosionFx() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <span className="boom-flash" />
      <motion.div
        initial={{ scale: 0.4, opacity: 0.95 }}
        animate={{ scale: 2.8, opacity: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="absolute h-40 w-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,200,80,0.95) 0%, rgba(255,69,0,0.7) 35%, rgba(139,26,26,0) 70%)",
        }}
      />
      {Array.from({ length: SHARDS }).map((_, i) => {
        const angle = (i / SHARDS) * Math.PI * 2;
        const distance = 180 + Math.random() * 80;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-full bg-ember-bright shadow-[0_0_10px_rgba(255,69,0,0.9)]"
          />
        );
      })}
    </div>
  );
}
