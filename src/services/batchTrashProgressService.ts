/**
 * Batch Trash Progress Service
 * Monitors batch deletion of items being moved to trash.
 * Requirement:
 * - When deleting more than 5 media items (> 5), process them progressively ("aos poucos").
 * - Only display the top progress modal if the device is experiencing lag/hiccups ("engasgo").
 *   If the device finishes quickly (< 450ms) without lag, the modal is NOT shown.
 */

export interface BatchTrashProgressState {
  isActive: boolean;
  isLagging: boolean;
  current: number;
  total: number;
  isComplete: boolean;
}

type Listener = (state: BatchTrashProgressState) => void;

class BatchTrashProgressService {
  private state: BatchTrashProgressState = {
    isActive: false,
    isLagging: false,
    current: 0,
    total: 0,
    isComplete: false,
  };

  private listeners = new Set<Listener>();
  private lagTimer: any = null;

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = { ...this.state };
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.warn('[BatchTrashProgressService] Listener error:', err);
      }
    });
  }

  /**
   * Starts tracking a batch deletion.
   * If total > 5, starts a timer. If it takes longer than 450ms to complete,
   * it marks isLagging = true and displays the top modal.
   */
  public start(total: number) {
    if (this.lagTimer) {
      clearTimeout(this.lagTimer);
      this.lagTimer = null;
    }

    if (total > 5) {
      this.state = {
        isActive: true,
        isLagging: false,
        current: 0,
        total,
        isComplete: false,
      };
      this.notify();

      // Only trigger if device experiences lag / delay (> 450ms)
      this.lagTimer = setTimeout(() => {
        if (this.state.isActive && !this.state.isComplete) {
          this.state.isLagging = true;
          this.notify();
        }
      }, 450);
    } else {
      this.state = {
        isActive: false,
        isLagging: false,
        current: 0,
        total,
        isComplete: false,
      };
      this.notify();
    }
  }

  /**
   * Updates current progress as items are moved to trash progressively.
   */
  public update(current: number, total: number) {
    if (!this.state.isActive) return;
    this.state.current = current;
    this.state.total = total;
    this.notify();
  }

  /**
   * Finishes tracking.
   * If modal was showing (isLagging === true), displays completed state briefly before closing smoothly.
   */
  public finish(successCount: number, total: number) {
    if (this.lagTimer) {
      clearTimeout(this.lagTimer);
      this.lagTimer = null;
    }

    if (this.state.isLagging) {
      this.state.current = total;
      this.state.isComplete = true;
      this.notify();

      setTimeout(() => {
        this.state = {
          isActive: false,
          isLagging: false,
          current: 0,
          total: 0,
          isComplete: false,
        };
        this.notify();
      }, 1100);
    } else {
      this.state = {
        isActive: false,
        isLagging: false,
        current: 0,
        total: 0,
        isComplete: false,
      };
      this.notify();
    }
  }
}

export const batchTrashProgressService = new BatchTrashProgressService();
