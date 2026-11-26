export type RiskLevel = 'low' | 'medium' | 'high'

export type RiskSignal = {
  id: string
  level: RiskLevel
  reason: string
}

export type RiskAssessment = {
  level: RiskLevel
  signals: RiskSignal[]
  reasons: string[]
  summary: string
}

const LEVEL_SCORE: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

/** Common public URL shorteners — often hide the real destination. */
const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'bitly.com',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'rb.gy',
  'tiny.cc',
  'lnkd.in',
  's.id',
  'v.gd',
  'clck.ru',
])

/** Schemes that are unusual or unsafe for a “visit this site” QR. */
const ODD_SCHEMES = new Set([
  'javascript',
  'data',
  'vbscript',
  'file',
  'blob',
  'mailto',
  'tel',
  'sms',
  'ftp',
])

const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file', 'blob'])

const SUSPICIOUS_HOST_HINTS = [
  'login-',
  'secure-',
  'verify-',
  'account-',
  'update-',
  'confirm-',
  'free-',
  'prize',
  'wallet-',
  'paypal',
  'appleid',
  'microsoft-',
  'bank-',
]

function highestLevel(signals: RiskSignal[]): RiskLevel {
  let best: RiskLevel = 'low'
  for (const signal of signals) {
    if (LEVEL_SCORE[signal.level] > LEVEL_SCORE[best]) {
      best = signal.level
    }
  }
  return best
}

function summaryFor(level: RiskLevel, signalCount: number): string {
  if (signalCount === 0) {
    return 'No obvious risk signals on this payload.'
  }
  switch (level) {
    case 'high':
      return 'High risk — treat this destination carefully and do not open it automatically.'
    case 'medium':
      return 'Medium risk — review the reasons below before deciding whether to visit.'
    default:
      return 'Low risk — a few mild signals only; still preview before you open anything.'
  }
}

function looksLikeIpv4(host: string): boolean {
  const parts = host.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/\.$/, '').toLowerCase()
}

function isShortenerHost(host: string): boolean {
  if (SHORTENER_HOSTS.has(host)) return true
  for (const known of SHORTENER_HOSTS) {
    if (host.endsWith(`.${known}`)) return true
  }
  return false
}

function countDots(host: string): number {
  return host.split('.').filter(Boolean).length - 1
}

function pushSignal(
  signals: RiskSignal[],
  id: string,
  level: RiskLevel,
  reason: string,
) {
  if (signals.some((s) => s.id === id)) return
  signals.push({ id, level, reason })
}

/**
 * Client-side heuristic risk ranking for a decoded QR payload.
 * Does not fetch the destination or call external reputation APIs.
 */
