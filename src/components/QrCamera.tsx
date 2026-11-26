import { useEffect, useRef, useState } from 'react'
import {
  cameraErrorMessage,
  checkCameraSupport,
  grabVideoFrame,
  startCameraStream,
  stopCameraStream,
} from '../lib/camera'
import { decodeQrFromImageData } from '../lib/decodeQr'
import { DecodedResultPanel } from './DecodedResultPanel'

type CameraStatus = 'idle' | 'starting' | 'scanning' | 'success' | 'error'

export function QrCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const scanningRef = useRef(false)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const support = checkCameraSupport()

  useEffect(() => {
    return () => {
      stopScanLoop()
      stopCameraStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  function stopScanLoop() {
    scanningRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function tick() {
    if (!scanningRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const imageData = grabVideoFrame(video, canvas)
      if (imageData) {
        const decoded = decodeQrFromImageData(imageData)
        if (decoded.ok) {
          scanningRef.current = false
          setPayload(decoded.data)
          setStatus('success')
          setCopied(false)
          // Keep the last frame on screen; stop the live stream.
          stopCameraStream(streamRef.current)
          streamRef.current = null
          if (videoRef.current) {
            videoRef.current.srcObject = null
          }
          return
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  async function startCamera() {
    setError(null)
    setPayload(null)
    setCopied(false)
    setStatus('starting')

    stopScanLoop()
    stopCameraStream(streamRef.current)
    streamRef.current = null

    try {
      const stream = await startCameraStream()
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stopCameraStream(stream)
        streamRef.current = null
        setError('Could not attach the camera preview.')
        setStatus('error')
        return
      }

      video.srcObject = stream
      await video.play()

      scanningRef.current = true
      setStatus('scanning')
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      stopCameraStream(streamRef.current)
      streamRef.current = null
      setError(cameraErrorMessage(err))
      setStatus('error')
    }
  }

  function stopCamera() {
    stopScanLoop()
    stopCameraStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus(payload ? 'success' : 'idle')
  }

  async function copyDestination() {
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const showPreview = status === 'starting' || status === 'scanning'

  return (
    <section className="camera-panel" aria-labelledby="camera-heading">
      <h2 id="camera-heading">Scan with camera</h2>
      <p className="upload-lead">
        Point the camera at a QR code. QRGuard decodes it locally, shows the
        destination and risk rank, and does not open the link for you.
      </p>

      {!support.ok && (
        <div className="result result--error" role="alert">
          <div className="result__header">
            <h3>Camera unavailable</h3>
            <span className="result__badge result__badge--error">Blocked</span>
          </div>
          <p>{support.message}</p>
        </div>
      )}

      {support.ok && (
        <div className="camera-controls">
          {(status === 'idle' || status === 'error' || status === 'success') && (
            <button type="button" className="btn btn--primary" onClick={() => void startCamera()}>
              {status === 'success' ? 'Scan again' : 'Start camera'}
            </button>
          )}
          {(status === 'starting' || status === 'scanning') && (
            <button type="button" className="btn" onClick={stopCamera}>
              Stop camera
            </button>
          )}
        </div>
      )}

      <div className="camera-stage" hidden={!showPreview}>
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview for QR scanning"
        />
        <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
        {status === 'scanning' && (
          <p className="camera-hint" role="status">
            Looking for a QR code…
          </p>
        )}
        {status === 'starting' && (
          <p className="camera-hint" role="status">
            Starting camera…
          </p>
        )}
      </div>

      <div className="status-region" aria-live="polite" aria-atomic="true">
        {status === 'error' && error && (
          <div className="result result--error" role="alert">
            <div className="result__header">
              <h3>Could not use camera</h3>
              <span className="result__badge result__badge--error">Error</span>
            </div>
            <p>{error}</p>
          </div>
        )}

        {payload && (
          <DecodedResultPanel
            payload={payload}
            copied={copied}
            onCopy={() => void copyDestination()}
          />
        )}
      </div>
    </section>
  )
}
