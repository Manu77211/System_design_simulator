export class ClockManager {
  private virtualTime: number = 0; // ms
  private speedMultiplier: number = 1.0;
  private isPaused: boolean = false;
  private lastWallTime: number = Date.now();

  constructor(initialTime: number = 0) {
    this.virtualTime = initialTime;
    this.lastWallTime = Date.now();
  }

  public getTime(): number {
    return this.virtualTime;
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(0.1, speed);
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.lastWallTime = Date.now();
  }

  public isRunning(): boolean {
    return !this.isPaused;
  }

  /**
   * Advances the virtual clock by wall clock delta * speed multiplier.
   * Returns elapsed virtual milliseconds.
   */
  public tick(): number {
    const now = Date.now();
    const wallDelta = now - this.lastWallTime;
    this.lastWallTime = now;

    if (this.isPaused) return 0;

    // Cap delta at 100ms to avoid huge time jumps on tab switch
    const clampedWallDelta = Math.min(wallDelta, 100);
    const virtualDelta = clampedWallDelta * this.speedMultiplier;
    this.virtualTime += virtualDelta;

    return virtualDelta;
  }

  public step(virtualMs: number): void {
    this.virtualTime += virtualMs;
  }

  public reset(initialTime: number = 0): void {
    this.virtualTime = initialTime;
    this.lastWallTime = Date.now();
  }
}
