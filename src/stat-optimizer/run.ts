import { readFile } from "fs/promises";
import { createWriteStream } from "fs";
import os from "node:os";
import { decodeRegulationData, type EncodedRegulationDataJson } from "../regulationData.ts";
import { WeaponType } from "../calculator/weaponTypes.ts";
import { Worker } from "worker_threads";
import type { Weapon } from "../calculator/weapon.ts";
import type { OutputMessage } from "./utils.ts";

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

const getWeaponData = async (maxScalingStats = 4) => {
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

const transformData = (entry: OutputMessage) => {
  return [
    Object.entries(WeaponType).find(([, id]) => id === entry.type)?.[0],
    entry.name,
    entry.affinity,
    entry.investment,
    entry.total.toFixed(0),
    entry.single.toFixed(0),
    entry.physical.toFixed(0),
    entry.magic.toFixed(0),
    entry.fire.toFixed(0),
    entry.lightning.toFixed(0),
    entry.holy.toFixed(0),
    entry.str,
    entry.dex,
    entry.int,
    entry.fai,
    entry.arc,
  ].join(",");
};

const assignWork = (worker: Worker, weapons: Weapon[]) => {
  worker.postMessage({
    weapon: weapons.pop(),
    finished: weapons.length === 0,
    points: 99 * 5,
    baseStats: {
      str: 10,
      dex: 10,
      int: 10,
      fai: 10,
      arc: 10,
    },
  });
};

(async () => {
  const pool = new Set<Worker>();
  const weapons = await getWeaponData();
  const maxPoolSize = Math.min(weapons.length, os.cpus().length);
  const filestream = createWriteStream("./stats.csv", { flags: "w" });
  filestream.write(HEADERS + "\n");

  for (let i = 0; i < maxPoolSize; i++) {
    const worker = new Worker("./src/stat-optimizer/worker.ts");

    worker.on("message", (msgs: OutputMessage[]) => {
      filestream.write(msgs.map(transformData).join("\n") + "\n");
      assignWork(worker, weapons);
    });

    worker.on("error", (err) => {
      pool.delete(worker);
      console.error("Worker error:", err);
    });

    worker.on("exit", (code) => {
      pool.delete(worker);
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });

    pool.add(worker);
    assignWork(worker, weapons);
  }

  console.time("Total processing time");
  const interval = setInterval(() => {
    if (pool.size === 0) {
      clearInterval(interval);
      filestream.end();
      console.timeEnd("Total processing time");
    }
  }, 100);
})();
