"use client";

import { motion } from "framer-motion";
import { UNLIMITED_BAILS } from "@/lib/constants";

interface ActionButtonsProps {
  onDoIt: () => void;
  onPush: () => void;
  onOffer: () => void;
  onBail: () => void;
  bailsRemaining: number;
  doItDisabled?: boolean;
  pushDisabled?: boolean;
  offerDisabled?: boolean;
}

const baseClass =
  "min-h-[56px] w-full rounded-2xl font-display tracking-[0.15em] text-xl uppercase ring-1 transition-colors";

export function ActionButtons({
  onDoIt,
  onPush,
  onOffer,
  onBail,
  bailsRemaining,
  doItDisabled,
  pushDisabled,
  offerDisabled,
}: ActionButtonsProps) {
  const hasUnlimitedBails = bailsRemaining === UNLIMITED_BAILS;
  const showBail = hasUnlimitedBails || bailsRemaining > 0;

  return (
    <div className="grid grid-cols-1 gap-3">
      <motion.button
        whileTap={{ scale: doItDisabled ? 1 : 0.96 }}
        onClick={onDoIt}
        disabled={!!doItDisabled}
        className={`${baseClass} bg-emerald-600/90 hover:bg-emerald-500 ring-emerald-300/30 text-white disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label="Hacer la acción de la carta"
      >
        Hacerla
      </motion.button>
      <div className={`grid ${showBail ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
        <motion.button
          whileTap={{ scale: pushDisabled ? 1 : 0.96 }}
          onClick={onPush}
          disabled={pushDisabled}
          className={`${baseClass} bg-amber-600/90 hover:bg-amber-500 ring-amber-300/30 text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Empujar y robar otra carta"
        >
          Empujar
        </motion.button>
        <motion.button
          whileTap={{ scale: offerDisabled ? 1 : 0.96 }}
          onClick={onOffer}
          disabled={offerDisabled}
          className={`${baseClass} bg-blue-600/90 hover:bg-blue-500 ring-blue-300/30 text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Ofrecer la carta a tu pareja"
        >
          Ofrecer
        </motion.button>
        {showBail && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onBail}
            className={`${baseClass} bg-white/5 ring-white/10 text-ink/50 text-lg hover:bg-white/10`}
            aria-label={hasUnlimitedBails ? "Bail ilimitado" : `Bail — ${bailsRemaining} restantes`}
          >
            <span className="block text-xs leading-tight normal-case tracking-wide">Bail</span>
            <span className="block text-[10px] font-sans normal-case tracking-normal tabular-nums text-ink/40">
              {hasUnlimitedBails ? "Sin lim." : bailsRemaining}
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
