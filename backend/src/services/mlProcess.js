// Boots the Python priority ML service as a child of the Node server, so a
// single `node server.js` (or `npm start`) brings the whole stack up. It's a
// best-effort helper: if Python isn't installed or the service is already
// running, Node keeps working (the ML client falls back to rule-based scoring).

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const env = require('../config/env');

const ML_DIR = path.join(__dirname, '..', '..', '..', 'ml-service');
let child = null;

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(`${url}/health`, { timeout: 1200 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// Try `python` then `python3` / `py` — whichever actually launches uvicorn.
// BUG FIX: spawn() never throws for a missing binary — it returns a child and
// emits 'error' later — so the old loop always "succeeded" on the first name
// and never tried the others. Wait briefly for 'error'/'spawn' on each one.
function trySpawn(bin, args) {
  return new Promise((resolve) => {
    let c;
    try {
      c = spawn(bin, args, { cwd: ML_DIR, stdio: 'ignore', shell: false, windowsHide: true });
    } catch (e) { return resolve(null); }
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    c.once('error', () => done(null));
    c.once('spawn', () => {
      // Started — but a Python without uvicorn/fastapi exits at once.
      const t = setTimeout(() => done(c), 1500);
      c.once('exit', () => { clearTimeout(t); done(null); });
    });
  });
}

async function launch() {
  const port = (env.mlServiceUrl.match(/:(\d+)/) || [, '8000'])[1];
  const args = ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', String(port), '--log-level', 'warning'];
  const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
  for (const bin of candidates) {
    const c = await trySpawn(bin, args);
    if (c) return c;
  }
  return null;
}

async function startMlService(logger) {
  if (!env.mlAutoStart) return;

  // If something is already serving on the ML port, don't spawn a duplicate.
  if (await ping(env.mlServiceUrl)) {
    logger?.info?.(`ML priority service already running at ${env.mlServiceUrl}`);
    return;
  }

  child = await launch();
  if (!child) {
    logger?.warn?.('Could not start Python ML service (python not found) — using rule-based fallback.');
    return;
  }

  // Give uvicorn a few seconds to bind, then report.
  const deadline = Date.now() + 12000;
  const check = async () => {
    if (await ping(env.mlServiceUrl)) {
      logger?.success?.(`ML priority service up at ${env.mlServiceUrl}`);
      return;
    }
    if (Date.now() < deadline) return setTimeout(check, 800);
    logger?.warn?.('ML service did not respond in time — using rule-based fallback until it is up.');
  };
  setTimeout(check, 1500);

  // Clean up the child when Node exits.
  const kill = () => { try { child && child.kill(); } catch (e) { /* ignore */ } };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(0); });
  process.on('SIGTERM', () => { kill(); process.exit(0); });
}

module.exports = { startMlService };
