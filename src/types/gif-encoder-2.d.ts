declare module 'gif-encoder-2' {
  export default class GIFEncoder {
    constructor(width: number, height: number, algorithm?: string, useOptimizer?: boolean, maxColors?: number);
    setDelay(ms: number): void;
    setRepeat(repeat: number): void;
    setQuality(quality: number): void;
    start(): void;
    addFrame(ctx: CanvasRenderingContext2D): void;
    finish(): void;
    out: { getData(): number[] };
  }
}
