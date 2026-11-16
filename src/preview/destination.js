/**
 * Destination preview module (skeleton).
 * Sprint 1 Part 2: normalise a QR payload into a previewable destination URL.
 */

/**
 * Build a destination preview from a decoded QR payload.
 * @param {string} _payload - Raw string from the QR code.
 * @returns {{ ok: false, error: string } | { ok: true, url: string, host: string }}
 */
export function previewDestination(_payload) {
  return {
    ok: false,
    error: "Destination preview not implemented yet (Sprint 1 Part 2).",
  };
}
