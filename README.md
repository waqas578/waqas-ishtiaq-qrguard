# QRGuard: A QR-Code Destination Preview and Website Risk-Ranking Web Application

## Project vision
QR codes often open links immediately, which can hide phishing or other malicious sites. QRGuard is a web app that decodes a QR code, shows the destination URL before you visit, and ranks how safe or risky that website looks so you can decide whether to continue.

## Allocated supervisors
- Ivy Wong
- Beta Yip

## Student
Waqas Ishtiaq  
Module: COMP3000HK Computing Project  
Student ID: 20165616 (HKUSPACE) · 10966127 (University of Plymouth)

## Stack
- TypeScript + React (Vite)
- Client-side QR decode with [jsQR](https://github.com/cozmo/jsQR) (image upload + live camera frames)
- `getUserMedia` camera preview (no extra QR camera library)
- Client-side heuristic risk ranking (no external reputation APIs)
- Vitest for unit tests

## Current milestone
**Sprint 2** — decode via **image upload** or **live camera**, then apply simple local risk signals (http vs https, shorteners, odd schemes, suspicious hosts, and a few other heuristics) and show a **low / medium / high** rank with short reasons. Destinations are displayed only; the app never opens them automatically.

### How risk ranking works
Ranking is entirely on-device. The decoded text is checked for patterns such as:
- **Scheme:** `https` is preferred; `http` raises medium; `javascript:`, `data:`, and similar schemes raise high
- **Shorteners:** known hosts like `bit.ly` / `t.co` (hides the real site)
- **Host clues:** raw IP addresses, punycode (`xn--`), phishing-style keywords, many subdomains
- **Other:** `@` userinfo tricks, odd ports, very long or heavily encoded payloads

This is a teaching heuristic, not a full security scan — always read the destination before visiting.

## How to run locally

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/waqas578/waqas-ishtiaq-qrguard.git
cd waqas-ishtiaq-qrguard
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Upload a QR code image, or use **Start camera** to scan a printed/on-screen code. The app shows the decoded text and a risk rank; it does not navigate away.

### Camera / HTTPS note

Browsers usually allow `getUserMedia` only on **HTTPS** or **localhost**. Desktop demo on `http://localhost:5173` is fine. For a phone on the LAN, plain `http://192.168.x.x` often blocks the camera — use an HTTPS tunnel (e.g. Cloudflare Tunnel / ngrok) or stick to desktop localhost for the viva.

### Quick demo (viva)

1. Run `npm run dev` and open the local URL on the laptop.
2. **Upload path:** drag a file from `public/demo-fixtures/` onto the drop zone (or click to browse).
3. Expected upload results:
   - `url-demo.png` → `https://example.com/qrguard-demo` · **low** risk
   - `text-payload.png` → `QRGuard demo text payload` · **low** (plain text)
   - `mailto-demo.png` → `mailto:demo@example.com` · **medium** (odd scheme)
   - `high-risk-demo.png` → `javascript:alert('QRGuard-demo')` · **high** (dangerous scheme)
   - `no-qr.png` → clear error (“No QR code found…”)
4. **Camera path (laptop):** click **Start camera**, allow permission, point at a fixture on another screen or a printed QR. Confirm destination + risk appear and the link is not opened.
5. **Phone (optional):** only if you have HTTPS (tunnel) or a setup that satisfies the secure-context rule above; otherwise demo camera on the laptop.

### Other scripts

```bash
npm test          # unit tests (Vitest)
npm run build     # production build
npm run preview   # serve the production build
npm run lint      # oxlint
```
