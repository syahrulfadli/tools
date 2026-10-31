/** Web Worker: pelacakan bisa makan detik sampai puluhan detik, jadi tidak boleh di thread UI. */
import { traceToSvg, type Raster, type TraceResult, type TraceSettings } from "./trace";

export interface TraceRequest {
  raster: Raster;
  settings: TraceSettings;
  output: { width: number; height: number };
}

export type TraceMessage =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; result: TraceResult }
  | { type: "error"; message: string };

self.onmessage = (event: MessageEvent<TraceRequest>) => {
  const { raster, settings, output } = event.data;
  const send = (message: TraceMessage) => self.postMessage(message);
  try {
    send({ type: "done", result: traceToSvg(raster, settings, output, (done, total) => send({ type: "progress", done, total })) });
  } catch (error) {
    send({ type: "error", message: (error as Error).message || "Gagal melacak gambar." });
  }
};
