/**
 * Application factory — wires QRGuard modules without implementing features yet.
 */

import * as decoder from "./qr/decoder.js";
import * as destination from "./preview/destination.js";
import * as ranker from "./risk/ranker.js";

/**
 * @returns {{ name: string, version: string, modules: Record<string, unknown> }}
 */
export function createApp() {
  return {
    name: "QRGuard",
    version: "0.1.0",
    modules: {
      decoder,
      destination,
      ranker,
    },
  };
}
