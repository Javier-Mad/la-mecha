import { TIER_NAMES } from "@/lib/constants";
import type { Tier } from "@/lib/types";

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ink/50">
      <span className="text-ember-bright">T{tier}</span>
      <span>·</span>
      <span>{TIER_NAMES[tier]}</span>
    </span>
  );
}
