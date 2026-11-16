import jsQR from 'jsqr'

export type DecodeSuccess = {
  ok: true
  data: string
}

export type DecodeFailure = {
  ok: false
  error: string
}

export type DecodeResult = DecodeSuccess | DecodeFailure

/**
 * Decode a QR code from raw ImageData using jsQR.
 * Does not open or navigate to any decoded URL.
 */
export function decodeQrFromImageData(imageData: ImageData): DecodeResult {
  if (
    !imageData ||
    imageData.width <= 0 ||
    imageData.height <= 0 ||
    imageData.data.length === 0
  ) {
    return { ok: false, error: 'Invalid image data — nothing to decode.' }
  }

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })

  if (!code || !code.data) {
    return {
      ok: false,
      error: 'No QR code found in this image. Try a clearer, well-lit photo.',
    }
  }

  return { ok: true, data: code.data }
}

/**
 * Load a File (image) onto a canvas and decode any QR code it contains.
 */
export async function decodeQrFromFile(file: File): Promise<DecodeResult> {
  if (!file.type.startsWith('image/')) {
    return {
      ok: false,
      error: 'Please upload an image file (PNG, JPEG, WebP, or GIF).',
    }
  }

  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return { ok: false, error: 'Could not prepare the image for decoding.' }
    }

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return decodeQrFromImageData(imageData)
  } catch {
    return {
      ok: false,
      error: 'Could not read that image. Please try a different file.',
    }
  }
}
