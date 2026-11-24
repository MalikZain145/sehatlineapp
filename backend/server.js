// SehatLine backend entry point.
// 1) connect DB  2) register models  3) print schema  4) start HTTP + Socket.IO
// It also prints the LAN IP so you can point the Expo app at this machine.

// Hospital time (PKT). Must be set before any Date is created — see
// src/utils/dates.js. Override with APP_TZ if ever deployed elsewhere.
process.env.TZ = process.env.APP_TZ || 'Asia/Karachi';
const os = require('os');
const http = require('http');
const env = require('./src/config/env');
const { connectDB, printSchemas } = require('./src/config/db');
const { startMlService } = require('./src/services/mlProcess');
const logger = require('./src/utils/logger');

// Socket.IO is optional — if it isn't installed yet, the app still runs
// (real-time updates just won't fire until you `npm install`).
let SocketServer = null;
try {
  SocketServer = require('socket.io').Server;
} catch (e) {
  console.log('\x1b[33m[warn] socket.io not installed — real-time disabled. Run: npm install\x1b[0m');
}

// Register all models BEFORE printing schema so they show up.
require('./src/modules/auth/models/User');
require('./src/modules/auth/models/Session');
require('./src/modules/auth/models/PasswordReset');
require('./src/modules/patient/models/Token');
require('./src/modules/patient/models/Counter');
require('./src/modules/patient/models/Appointment');
require('./src/modules/patient/models/Doctor');
require('./src/modules/patient/models/Medicine');
require('./src/modules/patient/models/Order');
require('./src/modules/patient/models/Notification');
require('./src/modules/patient/models/Feedback');
require('./src/modules/patient/models/BloodRequest');
require('./src/modules/patient/models/Prescription');
require('./src/modules/patient/models/Vital');
require('./src/modules/patient/models/LabReport');
require('./src/modules/patient/models/MedReminderLog');
require('./src/modules/patient/models/HealthCamp');
require('./src/modules/patient/models/DoctorFeedback');

const app = require('./src/app');

const c = { cyan: '\x1b[36m', green: '\x1b[32m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m' };

// Find this machine's LAN IPv4 (so a phone on the same Wi-Fi can reach it).
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

