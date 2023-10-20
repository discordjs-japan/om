import { AsyncResource } from "node:async_hooks";
import { EventEmitter } from "node:events";
import { Worker } from "node:worker_threads";

const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");

type Callback<R> = (err: Error | null, result: R | null) => void;

class WorkerPoolTaskInfo<R> extends AsyncResource {
  constructor(private callback: Callback<R>) {
    super("WorkerPoolTaskInfo");
  }

  done(err: Error, result: null): void;
  done(err: null, result: R): void;
  done(err: Error | null, result: R | null) {
    this.runInAsyncScope(this.callback, null, err, result);
    this.emitDestroy();
  }
}

export default class WorkerPool<T, R> extends EventEmitter {
  workers: Worker[];
  freeWorkers: Worker[];
  workerInfo = new Map<number, WorkerPoolTaskInfo<R>>();
  tasks: { task: T; callback: Callback<R> }[];

  constructor(
    private workerPath: URL,
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
        const { task, callback } = nextTask;
        this.runTask(task, callback);
      }
    });
  }

  protected addNewWorker() {
    const worker = new Worker(this.workerPath);
    this.prepareWorker(worker);
    worker.on("message", (result: R) => {
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      const info = this.workerInfo.get(worker.threadId);
      if (!info) return;

      info.done(null, result);
      this.workerInfo.delete(worker.threadId);

      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
    });
    worker.on("error", (err) => {
      // In case of an uncaught exception: Call the callback that was passed to
      // `runTask` with the error.
      const info = this.workerInfo.get(worker.threadId);
      if (info) info.done(err, null);
      else this.emit("error", err);
      // Remove the worker from the list and start a new Worker to replace the
      // current one.
      this.workers.splice(this.workers.indexOf(worker), 1);
      this.addNewWorker();
    });
    this.workers.push(worker);
    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected prepareWorker(worker: Worker) {}

  protected runTask(task: T, callback: Callback<R>) {
    const worker = this.freeWorkers.pop();
    if (!worker) {
      // No free threads, wait until a worker thread becomes free.
      this.tasks.push({ task, callback });
      return;
    }

    const info = new WorkerPoolTaskInfo(callback);
    this.workerInfo.set(worker.threadId, info);
    worker.postMessage(task);
  }

  public async close() {
    for (const worker of this.workers) await worker.terminate();
  }
}
