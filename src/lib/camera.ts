export type CameraSupportOk = { ok: true }

export type CameraSupportFail = {
  ok: false
  reason: 'unsupported' | 'insecure-context'
  message: string
}

export type CameraSupport = CameraSupportOk | CameraSupportFail

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

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}

/**
 * Ask the browser for a camera stream. Caller must stop tracks when done.
 */
export async function startCameraStream(
  constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS,
): Promise<MediaStream> {
  const support = checkCameraSupport()
  if (!support.ok) {
    throw new DOMException(support.message, 'NotSupportedError')
  }

  return navigator.mediaDevices.getUserMedia(constraints)
}

/** Stop every track on a MediaStream (safe to call with null). */
export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

/**
 * Draw the current video frame onto a canvas and return ImageData for jsQR.
 * Returns null if the video is not ready yet.
 */
export function grabVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): ImageData | null {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null

  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, width, height)
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
