const MYSQL_ENABLED = /^(1|true|yes)$/i.test(
  String(process.env.MYSQL_STORAGE || process.env.USE_MYSQL_STORAGE || '')
);
const MYSQL_BOOTSTRAP_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.MYSQL_BOOTSTRAP_MAX_ATTEMPTS || 20)
);
const MYSQL_BOOTSTRAP_RETRY_MS = Math.max(
  250,
  Number(process.env.MYSQL_BOOTSTRAP_RETRY_MS || 3000)
);

function isRetryableMysqlError(error) {
  return Boolean(error && ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootstrap() {
  if (!MYSQL_ENABLED) {
    require('./server');
    return;
  }

  const mysql = require('mysql2/promise');
  const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'mysql',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'hubmsg',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  for (let attempt = 1; attempt <= MYSQL_BOOTSTRAP_MAX_ATTEMPTS; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_state (
          state_key VARCHAR(191) PRIMARY KEY,
          payload LONGTEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_state (
          session_id VARCHAR(191) NOT NULL,
          category VARCHAR(128) NOT NULL,
          item_key VARCHAR(191) NOT NULL,
          payload LONGTEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (session_id, category, item_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      break;
    } catch (error) {
      if (!isRetryableMysqlError(error) || attempt === MYSQL_BOOTSTRAP_MAX_ATTEMPTS) {
        throw error;
      }
      console.warn(
        `[bootstrap] MySQL not ready at ${process.env.MYSQL_HOST || 'mysql'}:${process.env.MYSQL_PORT || 3306} ` +
        `(attempt ${attempt}/${MYSQL_BOOTSTRAP_MAX_ATTEMPTS}): ${error.code}`
      );
      await delay(MYSQL_BOOTSTRAP_RETRY_MS);
    }
  }

  const [stateRows] = await pool.query('SELECT state_key, payload FROM app_state');
  const stateCache = new Map();
  stateRows.forEach((row) => {
    try {
      stateCache.set(row.state_key, JSON.parse(row.payload));
    } catch (_) { }
  });

  const [authRows] = await pool.query('SELECT session_id, category, item_key, payload FROM auth_state');
  const authCache = new Map();
  authRows.forEach((row) => {
    if (!authCache.has(row.session_id)) {
      authCache.set(row.session_id, { creds: initAuthCreds(), keys: {} });
    }
    const bucket = authCache.get(row.session_id);
    let parsed = null;
    try {
      parsed = JSON.parse(row.payload, BufferJSON.reviver);
    } catch (_) {
      parsed = null;
    }
    if (row.category === 'creds' && row.item_key === 'creds') {
      bucket.creds = parsed || initAuthCreds();
      return;
    }
    if (!bucket.keys[row.category]) {
      bucket.keys[row.category] = {};
    }
    bucket.keys[row.category][row.item_key] = parsed;
  });

  global.__HUBMSG_MYSQL__ = {
    enabled: true,
    pool,
    stateCache,
    authCache
  };

  require('./server');
}

bootstrap().catch((error) => {
  console.error('[bootstrap] MySQL bootstrap failed:', error);
  process.exit(1);
});
