// MongoDB connection + boot-time terminal reporting.
// On connect it prints: DB name, host, and every registered
// collection/schema so you can SEE the database structure in the terminal.

const mongoose = require('mongoose');
const env = require('./env');

// ---- pretty console helpers (no external deps) ----
const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function line(char = '─', len = 60) {
  return char.repeat(len);
}

async function connectDB() {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(env.mongoUri);

    const { name, host, port } = conn.connection;

    console.log(`\n${c.green}${line('═')}${c.reset}`);
    console.log(`${c.green}${c.bold}  ✅ MongoDB Connected${c.reset}`);
    console.log(`${c.gray}  Database :${c.reset} ${c.cyan}${name}${c.reset}`);
    console.log(`${c.gray}  Host     :${c.reset} ${host}:${port}`);
    console.log(`${c.green}${line('═')}${c.reset}\n`);

    return conn;
  } catch (err) {
    console.error(`\n${c.yellow}❌ MongoDB connection failed:${c.reset} ${err.message}`);
    console.error(`${c.gray}   Check that MongoDB is running and MONGO_URI is correct in .env${c.reset}\n`);
    process.exit(1);
  }
}

// Print all registered Mongoose schemas (fields + types) to the terminal.
// Called after models are loaded so you can verify the DB structure at a glance.
function printSchemas() {
  const models = mongoose.modelNames();
  if (!models.length) return;

  console.log(`${c.cyan}${line('─')}${c.reset}`);
  console.log(`${c.cyan}${c.bold}  DATABASE SCHEMA (registered collections)${c.reset}`);
  console.log(`${c.cyan}${line('─')}${c.reset}`);

  models.forEach((modelName) => {
    const model = mongoose.model(modelName);
    const collection = model.collection.name;
    console.log(`\n  ${c.bold}${c.green}${modelName}${c.reset} ${c.gray}(collection: ${collection})${c.reset}`);

    const paths = model.schema.paths;
    Object.keys(paths).forEach((p) => {
      if (p === '__v') return;
      const type = paths[p].instance || (paths[p].caster && `[${paths[p].caster.instance}]`) || 'Mixed';
      const required = paths[p].isRequired ? `${c.yellow}required${c.reset}` : '';
      console.log(`     ${c.gray}•${c.reset} ${p} ${c.gray}: ${type}${c.reset} ${required}`);
    });
  });

  console.log(`\n${c.cyan}${line('─')}${c.reset}\n`);
}

// Serverless-safe connection (Vercel adapter). Caches the connection across
// function invocations and NEVER process.exit (that would kill the function).
let _cached = global.__sehatline_db;
async function connectDBCached() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!_cached) {
    mongoose.set('strictQuery', true);
    _cached = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      // Serverless: keep a small warm pool and drop dead sockets quickly so a
      // cold/slow connection doesn't stall every request.
      maxPoolSize: 10, minPoolSize: 1, socketTimeoutMS: 20000, maxIdleTimeMS: 60000,
    });
    global.__sehatline_db = _cached;
  }
  await _cached;
  return mongoose.connection;
}

module.exports = { connectDB, printSchemas, connectDBCached };