export function assessPayloadRisk(rawPayload: string): RiskAssessment {
  const payload = rawPayload.trim()
  const signals: RiskSignal[] = []

  if (!payload) {
    pushSignal(signals, 'empty', 'medium', 'Decoded payload is empty.')
    const level = highestLevel(signals)
    return {
      level,
      signals,
      reasons: signals.map((s) => s.reason),
      summary: summaryFor(level, signals.length),
    }
  }

  // Plain text (no scheme and no URL-like shape)
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(payload)
  const looksLikeUrl =
    hasScheme ||
    /^www\./i.test(payload) ||
    /^[a-z0-9.-]+\.[a-z]{2,}([/:?#]|$)/i.test(payload)

  if (!looksLikeUrl) {
    pushSignal(
      signals,
      'plain-text',
      'low',
      'Payload is plain text, not a website URL.',
    )
    const level = highestLevel(signals)
    return {
      level,
      signals,
      reasons: signals.map((s) => s.reason),
      summary: summaryFor(level, signals.length),
    }
  }

  let url: URL
  try {
    // Allow scheme-less hosts like example.com or www.example.com
    const candidate = hasScheme ? payload : `https://${payload}`
    url = new URL(candidate)
  } catch {
    pushSignal(
      signals,
      'unparseable',
      'medium',
      'Payload looks URL-like but could not be parsed cleanly.',
    )
    const level = highestLevel(signals)
    return {
      level,
      signals,
      reasons: signals.map((s) => s.reason),
      summary: summaryFor(level, signals.length),
    }
  }

  const scheme = url.protocol.replace(/:$/, '').toLowerCase()
  const host = hostnameOf(url)

  if (DANGEROUS_SCHEMES.has(scheme)) {
    pushSignal(
      signals,
      'dangerous-scheme',
      'high',
      `Uses a dangerous scheme (${scheme}:) that can run code or access local files.`,
    )
  } else if (ODD_SCHEMES.has(scheme)) {
    pushSignal(
      signals,
      'odd-scheme',
      'medium',
      `Uses an unusual scheme for a web visit (${scheme}:).`,
    )
  } else if (scheme === 'http') {
    pushSignal(
      signals,
      'insecure-http',
      'medium',
      'Uses http (not https), so traffic is not encrypted.',
    )
  } else if (scheme !== 'https') {
    pushSignal(
      signals,
      'unknown-scheme',
      'medium',
      `Uses an uncommon scheme (${scheme}:).`,
    )
  }

  // Credential phishing pattern: userinfo before host (https://user@host)
  if (
    (url.username || url.password) &&
    scheme !== 'mailto' &&
    scheme !== 'tel' &&
    scheme !== 'sms'
  ) {
    pushSignal(
      signals,
      'at-sign',
      'high',
      'Contains an @ before the host — often used to disguise the real destination.',
    )
  }

  if (host) {
    if (looksLikeIpv4(host) || host.startsWith('[') || host.includes(':')) {
      pushSignal(
        signals,
        'ip-host',
        'high',
        'Points at a raw IP address instead of a normal domain name.',
      )
    }

    if (host.includes('xn--')) {
      pushSignal(
        signals,
        'punycode',
        'high',
        'Host uses punycode (xn--…), which can hide lookalike characters.',
      )
    }

    if (isShortenerHost(host)) {
      pushSignal(
        signals,
        'shortener',
        'medium',
        `Host looks like a known URL shortener (${host}), which hides the final site.`,
      )
    }

    if (countDots(host) >= 3) {
      pushSignal(
        signals,
        'many-subdomains',
        'medium',
        'Host has many subdomains, which can look more trustworthy than it is.',
      )
    }

    const hostLower = host.toLowerCase()
    for (const hint of SUSPICIOUS_HOST_HINTS) {
      if (hostLower.includes(hint)) {
        pushSignal(
          signals,
          'suspicious-host',
          'high',
          'Host name includes words often used in phishing pages (e.g. login, verify, paypal).',
        )
        break
      }
    }
  }

  if (url.port && url.port !== '80' && url.port !== '443') {
    pushSignal(
      signals,
      'odd-port',
      'medium',
      `Uses a non-standard port (${url.port}).`,
    )
  }

  if (payload.length > 200) {
    pushSignal(
      signals,
      'long-payload',
      'medium',
      'Decoded text is unusually long, which can hide tracking or redirect tricks.',
    )
  }

  // Hex / percent-encoded blobs that look obfuscated
  const encodedRuns = payload.match(/%[0-9a-f]{2}/gi) ?? []
  if (encodedRuns.length >= 8) {
    pushSignal(
      signals,
      'heavy-encoding',
      'medium',
      'Contains a lot of percent-encoding, which can obscure the real path.',
    )
  }

  if (signals.length === 0 && scheme === 'https') {
    pushSignal(
      signals,
      'https-ok',
      'low',
      'Looks like a normal https URL with no extra warning signs.',
    )
  }

  const level = highestLevel(signals)
  return {
    level,
    signals,
    reasons: signals.map((s) => s.reason),
    summary: summaryFor(level, signals.filter((s) => s.id !== 'https-ok').length),
  }
}

export function riskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return 'High risk'
    case 'medium':
      return 'Medium risk'
    default:
      return 'Low risk'
  }
}
