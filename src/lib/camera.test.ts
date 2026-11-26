import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SCAN_MAX_SIDE,
  cameraErrorMessage,
  checkCameraSupport,
  grabVideoFrame,
  startCameraStream,
  stopCameraStream,
  waitForVideoDimensions,
} from './camera'

describe('checkCameraSupport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports unsupported when getUserMedia is missing', () => {
    vi.stubGlobal('window', {
      isSecureContext: true,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: undefined,
    })

    const result = checkCameraSupport()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unsupported')
      expect(result.message).toMatch(/does not support camera/i)
    }
  })

  it('reports insecure-context when the page is not secure', () => {
    vi.stubGlobal('window', {
      isSecureContext: false,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    })

    const result = checkCameraSupport()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('insecure-context')
      expect(result.message).toMatch(/https or localhost/i)
    }
  })

  it('returns ok when secure context and getUserMedia exist', () => {
    vi.stubGlobal('window', {
      isSecureContext: true,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    })

    expect(checkCameraSupport()).toEqual({ ok: true })
  })
})

describe('startCameraStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls getUserMedia when support checks pass', async () => {
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream
    const getUserMedia = vi.fn(async () => fakeStream)

    vi.stubGlobal('window', {
      isSecureContext: true,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
    })

    const stream = await startCameraStream()

    expect(stream).toBe(fakeStream)
    expect(getUserMedia).toHaveBeenCalledOnce()
  })

  it('falls back to simpler constraints when the first attempt fails', async () => {
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('no rear cam', 'OverconstrainedError'))
      .mockResolvedValueOnce(fakeStream)

    vi.stubGlobal('window', {
      isSecureContext: true,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
    })

    const stream = await startCameraStream()

    expect(stream).toBe(fakeStream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('throws NotSupportedError when the browser cannot use a camera', async () => {
    vi.stubGlobal('window', {
      isSecureContext: true,
    })
    vi.stubGlobal('navigator', {
      mediaDevices: undefined,
    })

    await expect(startCameraStream()).rejects.toMatchObject({
      name: 'NotSupportedError',
    })
  })
})

describe('stopCameraStream', () => {
  it('stops every track on the stream', () => {
    const stopA = vi.fn()
    const stopB = vi.fn()
    const stream = {
      getTracks: () => [{ stop: stopA }, { stop: stopB }],
    } as unknown as MediaStream

    stopCameraStream(stream)

    expect(stopA).toHaveBeenCalledOnce()
    expect(stopB).toHaveBeenCalledOnce()
  })

  it('ignores null or undefined streams', () => {
    expect(() => stopCameraStream(null)).not.toThrow()
    expect(() => stopCameraStream(undefined)).not.toThrow()
  })
})

describe('waitForVideoDimensions', () => {
  it('resolves true immediately when dimensions are already known', async () => {
    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement
    await expect(waitForVideoDimensions(video)).resolves.toBe(true)
  })

  it('resolves true after loadedmetadata provides dimensions', async () => {
    const listeners = new Map<string, EventListener>()
    const video = {
      videoWidth: 0,
      videoHeight: 0,
      addEventListener: (type: string, handler: EventListener) => {
        listeners.set(type, handler)
      },
      removeEventListener: (type: string) => {
        listeners.delete(type)
      },
    } as unknown as HTMLVideoElement

    const pending = waitForVideoDimensions(video, 2000)
    Object.assign(video, { videoWidth: 1280, videoHeight: 720 })
    listeners.get('loadedmetadata')?.(new Event('loadedmetadata'))

    await expect(pending).resolves.toBe(true)
  })
})

