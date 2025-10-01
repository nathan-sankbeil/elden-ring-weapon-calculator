import { createWriteStream } from "fs";
import os from "node:os";
import { Worker } from "worker_threads";

import {
  AttackPowerType,
  type Attributes,
  type Weapon,
  WeaponType,
} from "../calculator/calculator";
import { getWeaponData, WorkerPool, type OutputMessage } from "./util";

const HEADERS = [
  "Type",
  "Name",
  "Affinity",
  "Investment",
  "Total",
  "Single",
  "Physical",
  "Magic",
  "Fire",
  "Lightning",
  "Holy",
  "Str",
  "Dex",
  "Int",
  "Fai",
  "Arc",
].join(",");

const transformData = (entry: OutputMessage) => {
  const physical = entry.dmg.attackPower[AttackPowerType.PHYSICAL] ?? 0;
  const magic = entry.dmg.attackPower[AttackPowerType.MAGIC] ?? 0;
  const fire = entry.dmg.attackPower[AttackPowerType.FIRE] ?? 0;
  const lightning = entry.dmg.attackPower[AttackPowerType.LIGHTNING] ?? 0;
  const holy = entry.dmg.attackPower[AttackPowerType.HOLY] ?? 0;

  return [
    Object.entries(WeaponType).find(([, id]) => id === entry.type)?.[0],
    entry.name,
    entry.affinity,
    entry.investment,
    entry.total.toFixed(0),
    Math.max(physical, magic, fire, lightning, holy).toFixed(0),
    physical.toFixed(0),
    magic.toFixed(0),
    fire.toFixed(0),
    lightning.toFixed(0),
    holy.toFixed(0),
    entry.str,
    entry.dex,
    entry.int,
    entry.fai,
    entry.arc,
  ].join(",");
};

const createAssignWork =
  (config: { baseStats: Attributes; maxInvestment: number }) =>
  (worker: Worker, weapons: Weapon[]) => {
    const isFinished = weapons.length === 0;

    worker.postMessage({
      weapon: weapons.pop(),
      finished: isFinished,
      points: config.maxInvestment,
      baseStats: config.baseStats,
    });
  };

(async () => {
  const weapons = await getWeaponData(2);

  const pool = new WorkerPool();
  const maxPoolSize = Math.min(weapons.length, os.cpus().length);
  const assignWork = createAssignWork({
    baseStats: { str: 10, dex: 10, int: 10, fai: 10, arc: 10 },
    maxInvestment: 99 * 5,
  });

  const filestream = createWriteStream("./stats.csv", { flags: "w" });
  filestream.write(HEADERS + "\n");

  for (let i = 0; i < maxPoolSize; i++) {
    const worker = new Worker("./src/stat-optimizer/worker");

    worker.on("message", (msgs: OutputMessage[]) => {
      filestream.write(msgs.map(transformData).join("\n") + "\n");
      assignWork(worker, weapons);
    });

    worker.on("error", (err) => {
      pool.remove(worker);
      console.error("Worker error:", err);
    });

    worker.on("exit", (code) => {
      pool.remove(worker);
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });

    pool.add(worker);
    assignWork(worker, weapons);
  }

  console.time("Total processing time");
  pool.on(WorkerPool.EMPTY, () => {
    filestream.end();
    console.timeEnd("Total processing time");
  });
})();
