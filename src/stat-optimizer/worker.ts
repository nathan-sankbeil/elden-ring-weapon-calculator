import { parentPort } from "worker_threads";
import getWeaponAttack from "../calculator/calculator";
import {
  affinityNameById,
  getStatRanges,
  getTotalDamageAttackPower,
  getTotalPoints,
  isImprovement,
  statCombinations,
  type InputMessage,
  type OutputMessage,
} from "./util";

parentPort?.on("message", (msg: InputMessage) => {
  if (msg.finished === true) {
    return process.exit(0);
  }

  console.time(`Worker processing ${msg.weapon.name}`);
  const optimalStats = new Map<string, OutputMessage>();
  const baseStatsTotal = getTotalPoints(msg.baseStats);
  const statRanges = getStatRanges(msg.baseStats, msg.weapon);

  for (const attributes of statCombinations(statRanges, msg.points + baseStatsTotal)) {
    const investment = getTotalPoints(attributes) - baseStatsTotal;
    const dmg = getWeaponAttack({
      weapon: msg.weapon,
      attributes,
      twoHanding: true,
      upgradeLevel: msg.weapon.attributeScaling.length - 1,
    });

    const total = getTotalDamageAttackPower(dmg.attackPower);
    const key = `${msg.weapon.name}-${investment}`;

    if (isImprovement(total, optimalStats.get(key))) {
      optimalStats.set(key, {
        key: `${msg.weapon.name}-${investment}`,
        type: msg.weapon.weaponType,
        name: msg.weapon.weaponName,
        affinity: affinityNameById.get(msg.weapon.affinityId) ?? "Unknown",
        total,
        dmg,
        investment,
        ...attributes,
      });
    }
  }
  console.timeEnd(`Worker processing ${msg.weapon.name}`);

  parentPort?.postMessage(Array.from(optimalStats.values()));
});
