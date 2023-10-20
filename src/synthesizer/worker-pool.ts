import { AsyncResource } from "node:async_hooks";
import { EventEmitter } from "node:events";
import * as util from "node:util";
import { Worker } from "node:worker_threads";
import { AltJTalkConfig, SynthesisOption } from "node-altjtalk-binding";
import { Result, Task } from "./worker-task";

const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");

type Callback = (err: Error | null, result: Result | null) => void;

class WorkerPoolTaskInfo extends AsyncResource {
  constructor(private callback: Callback) {
    super("WorkerPoolTaskInfo");
  }

  done(err: Error, result: null): void;
  done(err: null, result: Result): void;
  done(err: Error | null, result: Result | null) {
    this.runInAsyncScope(this.callback, null, err, result);
    this.emitDestroy();
  }
}

export default class SynthesizeWorkerPool extends EventEmitter {
  workers: Worker[];
  freeWorkers: Worker[];
  workerInfo = new Map<number, WorkerPoolTaskInfo>();
  tasks: { task: Task; callback: Callback }[];

  constructor(
    private config: AltJTalkConfig,
    numThreads?: number,
  ) {
    super();
    this.workers = [];
    this.freeWorkers = [];
    this.tasks = [];

    const threads = numThreads ?? 1;

    for (let i = 0; i < threads; i++) this.addNewWorker();

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

  addNewWorker() {
    const worker = new Worker(new URL("worker-task.js", import.meta.url));
    worker.postMessage({
      type: "setup",
      config: this.config,
    } satisfies Task);

    worker.on("message", (result: Result) => {
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

  private runTask(task: Task, callback: Callback) {
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

  public async synthesize(
    inputText: string,
    option: SynthesisOption,
  ): Promise<Int16Array> {
    const result = await util.promisify(this.runTask.bind(this))({
      type: "task",
      inputText,
      option,
    });
    if (!result) throw new Error("Task returned error!");

    return result?.data;
  }

  async close() {
    for (const worker of this.workers) await worker.terminate();
  }
}
