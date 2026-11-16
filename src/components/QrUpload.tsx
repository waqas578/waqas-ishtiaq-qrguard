import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { decodeQrFromFile, type DecodeResult } from '../lib/decodeQr'

type Status = 'idle' | 'decoding' | 'success' | 'error'

export function QrUpload() {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function processFile(file: File) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
    setStatus('decoding')

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

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
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
    inputRef.current?.focus()
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Upload a QR code image</h2>
      <p className="upload-lead">
        Choose a photo of a QR code. QRGuard will decode it and show the
        destination — it will not open the link for you.
      </p>

      <label
        htmlFor={inputId}
        className={`dropzone${dragOver ? ' dropzone--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <span className="dropzone__title">
          {status === 'decoding' ? 'Decoding…' : 'Drop an image here'}
        </span>
        <span className="dropzone__hint">or click to browse PNG, JPEG, WebP, GIF</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          disabled={status === 'decoding'}
        />
      </label>

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

      {status === 'decoding' && (
        <p className="status status--busy" role="status">
          Decoding QR code…
        </p>
      )}

      {result?.ok && (
        <div className="result result--success" role="status">
          <h3>Decoded destination</h3>
          <p className="result__url">{result.data}</p>
          <p className="result__note">
            This URL is shown for review only. QRGuard does not open it
            automatically.
          </p>
        </div>
      )}

      {result && !result.ok && (
        <div className="result result--error" role="alert">
          <h3>Could not decode</h3>
          <p>{result.error}</p>
        </div>
      )}
    </section>
  )
}
