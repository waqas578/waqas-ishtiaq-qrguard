import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { decodeQrFromImageData } from './decodeQr'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../test-fixtures')

function loadPngAsImageData(fileName: string): ImageData {
  const png = PNG.sync.read(readFileSync(join(fixturesDir, fileName)))
  return {
    width: png.width,
    height: png.height,
    data: png.data,
    colorSpace: 'srgb',
  } as ImageData
}

describe('decodeQrFromImageData (fixture QR images)', () => {
  it('decodes the sample QR PNG to the expected URL', () => {
    const result = decodeQrFromImageData(loadPngAsImageData('sample-qr.png'))

    expect(result).toEqual({
      ok: true,
      data: 'https://example.com/qrguard-demo',
    })
  })

  it('decodes the text-payload QR fixture', () => {
    const result = decodeQrFromImageData(loadPngAsImageData('text-qr.png'))

    expect(result).toEqual({
      ok: true,
      data: 'QRGuard demo text payload',
    })
  })

  it('returns a clear error for a blank image with no QR code', () => {
    const result = decodeQrFromImageData(loadPngAsImageData('blank-no-qr.png'))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/no qr code found/i)
    }
  })
})
