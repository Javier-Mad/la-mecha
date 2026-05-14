import { CATEGORY_BADGE_CLASSES, CATEGORY_LABEL } from "@/lib/constants";
import type { CardCategory } from "@/lib/types";

export function TypeBadge({ category }: { category: CardCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ${CATEGORY_BADGE_CLASSES[category]}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}
