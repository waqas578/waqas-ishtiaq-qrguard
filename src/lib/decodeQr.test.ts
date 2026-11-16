import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeQrFromImageData } from './decodeQr'

vi.mock('jsqr', () => ({
  default: vi.fn(),
}))

import jsQR from 'jsqr'

const mockedJsQR = vi.mocked(jsQR)

function makeImageData(width = 4, height = 4): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
  } as ImageData
}

describe('decodeQrFromImageData', () => {
  afterEach(() => {
    mockedJsQR.mockReset()
  })

  it('returns the decoded payload when jsQR finds a QR code', () => {
    mockedJsQR.mockReturnValue({
      data: 'https://example.com/safe-preview',
      binaryData: [],
      location: {} as never,
      version: 1,
      chunks: [],
    })

    const result = decodeQrFromImageData(makeImageData())

    expect(result).toEqual({
      ok: true,
      data: 'https://example.com/safe-preview',
    })
    expect(mockedJsQR).toHaveBeenCalledOnce()
  })

  it('returns a clear error when no QR code is found', () => {
    mockedJsQR.mockReturnValue(null)

    const result = decodeQrFromImageData(makeImageData())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/no qr code found/i)
    }
  })

  it('rejects empty or invalid image data without calling jsQR', () => {
    const result = decodeQrFromImageData({
      width: 0,
      height: 0,
      data: new Uint8ClampedArray(0),
      colorSpace: 'srgb',
    } as ImageData)

    expect(result).toEqual({
      ok: false,
      error: 'Invalid image data — nothing to decode.',
    })
    expect(mockedJsQR).not.toHaveBeenCalled()
  })
})
