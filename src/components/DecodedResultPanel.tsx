import {
  assessPayloadRisk,
  riskLevelLabel,
  type RiskAssessment,
} from '../lib/riskSignals'

type DecodedResultPanelProps = {
  payload: string
  copied: boolean
  onCopy: () => void
}

/** Shared success panel: destination + risk rank (upload and camera). */
export function DecodedResultPanel({
  payload,
  copied,
  onCopy,
}: DecodedResultPanelProps) {
  const risk: RiskAssessment = assessPayloadRisk(payload)

  return (
    <div className="result result--success" role="status">
      <div className="result__header">
        <h3>Decoded destination</h3>
        <span className="result__badge result__badge--success">Decoded</span>
      </div>
      <p className="result__url">{payload}</p>
      <div className="result__actions">
        <button type="button" className="btn" onClick={onCopy}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>

      <RiskPanel risk={risk} />

      <p className="result__note result__note--warn">
        Do not open this destination automatically. QRGuard only displays the
        decoded text so you can decide whether it is safe to visit.
      </p>
    </div>
  )
}

function RiskPanel({ risk }: { risk: RiskAssessment }) {
  const reasons =
    risk.signals.filter((s) => s.id !== 'https-ok').length > 0
      ? risk.signals.filter((s) => s.id !== 'https-ok')
      : risk.signals

  return (
    <div className={`risk risk--${risk.level}`} aria-label="Risk assessment">
      <div className="risk__header">
        <h4 className="risk__title">Risk rank</h4>
        <span className={`risk__badge risk__badge--${risk.level}`}>
          {riskLevelLabel(risk.level)}
        </span>
      </div>
      <p className="risk__summary">{risk.summary}</p>
      <ul className="risk__reasons">
        {reasons.map((signal) => (
          <li key={signal.id}>{signal.reason}</li>
        ))}
      </ul>
    </div>
  )
}
