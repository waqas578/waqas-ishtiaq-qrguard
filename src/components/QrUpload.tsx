import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { decodeQrFromFile, type DecodeResult } from '../lib/decodeQr'

type Status = 'idle' | 'decoding' | 'success' | 'error'

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function QrUpload() {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)

  async function processFile(file: File) {
    if (!isImageFile(file)) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setFileName(file.name)
      setResult({
        ok: false,
        error: 'Please upload an image file (PNG, JPEG, WebP, or GIF).',
      })
      setStatus('error')
      setCopied(false)
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
    setStatus('decoding')
    setCopied(false)

    const decoded = await decodeQrFromFile(file)
    setResult(decoded)
    setStatus(decoded.ok ? 'success' : 'error')
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void processFile(file)
    }
    // Allow re-selecting the same file later
    event.target.value = ''
  }

  function onDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    dragDepth.current += 1
    setDragOver(true)
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) {
      setDragOver(false)
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void processFile(file)
    }
  }

  function clearSelection() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setFileName(null)
    setResult(null)
    setStatus('idle')
    setCopied(false)
    inputRef.current?.focus()
  }

  async function copyDestination() {
    if (!result?.ok) return
    try {
      await navigator.clipboard.writeText(result.data)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const dropzoneClass = [
    'dropzone',
    dragOver ? 'dropzone--active' : '',
    status === 'decoding' ? 'dropzone--busy' : '',
    status === 'success' ? 'dropzone--success' : '',
    status === 'error' ? 'dropzone--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const dropTitle =
    status === 'decoding'
      ? 'Decoding…'
      : dragOver
        ? 'Release to upload'
        : status === 'success'
          ? 'QR decoded — drop another image to try again'
          : status === 'error'
            ? 'Try another image'
            : 'Drop an image here'

  return (
    <section className="upload-panel" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Upload a QR code image</h2>
      <p className="upload-lead">
        Choose a photo of a QR code. QRGuard will decode it and show the
        destination — it will not open the link for you.
      </p>

      <label
        htmlFor={inputId}
        className={dropzoneClass}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="dropzone__title">{dropTitle}</span>
        <span className="dropzone__hint">
          or click to browse PNG, JPEG, WebP, GIF
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          disabled={status === 'decoding'}
          aria-describedby="upload-formats"
        />
      </label>
      <p id="upload-formats" className="sr-only">
        Accepted formats: PNG, JPEG, WebP, and GIF. Camera capture is not
        available in this milestone.
      </p>

      {fileName && (
        <p className="file-meta">
          Selected: <strong>{fileName}</strong>
          {' · '}
          <button type="button" className="linkish" onClick={clearSelection}>
            Clear
          </button>
        </p>
      )}

      {previewUrl && (
        <figure className="preview">
          <img src={previewUrl} alt="Uploaded QR code preview" />
        </figure>
      )}

      <div className="status-region" aria-live="polite" aria-atomic="true">
        {status === 'decoding' && (
          <p className="status status--busy" role="status">
            Decoding QR code…
          </p>
        )}

        {result?.ok && (
          <div className="result result--success" role="status">
            <div className="result__header">
              <h3>Decoded destination</h3>
              <span className="result__badge result__badge--success">
                Success
              </span>
            </div>
            <p className="result__url">{result.data}</p>
            <div className="result__actions">
              <button type="button" className="btn" onClick={() => void copyDestination()}>
                {copied ? 'Copied' : 'Copy text'}
              </button>
            </div>
            <p className="result__note">
              Shown for review only. QRGuard does not open this destination
              automatically.
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="result result--error" role="alert">
            <div className="result__header">
              <h3>Could not decode</h3>
              <span className="result__badge result__badge--error">Error</span>
            </div>
            <p>{result.error}</p>
            <p className="result__note">
              Use a clearer image, or try one of the demo fixtures in{' '}
              <code>public/demo-fixtures/</code>.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
