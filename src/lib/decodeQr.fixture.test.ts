import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { decodeQrFromImageData } from './decodeQr'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../test-fixtures/sample-qr.png',
)

describe('decodeQrFromImageData (fixture QR image)', () => {
  it('decodes the sample QR PNG to the expected URL', () => {
    const png = PNG.sync.read(readFileSync(fixturePath))
    const imageData = {
      width: png.width,
      height: png.height,
      data: png.data,
      colorSpace: 'srgb',
    } as ImageData

    const result = decodeQrFromImageData(imageData)

    expect(result).toEqual({
      ok: true,
      data: 'https://example.com/qrguard-demo',
    })
  })
})
