import { readFile } from "fs/promises";
import { allDamageTypes, AttackPowerType, type Weapon } from "../../calculator/calculator";
import { decodeRegulationData, type EncodedRegulationDataJson } from "../../regulationData";
import type { OutputMessage } from "./types";

export const getTotalDamageAttackPower = (
  attackPower: Partial<Record<AttackPowerType, number>>,
) => {
  return allDamageTypes.reduce<number>(
    (totalAttackPower, damageType) => totalAttackPower + (attackPower[damageType] ?? 0),
    0,
  );
};

export const getMaxUpgradeScaling = (weapon: Weapon) => {
  return weapon.attributeScaling[weapon.attributeScaling.length - 1];
};

export const isImprovement = (total: number, b?: OutputMessage) => {
  return b?.total === undefined || total > b.total;
};

export const getWeaponData = async (maxScalingStats = 4) => {
  const regulationVersion = JSON.parse(
    await readFile("./public/regulation-vanilla-v1.14.js", "utf-8"),
  );
  const weapons = decodeRegulationData(
    regulationVersion as unknown as EncodedRegulationDataJson,
  ).filter((weapon) => {
    const size = Object.keys(weapon.attributeScaling.at(-1) ?? {}).length;
    if (size > maxScalingStats) {
      console.log(`Skipping ${weapon.name} with ${size} scaling attributes`);
    }
    return size <= maxScalingStats;
  });

  weapons.sort((a, b) => {
    const aScales = Object.keys(a.attributeScaling.at(-1) ?? {}).length;
    const bScales = Object.keys(b.attributeScaling.at(-1) ?? {}).length;
    return aScales - bScales;
  });

  return weapons;
};
