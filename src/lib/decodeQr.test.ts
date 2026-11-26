import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeQrFromFile, decodeQrFromImageData } from './decodeQr'

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

  it('returns an error when jsQR returns an empty payload', () => {
    mockedJsQR.mockReturnValue({
      data: '',
      binaryData: [],
      location: {} as never,
      version: 1,
      chunks: [],
    })

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

  it('rejects zero-width image data', () => {
    const result = decodeQrFromImageData({
      width: 0,
      height: 8,
      data: new Uint8ClampedArray(0),
      colorSpace: 'srgb',
    } as ImageData)

    expect(result.ok).toBe(false)
    expect(mockedJsQR).not.toHaveBeenCalled()
  })
})

describe('decodeQrFromFile', () => {
  afterEach(() => {
    mockedJsQR.mockReset()
    vi.unstubAllGlobals()
  })

  it('rejects non-image files without reading pixels', async () => {
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' })

    const result = await decodeQrFromFile(file)

    expect(result).toEqual({
      ok: false,
      error: 'Please upload an image file (PNG, JPEG, WebP, or GIF).',
    })
    expect(mockedJsQR).not.toHaveBeenCalled()
  })

  it('returns a read error when the image cannot be decoded by the browser', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('bad image')
      }),
    )

    const file = new File([new Uint8Array([1, 2, 3])], 'broken.png', {
      type: 'image/png',
    })

    const result = await decodeQrFromFile(file)

    expect(result).toEqual({
      ok: false,
      error: 'Could not read that image. Please try a different file.',
    })
    expect(mockedJsQR).not.toHaveBeenCalled()
  })

  it('decodes a valid image file through the canvas path', async () => {
    mockedJsQR.mockReturnValue({
      data: 'https://example.com/from-file',
      binaryData: [],
      location: {} as never,
      version: 1,
      chunks: [],
    })

    const fakeBitmap = {
      width: 2,
      height: 2,
      close: vi.fn(),
    }

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => fakeBitmap),
    )

    const fakeImageData = makeImageData(2, 2)
    const drawImage = vi.fn()
    const getImageData = vi.fn(() => fakeImageData)
    const getContext = vi.fn(() => ({ drawImage, getImageData }))

    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext,
    } as unknown as HTMLCanvasElement)

    const file = new File([new Uint8Array([137, 80, 78, 71])], 'qr.png', {
      type: 'image/png',
    })

    const result = await decodeQrFromFile(file)

    expect(result).toEqual({
      ok: true,
      data: 'https://example.com/from-file',
    })
    expect(drawImage).toHaveBeenCalledOnce()
    expect(fakeBitmap.close).toHaveBeenCalledOnce()
    expect(mockedJsQR).toHaveBeenCalledOnce()
  })

  it('returns a prepare error when canvas 2D context is unavailable', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 2,
        height: 2,
        close: vi.fn(),
      })),
    )

    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement)

    const file = new File([new Uint8Array([1])], 'qr.png', {
      type: 'image/png',
    })

    const result = await decodeQrFromFile(file)

    expect(result).toEqual({
      ok: false,
      error: 'Could not prepare the image for decoding.',
    })
    expect(mockedJsQR).not.toHaveBeenCalled()
  })
})
