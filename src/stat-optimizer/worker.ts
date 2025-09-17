import { parentPort } from "worker_threads";
import getWeaponAttack from "../calculator/calculator.ts";
import {
  convert,
  statCombinations,
  getStatRanges,
  getTotalDamageAttackPower,
  getTotalPoints,
  isImprovement,
  type InputMessage,
  type OutputMessage,
} from "./utils.ts";

const affinityOptions = new Map<number, string>([
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
]);

parentPort?.on("message", (msg: InputMessage) => {
  if (msg.finished) {
    return process.exit(0);
  }

  console.time(`Worker processing ${msg.weapon.name}`);
  const optimalStats = new Map<string, OutputMessage>();
  const baseStateTotal = getTotalPoints(msg.baseStats);
  const statRanges = getStatRanges(msg.baseStats, msg.weapon);

  for (const attributes of statCombinations(statRanges, msg.points + baseStateTotal)) {
    const investment = getTotalPoints(attributes) - baseStateTotal;
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
        affinity: affinityOptions.get(msg.weapon.affinityId) ?? "Unknown",
        total,
        ...convert(dmg),
        investment,
        ...attributes,
      });
    }
  }
  console.timeEnd(`Worker processing ${msg.weapon.name}`);

  parentPort?.postMessage(Array.from(optimalStats.values()));
});