async function start() {
  await connectDB();
  printSchemas();

  // Auto-seed the demo data on first start, so a fresh clone / new laptop works
  // with just `npm start` — no separate (and error-prone) `npm run seed`.
  // Idempotent: it only seeds when no staff (admin) account exists yet.
  try {
    const User = require('./src/modules/auth/models/User');
    const alreadySeeded = await User.exists({ role: 'admin' });
    if (!alreadySeeded) {
      console.log('\x1b[36m[seed] Empty database — seeding demo data (staff, doctors, pharmacy & lab)…\x1b[0m');
      const { seedAll } = require('./seed/seed');
      await seedAll();
      console.log('\x1b[32m[seed] ✔ Demo data ready.\x1b[0m');
    }
  } catch (e) {
    console.warn('\x1b[33m[seed] Auto-seed skipped:', e.message, '\x1b[0m');
  }

  // Bring the Python priority ML service up alongside Node (best-effort).
  // Under cluster mode the PRIMARY starts it once, so workers skip it here.
  const cluster = require('cluster');
  if (!cluster.isWorker) startMlService(logger);

  const lanIp = getLanIp();

  // Wrap Express in an HTTP server so Socket.IO can attach to it.
  const server = http.createServer(app);

  // Cap how long a single request may hold a socket (defense-in-depth against
  // slow-loris / hung requests). 60s is generous for OCR/import; normal calls
  // finish in well under a second.
  server.requestTimeout = 60 * 1000;
  server.headersTimeout = 65 * 1000;

  // Real-time layer (only if socket.io is installed).
  if (SocketServer) {
    const io = new SocketServer(server, {
      cors: { origin: '*' }, // open for dev; lock down in production
    });
    app.set('io', io);
    io.on('connection', (socket) => {
      console.log(`${c.gray}[socket] client connected: ${socket.id}${c.reset}`);
      socket.on('disconnect', () => {
        console.log(`${c.gray}[socket] client disconnected: ${socket.id}${c.reset}`);
      });
    });
  }

  // ── Daily backups at 2:00 PM (hospital close), Monday–Saturday (NOT Sunday).
  // Pharmacy → dispensed prescriptions; Laboratory → issued reports. Both write
  // a formatted Excel to backups/<module>/. Cron day-of-week 1-6 = Mon–Sat. ──
  try {
    const cron = require('node-cron');
    const pharmBackup = require('./src/modules/pharmacy/services/backup.service');
    const labBackup = require('./src/modules/laboratory/services/backup.service');
    const AUTO = { name: 'Automatic Backup', email: 'system@sehatline' };
    // '0 14 * * 1-6' → 14:00 on Mon(1)…Sat(6); Sunday(0) is skipped.
    cron.schedule('0 14 * * 1-6', async () => {
      try { const r = await pharmBackup.generateDailyBackup(null, AUTO); console.log(`${c.green}[backup] Pharmacy backup: ${r.fileName} (${r.count} rows)${c.reset}`); }
      catch (e) { console.log(`${c.gray}[backup] Pharmacy failed: ${e.message}${c.reset}`); }
      try { const r = await labBackup.generateDailyBackup(null, AUTO); console.log(`${c.green}[backup] Laboratory backup: ${r.fileName} (${r.count} rows)${c.reset}`); }
      catch (e) { console.log(`${c.gray}[backup] Laboratory failed: ${e.message}${c.reset}`); }
    }, { timezone: 'Asia/Karachi' });
    console.log(`${c.gray}[backup] Pharmacy + Laboratory daily backups scheduled for 14:00 Asia/Karachi (Mon–Sat)${c.reset}`);
  } catch (e) {
    console.log(`${c.gray}[backup] cron not available: ${e.message}${c.reset}`);
  }

  // If the port is momentarily still held (e.g. the previous instance during an
  // admin-triggered restart hasn't released it yet), retry a few times before
  // giving up — instead of crashing with an unhandled EADDRINUSE error.
  let listenAttempts = 0;
  const MAX_LISTEN_ATTEMPTS = 10;
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && listenAttempts < MAX_LISTEN_ATTEMPTS) {
      listenAttempts += 1;
      console.log(`${c.gray}[server] Port ${env.port} busy (attempt ${listenAttempts}/${MAX_LISTEN_ATTEMPTS}) — retrying in 800ms…${c.reset}`);
      setTimeout(() => { try { server.close(); } catch (e) {} server.listen(env.port, '0.0.0.0'); }, 800);
      return;
    }
    if (err && err.code === 'EADDRINUSE') {
      console.error(`\n${c.red || ''}❌ Port ${env.port} is already in use by another process.${c.reset || ''}`);
      console.error(`   Free it, then start again:  (Windows)  netstat -ano | findstr :${env.port}  →  taskkill /PID <pid> /F\n`);
      process.exit(1);
    }
    console.error('[server] listen error:', err);
    process.exit(1);
  });

  const onListening = () => {
    console.log(`${c.green}${'═'.repeat(60)}${c.reset}`);
    console.log(`${c.green}${c.bold}  🚀 SehatLine API running${c.reset}`);
    console.log(`${c.gray}  Local   :${c.reset} http://localhost:${env.port}`);
    console.log(`${c.gray}  Network :${c.reset} ${c.cyan}http://${lanIp}:${env.port}${c.reset}  ${c.gray}(use this in the app on a real phone)${c.reset}`);
    console.log(`${c.gray}  Socket  :${c.reset} ${c.cyan}ws://${lanIp}:${env.port}${c.reset}  ${c.gray}(real-time queue)${c.reset}`);
    console.log(`${c.gray}  Env     :${c.reset} ${env.nodeEnv}`);
    console.log(`${c.gray}  Inactivity logout:${c.reset} ${env.sessionInactivityMinutes} min`);
    console.log(`${c.green}${'═'.repeat(60)}${c.reset}\n`);
  };
  server.on('listening', onListening);
  server.listen(env.port, '0.0.0.0');
}

start();
