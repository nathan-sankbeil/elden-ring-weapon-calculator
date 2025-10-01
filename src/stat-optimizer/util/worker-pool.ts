import EventEmitter from "events";
import type { Worker } from "worker_threads";

export class WorkerPool extends EventEmitter {
  public static readonly ADDED = Symbol("ADDED");
  public static readonly REMOVED = Symbol("REMOVED");
  public static readonly EMPTY = Symbol("EMPTY");

  private readonly workers = new Set<Worker>();

  add(worker: Worker) {
    this.workers.add(worker);
    this.emit(WorkerPool.ADDED);
  }

  remove(worker: Worker) {
    this.workers.delete(worker);
    this.emit(WorkerPool.REMOVED);

    if (this.workers.size === 0) {
      this.emit(WorkerPool.EMPTY);
    }
  }
}
