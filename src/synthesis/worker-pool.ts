/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
// Reference: https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool

import { EventEmitter } from "node:events";
import { Worker } from "node:worker_threads";

const isTsNode = () => {
  const tsNodeSymbol = Symbol.for("ts-node.register.instance");
  return tsNodeSymbol in process && !!process[tsNodeSymbol];
};

interface BaseTask {
  payload: unknown;
}

const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");
const kTaskQueuedEvent = Symbol("kTaskQueuedEvent");
const kCloseEvent = Symbol("kCloseEvent");

/**
 * requirement for worker:
 * - worker must accept a `Task["payload"]` on "message" event
 * - once worker receives a "message" event, it must perform one and only one of the following:
 *   - postMessage a `Result`
 *   - emit an "error" event
 *
 * this class ensures:
 * - always postMessage a `Task["payload"]` on "message" event
 * - always emit "data" event with `Result` and `Task`
 * - the `Result` and `Task` on "data" event are always paired
 */
// ownership contract; alive workers must be in one and only one of following states:
// - 'waiting': in `freeWorkers` with no "message" event listener
// - 'paired': passed to `dispatchTask` with no "message" event listener
// - 'working': in the "message" event listener in `dispatchTask` with exactly one "message" event listener
// - 'freed': passed to `kWorkerFreedEvent` with no "message" event listener
export default class WorkerPool<
  Task extends BaseTask,
  Result,
  WorkerData,
> extends EventEmitter {
  protected static kWorkerFreedEvent = kWorkerFreedEvent;
  protected static kTaskQueuedEvent = kTaskQueuedEvent;
  protected static kCloseEvent = kCloseEvent;

  private freeWorkers: Worker[] = [];
  private taskQueue: Task[] = [];

  constructor(
    protected workerPath: string | URL,
    protected workerData: WorkerData,
    protected numThreads: number,
  ) {
    super();
    this.prepare();
    this.listen();
  }

  protected prepare() {
    for (let i = 0; i < this.numThreads; i++) this.addWorker();
  }

  protected addWorker() {
    const worker = new Worker(this.workerPath, {
      execArgv: isTsNode() ? ["--loader", "ts-node/esm"] : undefined,
      workerData: this.workerData,
    });

    const terminate = () => {
      void worker.terminate().catch((e) => this.emit("error", e));
    };
    worker.once("error", (err) => {
      this.emit("error", err);
      // worker state: 'working' -> (terminated)
      terminate();
      this.off(kCloseEvent, terminate);
      this.addWorker();
    });
    this.once(kCloseEvent, terminate);

    // worker state: (new) -> 'freed'
    this.emit(kWorkerFreedEvent, worker);
  }

  protected listen() {
    this.on(kWorkerFreedEvent, (worker) => {
      const task = this.taskQueue.shift();
      // worker state: 'freed' -> 'paired'
      if (task) this.dispatchTask(worker, task);
      // worker state: 'freed' -> 'waiting'
      else this.freeWorkers.push(worker);
    });
    this.on(kTaskQueuedEvent, (task) => {
      const worker = this.freeWorkers.shift();
      // worker state: 'waiting' -> 'paired'
      if (worker) this.dispatchTask(worker, task);
      else this.taskQueue.push(task);
    });
  }

  private dispatchTask(worker: Worker, task: Task) {
    // worker state: 'paired' -> 'working'
    // the only "message" event listener is on(ce) this `worker`
    worker.once("message", (result: Result) => {
      // worker state: 'working' -> 'freed'
      // the only "message" event listener is now off the `worker`
      this.emit(kWorkerFreedEvent, worker);

      // this `result` and this `task` are guaranteed to be paired…
      this.emit("data", result, task);
    });

    // because the `Result` corresponding to this `task.payload` is
    // guaranteed to be caught by the only listener above and not by others
    worker.postMessage(task.payload);
  }

  public queueTask(task: Task) {
    this.emit(kTaskQueuedEvent, task);
  }

  public close() {
    this.emit(kCloseEvent);
  }
}

export default interface WorkerPool<
  Task extends BaseTask,
  Result,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  WorkerData,
> {
  on<K extends keyof WorkerPoolEvents<Task, Result>>(
    event: K,
    listener: (...args: WorkerPoolEvents<Task, Result>[K]) => void,
  ): this;
  once<K extends keyof WorkerPoolEvents<Task, Result>>(
    event: K,
    listener: (...args: WorkerPoolEvents<Task, Result>[K]) => void,
  ): this;
  off<K extends keyof WorkerPoolEvents<Task, Result>>(
    event: K,
    listener: (...args: WorkerPoolEvents<Task, Result>[K]) => void,
  ): this;
  emit<K extends keyof WorkerPoolEvents<Task, Result>>(
    event: K,
    ...args: WorkerPoolEvents<Task, Result>[K]
  ): boolean;
}

interface WorkerPoolEvents<Task, Result> {
  data: [result: Result, task: Task];
  error: [error: unknown];
  [kWorkerFreedEvent]: [worker: Worker];
  [kTaskQueuedEvent]: [task: Task];
  [kCloseEvent]: [];
}
