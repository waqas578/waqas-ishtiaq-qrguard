export type CameraSupportOk = { ok: true }

export type CameraSupportFail = {
  ok: false
  reason: 'unsupported' | 'insecure-context'
  message: string
}

export type CameraSupport = CameraSupportOk | CameraSupportFail

/** Longest side passed to jsQR — enough detail, without stalling every frame. */
export const SCAN_MAX_SIDE = 720

/**
 * Check whether this page can ask for a camera stream.
 * getUserMedia usually needs a secure context (HTTPS or localhost).
 */
export function checkCameraSupport(): CameraSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Camera access is not available in this environment.',
    }
  }

  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'insecure-context',
      message:
        'Camera access needs HTTPS or localhost. On a phone over plain HTTP, use an HTTPS tunnel or test on desktop localhost instead.',
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      reason: 'unsupported',
      message:
        'This browser does not support camera access (getUserMedia). Try a recent Chrome, Edge, Firefox, or Safari build.',
    }
  }

  return { ok: true }
}

const CONSTRAINT_ATTEMPTS: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  {
    audio: false,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  { audio: false, video: true },
]

/**
 * Ask the browser for a camera stream. Tries a few constraint sets so a
 * laptop webcam still works when there is no rear "environment" camera.
 * Caller must stop tracks when done.
 */
export async function startCameraStream(
  constraints?: MediaStreamConstraints,
): Promise<MediaStream> {
  const support = checkCameraSupport()
  if (!support.ok) {
    throw new DOMException(support.message, 'NotSupportedError')
  }

  const attempts = constraints ? [constraints] : CONSTRAINT_ATTEMPTS
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(attempt)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new DOMException('Could not start the camera.', 'NotReadableError')
}

/** Stop every track on a MediaStream (safe to call with null). */
export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

/** Wait until the video element reports a real frame size (or time out). */
export function waitForVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs = 8000,
): Promise<boolean> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    let settled = false

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('playing', onReady)
      resolve(ok)
    }

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        finish(true)
      }
    }

    const timer = window.setTimeout(() => finish(false), timeoutMs)
    video.addEventListener('loadedmetadata', onReady)
    video.addEventListener('loadeddata', onReady)
    video.addEventListener('playing', onReady)
  })
}

function scanSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, SCAN_MAX_SIDE / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Copy the current video frame into ImageData for jsQR.
 *
 * Uses createImageBitmap(video) when available — drawing a live <video>
 * straight onto a canvas can return black/empty pixels on some Windows GPU
 * setups even while the on-screen preview looks fine.
 */
export async function grabVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): Promise<ImageData | null> {
  const srcW = video.videoWidth
  const srcH = video.videoHeight
  if (
    !srcW ||
    !srcH ||
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    return null
  }

  const { width, height } = scanSize(srcW, srcH)
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(video)
    ctx.drawImage(bitmap, 0, 0, width, height)
  } catch {
    // Fallback if createImageBitmap cannot snapshot the video element.
    ctx.drawImage(video, 0, 0, width, height)
  } finally {
    bitmap?.close()
  }

  return ctx.getImageData(0, 0, width, height)
}

/** Map getUserMedia / DOM errors to short student-facing messages. */
export function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera permission was denied. Allow camera access in the browser and try again.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera was found on this device.'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'The camera is already in use by another app, or could not be started.'
      case 'OverconstrainedError':
        return 'Could not match the requested camera settings. Try another device or browser.'
      case 'SecurityError':
        return 'Camera access was blocked for security reasons. Use HTTPS or localhost.'
      case 'NotSupportedError':
        return error.message || 'Camera access is not supported here.'
      default:
        break
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Could not start the camera. Please try again.'
}
