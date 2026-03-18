declare module 'gifshot' {
  interface GifshotOptions {
    images: string[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
  }
  interface GifshotResult {
    error: boolean;
    errorMsg?: string;
    image: string;
  }
  export function createGIF(options: GifshotOptions, callback: (obj: GifshotResult) => void): void;
}
