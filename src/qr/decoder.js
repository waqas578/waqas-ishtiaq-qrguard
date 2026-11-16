/**
 * QR decode module (skeleton).
 * Sprint 1 Part 2: accept image/bytes and return the embedded payload string.
 */

/**
 * Decode a QR payload from an image source.
 * @param {unknown} _source - Image bytes, file path, or canvas source (TBD).
 * @returns {Promise<{ ok: false, error: string } | { ok: true, payload: string }>}
 */
export async function decodeQr(_source) {
  return {
    ok: false,
    error: "QR decoding not implemented yet (Sprint 1 Part 2).",
  };
}
