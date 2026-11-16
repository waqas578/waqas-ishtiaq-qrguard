import { QrUpload } from './components/QrUpload'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">COMP3000 · Computing Project</p>
        <h1 className="brand">QRGuard</h1>
        <p className="tagline">
          Decode a QR code, preview the destination URL, and decide before you
          visit.
        </p>
      </header>

      <main>
        <QrUpload />
      </main>

      <footer className="footer">
        <p>
          Student: Waqas Ishtiaq · Supervisors: Ivy Wong, Beta Yip
        </p>
        <p className="footer__note">
          Sprint 1 · Session 1 — image upload decode (camera coming next)
        </p>
      </footer>
    </div>
  )
}

export default App
