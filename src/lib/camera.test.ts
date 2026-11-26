import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cameraErrorMessage,
  checkCameraSupport,
  grabVideoFrame,
  startCameraStream,
  stopCameraStream,
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

describe('grabVideoFrame', () => {
  it('returns null when the video has no dimensions yet', () => {
    const video = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement
    const canvas = document.createElement('canvas')

    expect(grabVideoFrame(video, canvas)).toBeNull()
  })

  it('draws the video frame and returns ImageData', () => {
    const fakeImageData = {
      width: 4,
      height: 3,
      data: new Uint8ClampedArray(4 * 3 * 4),
      colorSpace: 'srgb',
    } as ImageData

    const drawImage = vi.fn()
    const getImageData = vi.fn(() => fakeImageData)
    const getContext = vi.fn(() => ({ drawImage, getImageData }))

    const video = { videoWidth: 4, videoHeight: 3 } as HTMLVideoElement
    const canvas = {
      width: 0,
      height: 0,
      getContext,
    } as unknown as HTMLCanvasElement

    const result = grabVideoFrame(video, canvas)

    expect(result).toBe(fakeImageData)
    expect(canvas.width).toBe(4)
    expect(canvas.height).toBe(3)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 4, 3)
    expect(getImageData).toHaveBeenCalledWith(0, 0, 4, 3)
  })

  it('returns null when a 2D canvas context is unavailable', () => {
    const video = { videoWidth: 8, videoHeight: 8 } as HTMLVideoElement
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement

    expect(grabVideoFrame(video, canvas)).toBeNull()
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
