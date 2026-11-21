import { SimulationEvent } from './types';

export class PriorityEventQueue {
  private heap: SimulationEvent[] = [];

  public push(event: SimulationEvent): void {
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): SimulationEvent | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public peek(): SimulationEvent | undefined {
    return this.heap[0];
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public clear(): void {
    this.heap = [];
  }

  private bubbleUp(n: number): void {
    const element = this.heap[n];
    while (n > 0) {
      const parentN = Math.floor((n + 1) / 2) - 1;
      const parent = this.heap[parentN];
      if (element.timestamp >= parent.timestamp) break;
      this.heap[parentN] = element;
      this.heap[n] = parent;
      n = parentN;
    }
  }

  private sinkDown(n: number): void {
    const length = this.heap.length;
    const element = this.heap[n];

    while (true) {
      const child2N = (n + 1) * 2;
      const child1N = child2N - 1;
      let swap: number | null = null;

      if (child1N < length) {
        const child1 = this.heap[child1N];
        if (child1.timestamp < element.timestamp) {
          swap = child1N;
        }
      }

      if (child2N < length) {
        const child2 = this.heap[child2N];
        if (
          (swap === null && child2.timestamp < element.timestamp) ||
          (swap !== null && child2.timestamp < this.heap[swap].timestamp)
        ) {
          swap = child2N;
        }
      }

      if (swap === null) break;
      this.heap[n] = this.heap[swap];
      this.heap[swap] = element;
      n = swap;
    }
  }
}
