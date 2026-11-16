# QRGuard: A QR-Code Destination Preview and Website Risk-Ranking Web Application

## Project vision
QR codes often open links immediately, which can hide phishing or other malicious sites. QRGuard is a web app that decodes a QR code, shows the destination URL before you visit, and ranks how safe or risky that website looks so you can decide whether to continue.

## Allocated supervisors
- Ivy Wong
- Beta Yip

## Student
Waqas Ishtiaq  
Module: COMP3000HK Computing Project  
Student ID: 20165616 (HKUSPACE) / 10966127 (University of Plymouth)

## Sprint 1 goals
Deliver a minimal end-to-end foundation for QRGuard:

1. **Decode** a QR code into a raw payload string.
2. **Preview** the destination URL (and host) before the user follows it.
3. **Rank** the destination with a simple risk summary so the user can decide whether to continue.

Sprint 1 is split into three gradual commits (this repository):

| Part | Focus | Status |
|------|--------|--------|
| **Part 1** | Project brief, Node package init, empty module skeleton | **This commit** |
| **Part 2** | QR decode + destination URL preview | Planned |
| **Part 3** | Risk-ranking signals + Sprint 1 demo wiring | Planned |

## Repository layout (Part 1)
```
src/
  index.js                 # Entry point (scaffold smoke check)
  app.js                   # Wires modules together
  qr/decoder.js            # QR decode API (stub)
  preview/destination.js   # Destination preview API (stub)
  risk/ranker.js           # Risk ranking API (stub)
package.json
.gitignore
README.md
```

## Run the scaffold
Requires Node.js 18+.

```bash
npm start
```

Expected output confirms the three modules are registered. Feature behaviour arrives in Parts 2 and 3.
