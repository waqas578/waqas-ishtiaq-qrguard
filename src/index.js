/**
 * QRGuard entry point (Sprint 1 scaffold).
 * Later parts wire decode → destination preview → risk ranking.
 */

import { createApp } from "./app.js";

const app = createApp();

console.log(`QRGuard scaffold ready (${app.name} v${app.version})`);
console.log("Modules:", Object.keys(app.modules).join(", "));
