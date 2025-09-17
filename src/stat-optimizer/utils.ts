import {
  allDamageTypes,
  AttackPowerType,
  WeaponType,
  type Attributes,
  type Weapon,
  type WeaponAttackResult,
} from "../calculator/calculator.ts";

export type StatRange = Map<keyof Attributes, { min: number; max: number }>;

export type InputMessage =
  | { finished: true }
  | {
      finished: false;
      weapon: Weapon;
      points: number;
      baseStats: Attributes;
    };

export interface OutputMessage {
  key: string;
  type: WeaponType;
  name: string;
  affinity: string;
  total: number;
  single: number;
  physical: number;
  magic: number;
  fire: number;
  lightning: number;
  holy: number;
  investment: number;
  str: number;
  dex: number;
  int: number;
  fai: number;
  arc: number;
}

export const getTotalDamageAttackPower = (
  attackPower: Partial<Record<AttackPowerType, number>>,
) => {
  return allDamageTypes.reduce<number>(
    (totalAttackPower, damageType) => totalAttackPower + (attackPower[damageType] ?? 0),
    0,
  );
};

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

export const getMaxUpgradeScaling = (weapon: Weapon) => {
  return weapon.attributeScaling[weapon.attributeScaling.length - 1];
};

export const isImprovement = (total: number, b?: OutputMessage) => {
  return b?.total === undefined || total > b.total;
};

export const convert = (dmg: WeaponAttackResult) => {
  const physical = dmg.attackPower[AttackPowerType.PHYSICAL] ?? 0;
  const magic = dmg.attackPower[AttackPowerType.MAGIC] ?? 0;
  const fire = dmg.attackPower[AttackPowerType.FIRE] ?? 0;
  const lightning = dmg.attackPower[AttackPowerType.LIGHTNING] ?? 0;
  const holy = dmg.attackPower[AttackPowerType.HOLY] ?? 0;

  return {
    single: Math.max(physical, magic, fire, lightning, holy),
    physical,
    magic,
    fire,
    lightning,
    holy,
  };
};
