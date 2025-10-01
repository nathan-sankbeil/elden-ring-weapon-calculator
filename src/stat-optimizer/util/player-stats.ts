import { type Attributes, type Weapon } from "../../calculator/calculator";
import type { StatRange } from "./types";
import { getMaxUpgradeScaling } from "./weapons";

export function* statCombinations(ranges: StatRange, maxTotal: number) {
  const statKeys = [...ranges.keys()];
  const stack = [{ idx: 0, current: {} as Partial<Attributes>, sum: 0 }];

  while (stack.length) {
    const { idx, current, sum } = stack.pop()!;
    if (idx === ranges.size) {
      yield current as Attributes;
      continue;
    }

    const stat = statKeys[idx];
    const { min, max } = ranges.get(stat)!;
    for (let value = min; value <= max && sum + value <= maxTotal; value++) {
      stack.push({
        idx: idx + 1,
        current: {
          ...current,
          [stat]: value,
        },
        sum: sum + value,
      });
    }
  }
}

export const getTotalPoints = (attributes: Attributes) => {
  return Object.values(attributes).reduce((a, b) => a + b, 0);
};

export const getStatRanges = (baseStats: Attributes, weapon: Weapon): StatRange => {
  const maxUpgradeScaling = getMaxUpgradeScaling(weapon);
  const allStats = ["str", "dex", "int", "fai", "arc"] as const;
  const map: StatRange = new Map();
  for (const stat of allStats) {
    const scale = maxUpgradeScaling[stat] ?? 0;
    const requiredStat = weapon.requirements[stat] ?? 0;
    const baseStat = baseStats[stat];
    map.set(stat, {
      min: baseStat,
      max: scale > 0 ? 99 : Math.max(requiredStat, baseStat),
    });
  }
  return map;
};
