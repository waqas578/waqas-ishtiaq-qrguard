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

## Stack (Sprint 1)
- TypeScript + React (Vite)
- Client-side QR decode with [jsQR](https://github.com/cozmo/jsQR)
- Vitest for unit tests

## Current milestone
**Sprint 1 / Session 1** — project skeleton, image upload UI, jsQR decode, and clear destination/error display (no auto-open). Camera scan and risk scoring come in later sessions.

## How to run locally

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/waqas578/waqas-ishtiaq-qrguard.git
cd waqas-ishtiaq-qrguard
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Upload a QR code image to decode its payload.

### Other scripts

```bash
npm test          # unit tests (Vitest)
npm run build     # production build
npm run preview   # serve the production build
npm run lint      # oxlint
```
