"use client";

import { motion } from "framer-motion";

interface FuseProps {
  fuseLength: number;
  remainingFuse: number;
}

const START_X = 20;
const END_X = 380;
const Y = 50;
const ROPE_PATH = `M ${START_X} ${Y} L ${END_X} ${Y}`;

export function Fuse({ fuseLength, remainingFuse }: FuseProps) {
  const percent = fuseLength === 0 ? 0 : Math.max(0, remainingFuse / fuseLength);
  const flameX = START_X + (END_X - START_X) * percent;
  const isAlive = percent > 0;

  return (
    <div
      className="w-full"
      aria-label={`Mecha: ${remainingFuse} empujes restantes de ${fuseLength}`}
      role="img"
    >
      <svg viewBox="0 0 400 80" className="w-full h-20 overflow-visible">
        <defs>
          <linearGradient id="ember-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B1A1A" />
            <stop offset="60%" stopColor="#FF4500" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>
          <radialGradient id="flame-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF4500" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Burnt rope backdrop. */}
        <path
          d={ROPE_PATH}
          stroke="#2a2a2a"
          strokeWidth="6"
          strokeDasharray="3 6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Live ember rope — pathLength on <path> is reliable. */}
        <motion.path
          d={ROPE_PATH}
          stroke="url(#ember-grad)"
          strokeWidth="6"
          strokeDasharray="3 6"
          strokeLinecap="round"
          fill="none"
          initial={false}
          animate={{ pathLength: percent }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Tick marks per push unit. */}
        {Array.from({ length: fuseLength }).map((_, i) => {
          const x = START_X + ((END_X - START_X) * i) / fuseLength;
          const consumed = i >= remainingFuse;
          return (
            <line
              key={i}
              x1={x} y1={Y - 9} x2={x} y2={Y + 9}
              stroke={consumed ? "#3a3a3a" : "#FF4500"}
              strokeWidth="1.5"
              opacity={consumed ? 0.3 : 0.65}
            />
          );
        })}

        {/* Ambient glow halo that follows the flame. */}
        {isAlive && (
          <motion.ellipse
            cx={0} cy={0}
            rx="28" ry="22"
            fill="url(#flame-halo)"
            initial={false}
            animate={{ cx: flameX, cy: Y }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Flame tip — outer glow + white core. */}
        {isAlive && (
          <motion.g
            filter="url(#glow)"
            initial={false}
            animate={{ x: flameX, y: Y }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Outer flame — uses Tailwind animate-flicker for organic chaos. */}
            <motion.circle
              r={13}
              fill="#FF4500"
              animate={{
                scale: [1, 1.18, 0.92, 1.12, 0.96, 1],
                rotate: [-4, 5, -3, 6, -2, 0],
              }}
              transition={{ duration: 0.38, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Inner white-hot core. */}
            <motion.circle
              r={6}
              fill="#FFF8E7"
              animate={{ scale: [1, 0.82, 1.08, 0.9, 1] }}
              transition={{ duration: 0.28, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.g>
        )}
      </svg>
    </div>
  );
}
