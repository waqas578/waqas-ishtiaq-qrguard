/**
 * Website risk-ranking module (skeleton).
 * Sprint 1 Part 3: score a destination URL and return a risk summary.
 */

/**
 * Rank how risky a destination website appears.
 * @param {string} _url - Absolute destination URL to assess.
 * @returns {Promise<{ ok: false, error: string } | { ok: true, score: number, label: string, signals: string[] }>}
 */
export async function rankDestination(_url) {
  return {
    ok: false,
    error: "Risk ranking not implemented yet (Sprint 1 Part 3).",
  };
}
