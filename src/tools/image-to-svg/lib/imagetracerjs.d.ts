/** Tipe minimal untuk bagian imagetracerjs 1.2.x yang dipakai `trace.ts` (paketnya tanpa tipe). */
declare module "imagetracerjs" {
  export interface TracerColor {
    r: number;
    g: number;
    b: number;
    a: number;
  }

  export interface TracerImage {
    width: number;
    height: number;
    data: Uint8ClampedArray | number[];
  }

  export interface TracerOptions {
    ltres: number;
    qtres: number;
    pathomit: number;
    rightangleenhance: boolean;
    colorsampling: number;
    numberofcolors: number;
    mincolorratio: number;
    colorquantcycles: number;
    layering: number;
    strokewidth: number;
    linefilter: boolean;
    scale: number;
    roundcoords: number;
    viewbox: boolean;
    desc: boolean;
    lcpr: number;
    qcpr: number;
    blurradius: number;
    blurdelta: number;
    pal?: TracerColor[];
  }

  /** Hasil kuantisasi: indeks palet per piksel (dengan bingkai -1 selebar 1 piksel) dan paletnya. */
  export interface Indexed {
    array: number[][];
    palette: TracerColor[];
  }

  export type TracedLayer = unknown[];

  export interface TraceData {
    layers: TracedLayer[];
    palette: TracerColor[];
    width: number;
    height: number;
  }

  interface ImageTracer {
    checkoptions(options?: Partial<TracerOptions>): TracerOptions;
    colorquantization(image: TracerImage, options: TracerOptions): Indexed;
    layeringstep(indexed: Indexed, colorIndex: number): number[][];
    pathscan(layer: number[][], pathomit: number): unknown[];
    internodes(paths: unknown[], options: TracerOptions): unknown[];
    batchtracepaths(paths: unknown[], ltres: number, qtres: number): TracedLayer;
    svgpathstring(tracedata: TraceData, layerIndex: number, pathIndex: number, options: TracerOptions): string;
  }

  const tracer: ImageTracer;
  export default tracer;
}