describe('grabVideoFrame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when the video has no dimensions yet', async () => {
    const video = {
      videoWidth: 0,
      videoHeight: 0,
      readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    } as HTMLVideoElement

    await expect(grabVideoFrame(video)).resolves.toBeNull()
  })

  it('returns null when the video is not ready to draw', async () => {
    const video = {
      videoWidth: 640,
      videoHeight: 480,
      readyState: HTMLMediaElement.HAVE_NOTHING,
    } as HTMLVideoElement

    await expect(grabVideoFrame(video)).resolves.toBeNull()
  })

  it('uses createImageBitmap then returns ImageData at scan size', async () => {
    const fakeImageData = {
      width: 4,
      height: 3,
      data: new Uint8ClampedArray(4 * 3 * 4),
      colorSpace: 'srgb',
    } as ImageData

    const drawImage = vi.fn()
    const getImageData = vi.fn(() => fakeImageData)
    const getContext = vi.fn(() => ({ drawImage, getImageData }))
    const close = vi.fn()
    const bitmap = { width: 4, height: 3, close }

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    )

    const video = {
      videoWidth: 4,
      videoHeight: 3,
      readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    } as HTMLVideoElement
    const canvas = {
      width: 0,
      height: 0,
      getContext,
    } as unknown as HTMLCanvasElement

    const result = await grabVideoFrame(video, canvas)

    expect(result).toBe(fakeImageData)
    expect(canvas.width).toBe(4)
    expect(canvas.height).toBe(3)
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 4, 3)
    expect(close).toHaveBeenCalledOnce()
    expect(getImageData).toHaveBeenCalledWith(0, 0, 4, 3)
  })

  it('downscales large frames to SCAN_MAX_SIDE for jsQR', async () => {
    const srcW = 1920
    const srcH = 1080
    const expectedScale = SCAN_MAX_SIDE / srcW
    const expectedW = Math.round(srcW * expectedScale)
    const expectedH = Math.round(srcH * expectedScale)

    const fakeImageData = {
      width: expectedW,
      height: expectedH,
      data: new Uint8ClampedArray(expectedW * expectedH * 4),
      colorSpace: 'srgb',
    } as ImageData

    const drawImage = vi.fn()
    const getImageData = vi.fn(() => fakeImageData)
    const getContext = vi.fn(() => ({ drawImage, getImageData }))
    const close = vi.fn()

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: srcW, height: srcH, close })),
    )

    const video = {
      videoWidth: srcW,
      videoHeight: srcH,
      readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    } as HTMLVideoElement
    const canvas = {
      width: 0,
      height: 0,
      getContext,
    } as unknown as HTMLCanvasElement

    await grabVideoFrame(video, canvas)

    expect(canvas.width).toBe(expectedW)
    expect(canvas.height).toBe(expectedH)
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      expectedW,
      expectedH,
    )
  })

  it('falls back to drawImage(video) when createImageBitmap fails', async () => {
    const fakeImageData = {
      width: 8,
      height: 8,
      data: new Uint8ClampedArray(8 * 8 * 4),
      colorSpace: 'srgb',
    } as ImageData

    const drawImage = vi.fn()
    const getImageData = vi.fn(() => fakeImageData)
    const getContext = vi.fn(() => ({ drawImage, getImageData }))

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('cannot snapshot')
      }),
    )

    const video = {
      videoWidth: 8,
      videoHeight: 8,
      readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    } as HTMLVideoElement
    const canvas = {
      width: 0,
      height: 0,
      getContext,
    } as unknown as HTMLCanvasElement

    const result = await grabVideoFrame(video, canvas)

    expect(result).toBe(fakeImageData)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 8, 8)
  })

  it('returns null when a 2D canvas context is unavailable', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close: vi.fn() })),
    )

    const video = {
      videoWidth: 8,
      videoHeight: 8,
      readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    } as HTMLVideoElement
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement

    await expect(grabVideoFrame(video, canvas)).resolves.toBeNull()
  })
})

describe('cameraErrorMessage', () => {
  it('explains permission denied clearly', () => {
    expect(cameraErrorMessage(new DOMException('denied', 'NotAllowedError'))).toMatch(
      /permission was denied/i,
    )
  })

  it('explains missing camera hardware', () => {
    expect(cameraErrorMessage(new DOMException('missing', 'NotFoundError'))).toMatch(
      /no camera was found/i,
    )
  })

  it('falls back to a generic message for unknown errors', () => {
    expect(cameraErrorMessage('boom')).toMatch(/could not start the camera/i)
  })

  it('passes through Error messages when useful', () => {
    expect(cameraErrorMessage(new Error('custom failure'))).toBe('custom failure')
  })
})
