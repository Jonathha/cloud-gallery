export interface ScheduledTask {
  id: string;
  priority: number;
  sequence: number;
  loadFn: () => Promise<void>;
  resolve: () => void;
  reject: (err: any) => void;
  promise: Promise<void>;
}

class MediaScheduler {
  private maxConcurrent = 4; // Bounded limit of concurrent media loads
  private sequenceCounter = 0;
  private pendingTasks: ScheduledTask[] = [];
  private activeTasks = new Map<string, Promise<void>>();

  enqueue(id: string, priority: number, loadFn: () => Promise<void>): Promise<void> {
    // 1. If already active (currently running), return the active promise
    const activePromise = this.activeTasks.get(id);
    if (activePromise) {
      return activePromise;
    }

    // 2. If already pending in queue, upgrade priority if higher
    const existing = this.pendingTasks.find((t) => t.id === id);
    if (existing) {
      if (priority > existing.priority) {
        existing.priority = priority;
        this.sortQueue();
      }
      return existing.promise;
    }

    // 3. Create a new pending task
    let resolveFn!: () => void;
    let rejectFn!: (err: any) => void;
    const promise = new Promise<void>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const task: ScheduledTask = {
      id,
      priority,
      sequence: this.sequenceCounter++,
      loadFn,
      resolve: resolveFn,
      reject: rejectFn,
      promise,
    };

    this.pendingTasks.push(task);
    this.sortQueue();

    // Process asynchronously so that enqueuing is completely non-blocking
    setTimeout(() => this.processQueue(), 0);

    return promise;
  }

  cancel(id: string) {
    const index = this.pendingTasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      const [task] = this.pendingTasks.splice(index, 1);
      // Reject with a cancelled error so the in-flight handler or observers reject gracefully
      task.reject(new Error("cancelled"));
    }
  }

  private sortQueue() {
    this.pendingTasks.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority; // higher priority first
      }
      // For high-priority visible tasks (priority >= 2): FIFO (natural visual order)
      if (b.priority >= 2) {
        return a.sequence - b.sequence;
      }
      // For preload tasks (priority < 2): LIFO (most recently approached items near current scroll first)
      return b.sequence - a.sequence;
    });

    // Prune obsolete low-priority preload tasks so they never delay visible items or active viewport
    const preloadTasks = this.pendingTasks.filter((t) => t.priority < 2);
    if (preloadTasks.length > 8) {
      const sortedPreloads = [...preloadTasks].sort((a, b) => b.sequence - a.sequence);
      const stalePreloads = sortedPreloads.slice(8);
      for (const stale of stalePreloads) {
        const idx = this.pendingTasks.indexOf(stale);
        if (idx !== -1) {
          this.pendingTasks.splice(idx, 1);
          stale.reject(new Error("cancelled_stale"));
        }
      }
    }
  }

  private processQueue() {
    if (this.activeTasks.size >= this.maxConcurrent) {
      return;
    }
    if (this.pendingTasks.length === 0) {
      return;
    }

    const task = this.pendingTasks.shift()!;

    // Create execution promise
    const executionPromise = (async () => {
      try {
        await task.loadFn();
        task.resolve();
      } catch (err) {
        task.reject(err);
      } finally {
        this.activeTasks.delete(task.id);
        // Process next item asynchronously
        setTimeout(() => this.processQueue(), 0);
      }
    })();

    this.activeTasks.set(task.id, executionPromise);
  }
}

export const mediaScheduler = new MediaScheduler();

export function cancelQueuedMediaLoad(id: string) {
  mediaScheduler.cancel(id);
}
