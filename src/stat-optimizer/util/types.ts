import {
  WeaponType,
  type Attributes,
  type Weapon,
  type WeaponAttackResult,
} from "../../calculator/calculator";

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
  dmg: WeaponAttackResult;
  investment: number;
  str: number;
  dex: number;
  int: number;
  fai: number;
  arc: number;
}

const affinityMap = [
  [0, "Standard"],
  [1, "Heavy"],
  [2, "Keen"],
  [3, "Quality"],
  [8, "Magic"],
  [4, "Fire"],
  [5, "Flame Art"],
  [6, "Lightning"],
  [7, "Sacred"],
  [9, "Cold"],
  [10, "Poison"],
  [11, "Blood"],
  [12, "Occult"],
  [-1, "Unique"],
] as const;

export const affinityNameById = new Map<number, string>(affinityMap);
export const affinityIdByName = new Map<string, number>(
  affinityMap.map(([id, name]) => [name, id] as const),
);
