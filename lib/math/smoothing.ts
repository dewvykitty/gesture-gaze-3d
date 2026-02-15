/**
 * Exponential moving average for smoothing values
 */
export class ExponentialSmoother {
  private value: number;
  private alpha: number;

  constructor(initialValue: number = 0, alpha: number = 0.1) {
    this.value = initialValue;
    this.alpha = alpha;
  }

  update(newValue: number): number {
    this.value = this.value * (1 - this.alpha) + newValue * this.alpha;
    return this.value;
  }

  getValue(): number {
    return this.value;
  }

  reset(value: number): void {
    this.value = value;
  }
}

/**
 * Exponential moving average for 2D vectors
 */
export class Vector2Smoother {
  private x: ExponentialSmoother;
  private y: ExponentialSmoother;

  constructor(alpha: number = 0.1) {
    this.x = new ExponentialSmoother(0, alpha);
    this.y = new ExponentialSmoother(0, alpha);
  }

  update(x: number, y: number): { x: number; y: number } {
    return {
      x: this.x.update(x),
      y: this.y.update(y),
    };
  }

  reset(x: number, y: number): void {
    this.x.reset(x);
    this.y.reset(y);
  }
}

/**
 * Exponential moving average for 3D vectors
 */
export class Vector3Smoother {
  private x: ExponentialSmoother;
  private y: ExponentialSmoother;
  private z: ExponentialSmoother;

  constructor(alpha: number = 0.1) {
    this.x = new ExponentialSmoother(0, alpha);
    this.y = new ExponentialSmoother(0, alpha);
    this.z = new ExponentialSmoother(0, alpha);
  }

  update(x: number, y: number, z: number): { x: number; y: number; z: number } {
    return {
      x: this.x.update(x),
      y: this.y.update(y),
      z: this.z.update(z),
    };
  }

  reset(x: number, y: number, z: number): void {
    this.x.reset(x);
    this.y.reset(y);
    this.z.reset(z);
  }
}
