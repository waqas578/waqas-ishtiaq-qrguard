import { QrCamera } from './components/QrCamera'
import { QrUpload } from './components/QrUpload'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">COMP3000 · Computing Project</p>
        <h1 className="brand">QRGuard</h1>
        <p className="tagline">
          Decode a QR code, preview the destination, see a simple risk rank, and
          decide before you visit.
        </p>
      </header>

      <main className="main-stack">
        <QrUpload />
        <QrCamera />
      </main>

      <footer className="footer">
        <p>
          Student: Waqas Ishtiaq · Supervisors: Ivy Wong, Beta Yip
        </p>
        <p className="footer__note">
          Sprint 2 — upload or live camera decode, client-side risk signals
          (links are never opened automatically)
        </p>
      </footer>
    </div>
  )
}

export default App
