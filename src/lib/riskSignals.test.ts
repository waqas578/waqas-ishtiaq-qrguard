import { describe, expect, it } from 'vitest'
import { assessPayloadRisk, riskLevelLabel } from './riskSignals'

describe('assessPayloadRisk', () => {
  it('ranks a normal https URL as low risk', () => {
    const result = assessPayloadRisk('https://example.com/qrguard-demo')

    expect(result.level).toBe('low')
    expect(result.signals.some((s) => s.id === 'https-ok')).toBe(true)
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.summary).toMatch(/no obvious risk|low risk/i)
  })

  it('flags insecure http as medium', () => {
    const result = assessPayloadRisk('http://example.com/page')

    expect(result.level).toBe('medium')
    expect(result.signals.some((s) => s.id === 'insecure-http')).toBe(true)
    expect(result.reasons.join(' ')).toMatch(/http/i)
  })

  it('flags known shorteners as medium', () => {
    const result = assessPayloadRisk('https://bit.ly/abc123')

    expect(result.level).toBe('medium')
    expect(result.signals.some((s) => s.id === 'shortener')).toBe(true)
    expect(result.reasons.join(' ')).toMatch(/shortener/i)
  })

  it('flags mailto as an odd scheme (medium)', () => {
    const result = assessPayloadRisk('mailto:demo@example.com')

    expect(result.level).toBe('medium')
    expect(result.signals.some((s) => s.id === 'odd-scheme')).toBe(true)
  })

  it('flags javascript: as high risk', () => {
    const result = assessPayloadRisk("javascript:alert('x')")

    expect(result.level).toBe('high')
    expect(result.signals.some((s) => s.id === 'dangerous-scheme')).toBe(true)
    expect(result.summary).toMatch(/high risk/i)
  })

  it('flags data: URLs as high risk', () => {
    const result = assessPayloadRisk('data:text/html,hi')

    expect(result.level).toBe('high')
    expect(result.signals.some((s) => s.id === 'dangerous-scheme')).toBe(true)
  })

  it('flags IP hosts as high risk', () => {
    const result = assessPayloadRisk('https://192.168.0.10/login')

    expect(result.level).toBe('high')
    expect(result.signals.some((s) => s.id === 'ip-host')).toBe(true)
  })

  it('flags @ userinfo phishing pattern as high risk', () => {
    const result = assessPayloadRisk('https://paypal.com@evil.example/login')

    expect(result.level).toBe('high')
    expect(result.signals.some((s) => s.id === 'at-sign')).toBe(true)
  })

  it('flags suspicious host keywords as high risk', () => {
    const result = assessPayloadRisk('https://secure-login-paypal.example/update')

    expect(result.level).toBe('high')
    expect(result.signals.some((s) => s.id === 'suspicious-host')).toBe(true)
  })

  it('flags punycode hosts as high risk', () => {
    const result = assessPayloadRisk('https://xn--pple-43d.com/')

    expect(result.level).toBe('high')
    expect(result.signals.some((s) => s.id === 'punycode')).toBe(true)
  })

  it('treats plain text as low risk', () => {
    const result = assessPayloadRisk('QRGuard demo text payload')

    expect(result.level).toBe('low')
    expect(result.signals.some((s) => s.id === 'plain-text')).toBe(true)
  })

  it('flags unparseable URL-like text as medium', () => {
    const result = assessPayloadRisk('https://exa mple.com/broken')

    expect(result.level).toBe('medium')
    expect(result.signals.some((s) => s.id === 'unparseable')).toBe(true)
  })

  it('stacks http + shortener and stays at least medium', () => {
    const result = assessPayloadRisk('http://tinyurl.com/demo')

    expect(LEVEL_AT_LEAST_MEDIUM(result.level)).toBe(true)
    expect(result.signals.some((s) => s.id === 'insecure-http')).toBe(true)
    expect(result.signals.some((s) => s.id === 'shortener')).toBe(true)
  })

  it('flags non-standard ports as medium', () => {
    const result = assessPayloadRisk('https://example.com:8443/app')

    expect(result.level).toBe('medium')
    expect(result.signals.some((s) => s.id === 'odd-port')).toBe(true)
  })
})

describe('riskLevelLabel', () => {
  it('returns human-readable labels', () => {
    expect(riskLevelLabel('low')).toBe('Low risk')
    expect(riskLevelLabel('medium')).toBe('Medium risk')
    expect(riskLevelLabel('high')).toBe('High risk')
  })
})

function LEVEL_AT_LEAST_MEDIUM(level: 'low' | 'medium' | 'high'): boolean {
  return level === 'medium' || level === 'high'
}
