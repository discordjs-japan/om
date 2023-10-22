/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
// Reference: https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool

import { EventEmitter } from "node:events";
import { Worker } from "node:worker_threads";

const isTsNode = () => {
  const tsNodeSymbol = Symbol.for("ts-node.register.instance");
  return tsNodeSymbol in process && !!process[tsNodeSymbol];
};

const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");

export default class WorkerPool<
  Task,
  Result,
  WorkerData,
  TaskProperty extends object,
> extends EventEmitter {
  private workers: Worker[];
  private freeWorkers: Worker[];
  private workerInfo = new Map<number, TaskProperty>();
  private tasks: { task: Task; prop: TaskProperty }[];

  constructor(
    protected workerPath: string | URL,
    protected workerData: WorkerData,
    numThreads: number,
  ) {
    super();
    this.workers = [];
    this.freeWorkers = [];
    this.tasks = [];

    for (let i = 0; i < numThreads; i++) this.addNewWorker();

    // Any time the kWorkerFreedEvent is emitted, dispatch
    // the next task pending in the queue, if any.
    this.on(kWorkerFreedEvent, () => {
      const nextTask = this.tasks.shift();
      if (nextTask) {
        const { task, prop } = nextTask;
        this.dispatchTask(task, prop);
      }
    });
  }

  protected addNewWorker() {
    const worker = new Worker(this.workerPath, {
      execArgv: isTsNode() ? ["--loader", "ts-node/esm"] : undefined,
      workerData: this.workerData,
    });
    worker.on("message", (result: Result) => {
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      const prop = this.workerInfo.get(worker.threadId);
      if (!prop) return;

      this.emit("data", result, prop);
      this.workerInfo.delete(worker.threadId);

      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
    });
    worker.on("error", (err) => {
      // In case of an uncaught exception: Call the callback that was passed to
      // `runTask` with the error.
      this.workerInfo.delete(worker.threadId);
      this.emit("error", err);
      // Remove the worker from the list and start a new Worker to replace the
      // current one.
      this.workers.splice(this.workers.indexOf(worker), 1);
      this.addNewWorker();
    });
    this.workers.push(worker);
    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  public dispatchTask(task: Task, prop: TaskProperty) {
    const worker = this.freeWorkers.pop();
    if (!worker) {
      // No free threads, wait until a worker thread becomes free.
      this.tasks.push({ task, prop });
      return;
    }

    this.workerInfo.set(worker.threadId, prop);
    worker.postMessage(task);
  }

  public async close() {
    for (const worker of this.workers) await worker.terminate();
  }
}

export default interface WorkerPool<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Task,
  Result,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  WorkerData,
  TaskProperty extends object,
> {
  on<K extends keyof WorkerPoolEvents<Result, TaskProperty>>(
    event: K,
    listener: (...args: WorkerPoolEvents<Result, TaskProperty>[K]) => void,
  ): this;
  once<K extends keyof WorkerPoolEvents<Result, TaskProperty>>(
    event: K,
    listener: (...args: WorkerPoolEvents<Result, TaskProperty>[K]) => void,
  ): this;
  off<K extends keyof WorkerPoolEvents<Result, TaskProperty>>(
    event: K,
    listener: (...args: WorkerPoolEvents<Result, TaskProperty>[K]) => void,
  ): this;
  emit<K extends keyof WorkerPoolEvents<Result, TaskProperty>>(
    event: K,
    ...args: WorkerPoolEvents<Result, TaskProperty>[K]
  ): boolean;
}

export interface WorkerPoolEvents<Result, TaskProperty> {
  data: [result: Result, prop: TaskProperty];
  error: [error: unknown];
  [kWorkerFreedEvent]: [];
}
