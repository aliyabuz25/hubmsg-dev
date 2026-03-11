const express = require('express');
const path = require('path');
const fs = require('fs');

const SEND_INTERVAL_MS = parseInt(process.env.SEND_INTERVAL_MS, 10) || 8000;
const REST_BREAK_ENABLED = true;
const REST_BREAK_BASE_MS = parseInt(process.env.REST_BREAK_BASE_MS, 10) || 5000;
const ADAPTIVE_BACKOFF_ENABLED = true;
const MAX_ADAPTIVE_BACKOFF_MS = 60000;
const DEVICE_RATE_WINDOW_MS = parseInt(process.env.DEVICE_RATE_WINDOW_MS, 10) || 60 * 1000;
const DEVICE_BASE_LIMIT_PER_WINDOW = parseInt(process.env.DEVICE_BASE_LIMIT_PER_WINDOW, 10) || 10;
const DEVICE_MIN_LIMIT_PER_WINDOW = parseInt(process.env.DEVICE_MIN_LIMIT_PER_WINDOW, 10) || 4;
const DEVICE_ERROR_WINDOW_MS = parseInt(process.env.DEVICE_ERROR_WINDOW_MS, 10) || 15 * 60 * 1000;
const DEVICE_ERROR_RATE_THRESHOLD = parseFloat(process.env.DEVICE_ERROR_RATE_THRESHOLD || '0.35');
const DEVICE_MIN_ATTEMPTS_FOR_SUSPEND = parseInt(process.env.DEVICE_MIN_ATTEMPTS_FOR_SUSPEND, 10) || 8;
const DEVICE_CONSECUTIVE_ERROR_THRESHOLD = parseInt(process.env.DEVICE_CONSECUTIVE_ERROR_THRESHOLD, 10) || 5;
const DEVICE_ERROR_COOLDOWN_MS = parseInt(process.env.DEVICE_ERROR_COOLDOWN_MS, 10) || 2 * 60 * 1000;
const DEVICE_TEMP_SUSPEND_MS = parseInt(process.env.DEVICE_TEMP_SUSPEND_MS, 10) || 20 * 60 * 1000;
const DEVICE_BAN_SUSPEND_MS = parseInt(process.env.DEVICE_BAN_SUSPEND_MS, 10) || 24 * 60 * 60 * 1000;
const SEND_JITTER_MIN_MS = parseInt(process.env.SEND_JITTER_MIN_MS, 10) || 1000;
const SEND_JITTER_MAX_MS = parseInt(process.env.SEND_JITTER_MAX_MS, 10) || 5000;
const RECIPIENT_COOLDOWN_RAW_MS = parseInt(process.env.RECIPIENT_COOLDOWN_MS, 10);
const RECIPIENT_COOLDOWN_MS = Number.isNaN(RECIPIENT_COOLDOWN_RAW_MS)
  ? 15 * 60 * 1000
  : Math.max(0, Math.min(RECIPIENT_COOLDOWN_RAW_MS, 24 * 60 * 60 * 1000));
const RECIPIENT_DAILY_MAX_RAW = parseInt(process.env.RECIPIENT_DAILY_MAX, 10);
const RECIPIENT_DAILY_MAX = Number.isNaN(RECIPIENT_DAILY_MAX_RAW)
  ? 1
  : Math.max(0, Math.min(RECIPIENT_DAILY_MAX_RAW, 10));
const OWNER_MIN_INTERVAL_MS = parseInt(process.env.OWNER_MIN_INTERVAL_MS, 10) || 30 * 1000;
const OWNER_HOURLY_MAX = parseInt(process.env.OWNER_HOURLY_MAX, 10) || 150;
const OWNER_DAILY_MAX = parseInt(process.env.OWNER_DAILY_MAX, 10) || 1000;
const OWNER_BURST_SIZE = parseInt(process.env.OWNER_BURST_SIZE, 10) || 0;
const OWNER_BURST_PAUSE_MS = parseInt(process.env.OWNER_BURST_PAUSE_MS, 10) || 5 * 60 * 1000;
const OWNER_FAILURE_WINDOW_MS = parseInt(process.env.OWNER_FAILURE_WINDOW_MS, 10) || 10 * 60 * 1000;
const OWNER_FAILURE_MIN_ATTEMPTS = parseInt(process.env.OWNER_FAILURE_MIN_ATTEMPTS, 10) || 20;
const OWNER_FAILURE_RATE_THRESHOLD = parseFloat(process.env.OWNER_FAILURE_RATE_THRESHOLD || '0.75');
const OWNER_PAUSE_MS = parseInt(process.env.OWNER_PAUSE_MS, 10) || 10 * 60 * 1000;
const OWNER_BAN_PAUSE_MS = parseInt(process.env.OWNER_BAN_PAUSE_MS, 10) || 2 * 60 * 60 * 1000;
const RECIPIENT_HISTORY_RETENTION_MS = parseInt(process.env.RECIPIENT_HISTORY_RETENTION_MS, 10) || 7 * 24 * 60 * 60 * 1000;
const AI_GUARD_ENABLED = false;
const AI_GUARD_BLOCK_SCORE = parseInt(process.env.AI_GUARD_BLOCK_SCORE, 10) || 85;
const AI_GUARD_WARN_SCORE = parseInt(process.env.AI_GUARD_WARN_SCORE, 10) || 60;
const AI_GUARD_BASE_DEFER_MS = parseInt(process.env.AI_GUARD_BASE_DEFER_MS, 10) || 60 * 1000;
const AI_GUARD_MAX_DEFER_MS = parseInt(process.env.AI_GUARD_MAX_DEFER_MS, 10) || 30 * 60 * 1000;
const AI_GUARD_CONTENT_WINDOW_MS = parseInt(process.env.AI_GUARD_CONTENT_WINDOW_MS, 10) || 6 * 60 * 60 * 1000;
const AI_GUARD_DISPATCH_LOOKBACK = parseInt(process.env.AI_GUARD_DISPATCH_LOOKBACK, 10) || 80;
const RETRYABLE_SEND_ERROR_BASE_MS = parseInt(process.env.RETRYABLE_SEND_ERROR_BASE_MS, 10) || 20 * 1000;
const RETRYABLE_SEND_ERROR_MAX_MS = parseInt(process.env.RETRYABLE_SEND_ERROR_MAX_MS, 10) || 2 * 60 * 1000;
const MAX_RETRYABLE_SEND_ATTEMPTS = parseInt(process.env.MAX_RETRYABLE_SEND_ATTEMPTS, 10) || 4;
const DISPATCH_SEND_TIMEOUT_MS = parseInt(process.env.DISPATCH_SEND_TIMEOUT_MS, 10) || 90 * 1000;
const SESSION_RESTART_ON_ERROR = true;
const MAX_CONCURRENT_BROWSERS = 25;
const PER_REQUEST_LIMIT = parseInt(process.env.PER_REQUEST_LIMIT, 10) || 2000;
const DISPATCH_SCAN_LIMIT = parseInt(process.env.DISPATCH_SCAN_LIMIT, 10) || 80;
const ISOLATED_DISPATCH_SCAN_LIMIT = parseInt(process.env.ISOLATED_DISPATCH_SCAN_LIMIT, 10) || 100;
const DISPATCH_LOOP_INTERVAL_MS = 1000;
const HISTORY_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const WATCHDOG_INTERVAL_MS = 60 * 1000;
const WEB_SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STUCK_SENDING_THRESHOLD_MS = 2 * 60 * 1000;
const crypto = require('crypto');
const os = require('os');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode');
const ejs = require('ejs');
const PDFDocument = require('pdfkit');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  S_WHATSAPP_NET,
  proto,
  initAuthCreds,
  BufferJSON
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { exec } = require('child_process');

const mysqlRuntime = global.__HUBMSG_MYSQL__ || null;
const isMysqlStorageEnabled = !!(mysqlRuntime && mysqlRuntime.enabled);

console.info(
  `[anti-block] profile active: restBase=${REST_BREAK_BASE_MS}ms jitter=${SEND_JITTER_MIN_MS}-${SEND_JITTER_MAX_MS}ms ` +
  `recipientCooldown=${RECIPIENT_COOLDOWN_MS}ms recipientDailyMax=${RECIPIENT_DAILY_MAX} ` +
  `ownerMinInterval=${OWNER_MIN_INTERVAL_MS}ms ownerHourlyMax=${OWNER_HOURLY_MAX} ownerDailyMax=${OWNER_DAILY_MAX} ` +
  `ownerBurst=${OWNER_BURST_SIZE}/${OWNER_BURST_PAUSE_MS}ms perRequest=${PER_REQUEST_LIMIT}`
);

const BACKUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const backupsGlobalDir = path.join(__dirname, 'backups');
const DEMO_DEVICE_FIXTURES = [
  {
    id: '6281234567890',
    clientId: 'demo-id',
    label: 'Demo Endonezya',
    phone: '6281234567890',
    iso: 'id',
    platform: 'Android',
    owner: 'admin',
    sessionLabel: 'Demo Session ID'
  },
  {
    id: '639171234567',
    clientId: 'demo-ph',
    label: 'Demo Filipinler',
    phone: '639171234567',
    iso: 'ph',
    platform: 'Android',
    owner: 'admin',
    sessionLabel: 'Demo Session PH'
  },
  {
    id: '905551234567',
    clientId: 'demo-tr',
    label: 'Demo Turkiye',
    phone: '905551234567',
    iso: 'tr',
    platform: 'iPhone',
    owner: 'admin',
    sessionLabel: 'Demo Session TR'
  },
  {
    id: '994501234567',
    clientId: 'demo-az',
    label: 'Demo Azerbaycan',
    phone: '994501234567',
    iso: 'az',
    platform: 'Android',
    owner: 'admin',
    sessionLabel: 'Demo Session AZ'
  }
];
const DEMO_CLIENT_IDS = new Set(DEMO_DEVICE_FIXTURES.map((fixture) => fixture.clientId));
const DEMO_SESSION_LABELS = new Set(DEMO_DEVICE_FIXTURES.map((fixture) => fixture.sessionLabel));

function ensureBackupDir() {
  if (!fs.existsSync(backupsGlobalDir)) {
    fs.mkdirSync(backupsGlobalDir, { recursive: true });
  }
}

async function runBackup() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupFolder = path.join(backupsGlobalDir, dateStr, timeStr);

  try {
    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }

    if (isMysqlStorageEnabled) {
      writeJson(path.join(backupFolder, 'metadata.json'), {
        mode: 'mysql',
        createdAt: new Date().toISOString(),
        note: 'Structured data is stored in MySQL; local JSON/session backup skipped.'
      });
    } else {
    // 1. Backup JSON Data Files
      const filesToBackup = [
        usersPath, apiKeysPath, queuePath, ticketsPath,
        sessionsPath, auditPath, loginLogsPath, activityLogPath, recipientRegistryPath
      ];

      filesToBackup.forEach(file => {
        if (fs.existsSync(file)) {
          const dest = path.join(backupFolder, path.basename(file));
          fs.copyFileSync(file, dest);
        }
      });

      // 2. Backup Sessions (Compressed)
      const sessionsDir = path.join(dataDir, 'sessions');
      if (fs.existsSync(sessionsDir)) {
        exec('tar --version', (err) => {
          if (err) {
            console.warn('[backup] tar komandası tapılmadı, sessiyaların arxivlənməsi keçildi.');
            console.log(`[backup] JSON yedəkləmə tamamlandı: ${backupFolder}`);
            return;
          }
          const tarCmd = `tar -czf "${path.join(backupFolder, 'sessions.tar.gz')}" -C "${dataDir}" sessions`;
          exec(tarCmd, (error, stdout, stderr) => {
            if (error) {
              console.error(`[backup] Sessiya yedəkləmə xətası: ${error.message}`);
            } else {
              console.log(`[backup] Yedəkləmə uğurla tamamlandı: ${backupFolder}`);
            }
          });
        });
      } else {
        console.log(`[backup] JSON backup completed at ${backupFolder} (no sessions dir)`);
      }
    }

    // Hourly Health Report (Only from admin sessions)
    const healthReport = generateDetailedSystemReport('HOURLY_HEALTH_CHECK');
    const loggerMeta = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);

    if (loggerMeta) {
      for (const jid of EXTERNAL_LOG_NUMBERS) {
        await loggerMeta.client.sendMessage(jid, { text: healthReport }).catch(() => { });
      }
      console.log('[backup] Hourly health report sent to managers.');
    }

  } catch (err) {
    console.error('[backup] Critical backup error:', err);
  }
}

// Scheduler for Hourly Backup
setInterval(runBackup, BACKUP_INTERVAL_MS);

// Run initial backup on start (delay 10s to let startup finish)
setTimeout(runBackup, 10000);

// Crash Recovery & Graceful Shutdown
async function gracefulShutdown(signal) {
  console.log(`[system] Received ${signal}. Saving state and cleaning up...`);

  logActivity({
    level: 'error',
    type: 'system.shutdown',
    message: `Sistem qapanır: ${signal}`
  });

  persistQueueImmediate();
  persistDispatchLogsImmediate();
  persistPasswordChangeRequestsImmediate();
  persistSessions();
  persistUsersImmediate();

  // Try to close Baileys sockets gracefully
  for (const [id, meta] of clientSessions.entries()) {
    if (meta.client) {
      console.log(`[baileys] Closing connection for ${id}...`);
      try {
        meta.client.end(new Error('Server shutting down'));
      } catch (e) { }
    }
  }

  // Force a quick flush of system logs if possible
  await sendBatchedSystemLogs();

  // Give some time for final logs and network flush
  setTimeout(() => {
    console.log('[system] Cleanup complete. Exiting.');
    process.exit(0);
  }, 1500);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
if (process.platform === 'win32') {
  process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
}

process.on('uncaughtException', (err) => {
  console.error('[system] UNCAUGHT EXCEPTION!', err);
  gracefulShutdown('uncaughtException');
});


process.on('unhandledRejection', (reason, promise) => {
  console.error('[system] Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: keep running or restart. For "service shouldn't crash", we log and keep running if possible, 
  // but if it's critical, we exit(1). By default Node warns. 
  // We'll log it heavily but try to stay alive unless it's fatal.
});



const app = express();
const port = parseInt(process.env.PORT, 10) || 2005;
const ISOLATED_TENANT = process.env.ISOLATED_TENANT || null;

const adminProfile = {
  username: process.env.ADMIN_USERNAME || 'hubmsg-admin',
  apiKey: process.env.ADMIN_API_KEY || 'API-KEY-XXXX'
};

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'datalar');
const refineAdminDistDir = path.join(__dirname, 'theme', 'examples', 'customization-sider', 'dist');
const usersPath = path.join(dataDir, 'users.json');
const apiKeysPath = path.join(dataDir, 'api_keys.json');
const queuePath = path.join(dataDir, 'queue.json');
const ticketsPath = path.join(dataDir, 'tickets.json');
const sessionsPath = path.join(dataDir, 'sessions.json');
const auditPath = path.join(dataDir, 'audit.json');
const loginLogsPath = path.join(dataDir, 'login_logs.json');
const templatesPath = path.join(dataDir, 'templates.json');
const dispatchLogsPath = path.join(dataDir, 'message_dispatch_logs.json');
const mobileAnnouncementsPath = path.join(dataDir, 'mobile_announcements.json');
const passwordChangeRequestsPath = path.join(dataDir, 'password_change_requests.json');
const recipientRegistryPath = path.join(dataDir, 'recipient_registry.json');
const mysqlStateNamespace = path.relative(__dirname, dataDir).replace(/\\/g, '/') || 'datalar';
const MAX_QUEUE_LENGTH = parseInt(process.env.MAX_QUEUE_LENGTH, 10) || 900000;
const MAX_DISPATCH_LOGS = parseInt(process.env.MAX_DISPATCH_LOGS, 10) || 200000;
const MAX_MOBILE_ANNOUNCEMENTS = parseInt(process.env.MAX_MOBILE_ANNOUNCEMENTS, 10) || 5000;
const MAX_PASSWORD_CHANGE_REQUESTS = parseInt(process.env.MAX_PASSWORD_CHANGE_REQUESTS, 10) || 5000;
// const PER_REQUEST_LIMIT = parseInt(process.env.PER_REQUEST_LIMIT, 10) || 900000; // Removed duplicate
const QUEUE_PREVIEW_LIMIT = 200;
const APP_CORS_ALLOWED_ORIGINS = (process.env.APP_CORS_ORIGINS || '*')
  .split(',')
  .map((item) => item.trim())
  .filter((item) => !!item);
const APP_CORS_ALLOW_ALL = APP_CORS_ALLOWED_ORIGINS.includes('*');
const APP_CORS_ALLOWED_HEADERS = 'Content-Type, x-api-key, Authorization, X-Requested-With';
const APP_CORS_ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const BILLING_DUE_DAY = Math.max(1, Math.min(parseInt(process.env.BILLING_DUE_DAY, 10) || 5, 28));
const AGREEMENT_VERSION = '2026-02-27_TR_v1';
const AGREEMENT_TITLE = 'HubMSG Kullanım Sözleşmesi ve Hukuki Taahhüt Metni';
const AGREEMENT_TEXT = `1) KULLANIM AMACI
Bu platform yalnızca yasal, dürüst ve yetkili iletişim amaçları için kullanılacaktır.

2) DOLANDIRICILIK VE SAHTE MESAJ YASAĞI
Kullanıcı; dolandırıcılık, kimlik avı (phishing), sahte ödeme talebi, sahte kampanya, yanıltıcı vaat, sahte kurumsal temsil, tehdit/şantaj veya aldatıcı içerik içeren hiçbir mesajı göndermeyeceğini kabul eder.

3) YASAL SORUMLULUK
Kullanıcı tarafından gönderilen tüm içeriklerden hukuken kullanıcı sorumludur. Platform, hukuka aykırı kullanım tespit ettiğinde hesabı askıya alma, erişimi sonlandırma ve gerekli resmi mercilerle bilgi paylaşma hakkını saklı tutar.

4) VERİ VE KAYIT
Güvenlik ve denetim amacıyla giriş, aktivite, gönderim ve hata kayıtları tutulur. Bu kayıtlar sistem güvenliği, suistimal önleme ve yasal yükümlülüklerin yerine getirilmesi için kullanılabilir.

5) MESAJ GÖNDERİM KURALLARI
Kullanıcı, yalnızca mesaj almaya rıza göstermiş alıcılara mesaj göndereceğini; spam, toplu taciz ve izinsiz pazarlama yapmayacağını kabul eder.

6) HESAP GÜVENLİĞİ
API anahtarı ve hesap erişim bilgilerinin gizliliğinden kullanıcı sorumludur. Şüpheli erişim veya ihlal durumunda kullanıcı derhal yönetime bilgi vermekle yükümlüdür.

7) İMZA BEYANI
Kullanıcı, bu metni okuyup anladığını; aşağıdaki imzanın kendisine ait olduğunu; verdiği kimlik bilgileri ve beyanların doğru olduğunu kabul ve taahhüt eder.

8) YÜRÜRLÜK
Bu metin elektronik ortamda imzalandığı anda yürürlüğe girer ve kullanıcı hesabı için bağlayıcıdır.`;
const agreementsPdfDir = path.join(dataDir, 'legal_agreements_pdf');

function getMysqlStateStorageKey(filePath) {
  const resolvedFilePath = path.resolve(filePath);
  const resolvedDataDir = path.resolve(dataDir);
  const relativePath = path.relative(resolvedDataDir, resolvedFilePath).replace(/\\/g, '/');
  if (!relativePath.startsWith('..') && relativePath !== '') {
    return `${mysqlStateNamespace}:${relativePath}`;
  }
  return `${mysqlStateNamespace}:${path.basename(resolvedFilePath)}`;
}

function persistMysqlStateValue(filePath, data) {
  if (!isMysqlStorageEnabled) return;
  const key = getMysqlStateStorageKey(filePath);
  mysqlRuntime.stateCache.set(key, data);
  mysqlRuntime.pool.query(
    'INSERT INTO app_state (state_key, payload) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP',
    [key, JSON.stringify(data)]
  ).catch((error) => {
    console.error(`[mysql-storage] Failed to persist ${key}:`, error.message);
  });
}

function deleteMysqlStateValue(filePath) {
  if (!isMysqlStorageEnabled) return;
  const key = getMysqlStateStorageKey(filePath);
  mysqlRuntime.stateCache.delete(key);
  mysqlRuntime.pool.query('DELETE FROM app_state WHERE state_key = ?', [key]).catch((error) => {
    console.error(`[mysql-storage] Failed to delete ${key}:`, error.message);
  });
}

function getMysqlAuthCache(sessionId) {
  if (!isMysqlStorageEnabled) {
    return null;
  }
  if (!mysqlRuntime.authCache.has(sessionId)) {
    mysqlRuntime.authCache.set(sessionId, {
      creds: initAuthCreds(),
      keys: {}
    });
  }
  return mysqlRuntime.authCache.get(sessionId);
}

function persistMysqlAuthValue(sessionId, category, itemKey, value) {
  if (!isMysqlStorageEnabled) return;
  const cache = getMysqlAuthCache(sessionId);
  if (category === 'creds') {
    cache.creds = value;
  } else {
    if (!cache.keys[category]) {
      cache.keys[category] = {};
    }
    cache.keys[category][itemKey] = value;
  }
  mysqlRuntime.pool.query(
    'INSERT INTO auth_state (session_id, category, item_key, payload) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP',
    [sessionId, category, itemKey, JSON.stringify(value, BufferJSON.replacer)]
  ).catch((error) => {
    console.error(`[mysql-auth] Failed to persist ${sessionId}/${category}/${itemKey}:`, error.message);
  });
}

function deleteMysqlAuthValue(sessionId, category, itemKey) {
  if (!isMysqlStorageEnabled) return;
  const cache = getMysqlAuthCache(sessionId);
  if (category === 'creds') {
    cache.creds = initAuthCreds();
  } else if (cache.keys[category]) {
    delete cache.keys[category][itemKey];
    if (!Object.keys(cache.keys[category]).length) {
      delete cache.keys[category];
    }
  }
  mysqlRuntime.pool.query(
    'DELETE FROM auth_state WHERE session_id = ? AND category = ? AND item_key = ?',
    [sessionId, category, itemKey]
  ).catch((error) => {
    console.error(`[mysql-auth] Failed to delete ${sessionId}/${category}/${itemKey}:`, error.message);
  });
}

function deleteMysqlAuthSession(sessionId) {
  if (!isMysqlStorageEnabled) return;
  mysqlRuntime.authCache.delete(sessionId);
  mysqlRuntime.pool.query('DELETE FROM auth_state WHERE session_id = ?', [sessionId]).catch((error) => {
    console.error(`[mysql-auth] Failed to delete session ${sessionId}:`, error.message);
  });
}

function createMysqlAuthState(sessionId) {
  const cache = getMysqlAuthCache(sessionId);
  const state = {
    creds: cache.creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        ids.forEach((id) => {
          let value = cache.keys[type] ? cache.keys[type][id] : undefined;
          if (value && type === 'app-state-sync-key') {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          data[id] = value;
        });
        return data;
      },
      set: async (data) => {
        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            const value = data[category][id];
            if (value) {
              persistMysqlAuthValue(sessionId, category, id, value);
            } else {
              deleteMysqlAuthValue(sessionId, category, id);
            }
          }
        }
      }
    }
  };

  return {
    state,
    saveCreds: async () => {
      persistMysqlAuthValue(sessionId, 'creds', 'creds', state.creds);
    }
  };
}

function ensureJson(filePath, fallback) {
  if (isMysqlStorageEnabled) {
    const key = getMysqlStateStorageKey(filePath);
    if (!mysqlRuntime.stateCache.has(key)) {
      persistMysqlStateValue(filePath, fallback);
    }
    return;
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback) {
  if (isMysqlStorageEnabled) {
    ensureJson(filePath, fallback);
    const key = getMysqlStateStorageKey(filePath);
    return mysqlRuntime.stateCache.get(key);
  }
  ensureJson(filePath, fallback);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`[storage] JSON parse failed for ${filePath}:`, error);
    try {
      const backupPath = `${filePath}.corrupt-${Date.now()}.bak`;
      fs.copyFileSync(filePath, backupPath);
      console.error(`[storage] Corrupt file backed up to ${backupPath}`);
    } catch (backupError) {
      console.error(`[storage] Failed to backup corrupt file ${filePath}:`, backupError);
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    } catch (writeError) {
      console.error(`[storage] Failed to reset corrupt file ${filePath}:`, writeError);
    }
    return fallback;
  }
}

function writeJson(filePath, data) {
  if (isMysqlStorageEnabled) {
    persistMysqlStateValue(filePath, data);
    return;
  }
  const payload = JSON.stringify(data, null, 2);
  const tmpPath = `${filePath}.tmp`;
  let fd;
  try {
    fd = fs.openSync(tmpPath, 'w');
    fs.writeSync(fd, payload);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    console.error(`[storage] Failed to write ${filePath}:`, error);
    if (fd) {
      try { fs.closeSync(fd); } catch (_) { }
    }
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (_) { }
  }
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getUsageAgreementHash() {
  return crypto.createHash('sha256').update(`${AGREEMENT_VERSION}\n${AGREEMENT_TEXT}`).digest('hex');
}

function getRequestIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
}

function sanitizeNextPath(rawValue, fallback = '/admin') {
  if (!rawValue) return fallback;
  const candidate = String(rawValue).trim();
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (candidate.startsWith('/legal/agreement')) return fallback;
  if (candidate.includes('\n') || candidate.includes('\r')) return fallback;
  return candidate;
}

function isAgreementAccepted(user) {
  if (!user || !user.agreement) return false;
  const agreement = user.agreement;
  return !!(
    agreement.accepted &&
    agreement.version === AGREEMENT_VERSION &&
    agreement.signedAt &&
    agreement.signatureHash
  );
}

function agreementRequiredApiResponse(res) {
  return res.status(403).json({
    error: 'Kullanım sözleşmesi imzalanmadan API kullanılamaz.',
    code: 'AGREEMENT_REQUIRED'
  });
}

function isAgreementBypassPath(pathValue = '') {
  const raw = pathValue || '';
  return raw.startsWith('/legal/agreement')
    || raw === '/logout'
    || raw.startsWith('/mobile/logout')
    || raw === '/health';
}

function requestPrefersJson(req) {
  const accept = (req.headers.accept || '').toLowerCase();
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const rawPath = req.originalUrl || req.url || '';
  return req.xhr
    || accept.includes('application/json')
    || contentType.includes('application/json')
    || rawPath.startsWith('/admin/')
    || rawPath.startsWith('/api/');
}

function getBillingPeriod(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function ensureUserBillingShape(user) {
  if (!user || typeof user !== 'object') return { lastPaidPeriod: null, lastPaidAt: null };
  if (!user.billing || typeof user.billing !== 'object') {
    user.billing = {};
  }
  if (!Object.prototype.hasOwnProperty.call(user.billing, 'lastPaidPeriod')) {
    user.billing.lastPaidPeriod = null;
  }
  if (!Object.prototype.hasOwnProperty.call(user.billing, 'lastPaidAt')) {
    user.billing.lastPaidAt = null;
  }
  return user.billing;
}

function isBillingExemptUser(user) {
  return !user || user.role === 'admin';
}

function getUserBillingState(user, now = new Date()) {
  const currentPeriod = getBillingPeriod(now);
  if (isBillingExemptUser(user)) {
    return {
      suspended: false,
      dueDay: BILLING_DUE_DAY,
      currentPeriod,
      lastPaidPeriod: currentPeriod
    };
  }

  const billing = ensureUserBillingShape(user);
  const lastPaidPeriod = billing.lastPaidPeriod || null;
  const paymentRequired = now.getDate() >= BILLING_DUE_DAY;
  const suspended = paymentRequired && lastPaidPeriod !== currentPeriod;

  return {
    suspended,
    dueDay: BILLING_DUE_DAY,
    currentPeriod,
    lastPaidPeriod
  };
}

function markUserPaymentReceived(user, atDate = new Date()) {
  if (!user || typeof user !== 'object') return;
  const billing = ensureUserBillingShape(user);
  billing.lastPaidPeriod = getBillingPeriod(atDate);
  billing.lastPaidAt = atDate.toISOString();
}

function billingSuspendedResponse(req, res, user) {
  const billingState = getUserBillingState(user);
  if (!billingState.suspended) return false;

  const errorText = `Ödəniş təsdiqlənmədiyi üçün xidmət müvəqqəti dondurulub. Hər ayın ${billingState.dueDay}-dən sonra ödəniş tələb olunur.`;
  if (requestPrefersJson(req)) {
    res.status(402).json({
      error: errorText,
      code: 'BILLING_SUSPENDED',
      dueDay: billingState.dueDay,
      currentPeriod: billingState.currentPeriod,
      lastPaidPeriod: billingState.lastPaidPeriod
    });
    return true;
  }

  res.status(402).send(`
    <html lang="az">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Xidmət dondurulub</title>
        <style>
          body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
          .card{max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
          h1{font-size:20px;margin:0 0 10px}
          p{color:#475569;line-height:1.55;margin:0 0 8px}
          a{color:#1d4ed8;text-decoration:none}
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Xidmət müvəqqəti dondurulub</h1>
          <p>${errorText}</p>
          <p>Ödəniş təsdiqləndikdən sonra hesab avtomatik aktiv olacaq.</p>
          <p><a href="/logout">Çıxış et</a></p>
        </div>
      </body>
    </html>
  `);
  return true;
}

function maskIdentity(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return '-';
  if (raw.length <= 4) return `${raw[0] || '*'}***`;
  const head = raw.slice(0, 2);
  const tail = raw.slice(-2);
  return `${head}${'*'.repeat(Math.max(1, raw.length - 4))}${tail}`;
}

function parseSignatureDataUrl(signatureData) {
  if (!signatureData || typeof signatureData !== 'string') {
    return null;
  }
  const prefix = 'data:image/png;base64,';
  if (!signatureData.startsWith(prefix)) {
    return null;
  }
  const payload = signatureData.slice(prefix.length);
  if (!payload || payload.length < 100) {
    return null;
  }
  const buffer = Buffer.from(payload, 'base64');
  if (!buffer.length) {
    return null;
  }
  return buffer;
}

function buildAgreementDocumentId(username, entry, index) {
  const payload = [
    username || '',
    entry && entry.signatureHash ? entry.signatureHash : '',
    entry && entry.pdfFile ? entry.pdfFile : '',
    entry && entry.signedAt ? entry.signedAt : '',
    index || 0
  ].join('|');
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 24);
}

function buildAgreementDocumentsForUser(user) {
  if (!user) {
    return [];
  }
  const docs = [];
  const seen = new Set();

  const pushEntry = (entry, index, source) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const pdfFile = entry.pdfFile ? path.basename(entry.pdfFile) : null;
    if (!pdfFile) {
      return;
    }
    const signedAt = entry.signedAt || null;
    const uniqueKey = `${pdfFile}|${signedAt || ''}|${entry.signatureHash || ''}`;
    if (seen.has(uniqueKey)) {
      return;
    }
    seen.add(uniqueKey);

    const pdfPath = path.join(agreementsPdfDir, pdfFile);
    docs.push({
      id: buildAgreementDocumentId(user.username, entry, index),
      title: entry.title || AGREEMENT_TITLE,
      version: entry.version || AGREEMENT_VERSION,
      fullName: entry.fullName || null,
      signedAt,
      signatureHash: entry.signatureHash || null,
      source: source || 'history',
      pdfFile,
      pdfPath,
      pdfAvailable: fs.existsSync(pdfPath)
    });
  };

  if (Array.isArray(user.agreementHistory)) {
    user.agreementHistory.forEach((entry, index) => pushEntry(entry, index, 'history'));
  }
  if (user.agreement) {
    pushEntry(user.agreement, 9999, 'current');
  }

  return docs.sort((a, b) => new Date(b.signedAt || 0).getTime() - new Date(a.signedAt || 0).getTime());
}

function generateAgreementPdf({
  username,
  role,
  fullName,
  signedAt,
  ip,
  userAgent
}) {
  ensureDirExists(agreementsPdfDir);
  const safeUser = (username || 'user').toString().replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `agreement_${safeUser}_${Date.now()}.pdf`;
  const filePath = path.join(agreementsPdfDir, fileName);

  // Mac'te Türkçe karakter destekleyen font yolu
  const ttfPath = '/System/Library/Fonts/Supplemental/Arial.ttf';
  const hasInbuiltFont = fs.existsSync(ttfPath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `${AGREEMENT_TITLE} - ${username}`,
        Author: 'HubMSG Platform'
      }
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Font Ayarı
    if (hasInbuiltFont) {
      doc.font(ttfPath);
    }

    // Header Panel
    doc.rect(0, 0, doc.page.width, 100).fill('#f8fafc');
    doc.fillColor('#0f172a').fontSize(18).text(AGREEMENT_TITLE, 50, 40, {
      align: 'center',
      width: doc.page.width - 100
    });

    doc.moveDown(2.5);

    // Meta-data Table Style
    const startY = doc.y;
    doc.fontSize(9).fillColor('#64748b');
    doc.text(`Sözleşme Sürümü: ${AGREEMENT_VERSION}`, 50, startY);
    doc.text(`Onay Tarihi: ${new Date(signedAt).toLocaleString('tr-TR')}`, 50, startY + 14);
    doc.text(`İmzalayan IP: ${ip || '-'}`, 50, startY + 28);

    doc.text(`Kullanıcı: ${username}`, 350, startY);
    doc.text(`Ad Soyad: ${fullName}`, 350, startY + 14);
    doc.text(`Rol: ${role || 'user'}`, 350, startY + 28);

    doc.moveDown(3);

    // Main Content
    doc.fontSize(10).fillColor('#1e293b').text(AGREEMENT_TEXT, {
      align: 'justify',
      lineGap: 3,
      paragraphGap: 10
    });

    // Signature Section
    if (doc.y > 600) {
      doc.addPage();
    } else {
      doc.moveDown(2);
    }

    const sigY = doc.y;
    doc.rect(50, sigY, 500, 1).fill('#e2e8f0');
    doc.moveDown(1);
    doc.fontSize(11).fillColor('#0f172a').text('ELEKTRONİK ONAY BEYANI', { weight: 'bold' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#475569').text(
      `${fullName} (Kullanıcı: ${username}), bu sözleşme metnini okuduğunu, anladığını ve elektronik ortamda özgür iradesiyle onayladığını kabul ve taahhüt eder. Bu belge dijital olarak imzalanmış olup, ıslak imza ile aynı hukuki geçerliliğe sahiptir.`,
      { align: 'left', lineGap: 2 }
    );

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#94a3b8').text(`Dijital Parmak İzi (User-Agent): ${(userAgent || '-').slice(0, 200)}`, { italic: true });

    doc.end();

    stream.on('finish', () => resolve({ fileName, filePath }));
    stream.on('error', reject);
    doc.on('error', reject);
  });
}

async function signAgreementForUser({
  user,
  fullName,
  ip,
  userAgent
}) {
  const signedAt = new Date().toISOString();
  const agreementHash = getUsageAgreementHash();
  const signatureHash = crypto
    .createHash('sha256')
    .update(`${user.username}|${fullName}|${signedAt}|${ip}|${userAgent}|${AGREEMENT_VERSION}`)
    .digest('hex');
  const pdfInfo = await generateAgreementPdf({
    username: user.username,
    role: user.role,
    fullName,
    signedAt,
    ip,
    userAgent
  });

  const agreementRecord = {
    accepted: true,
    version: AGREEMENT_VERSION,
    title: AGREEMENT_TITLE,
    fullName,
    signedAt,
    ip,
    userAgent,
    agreementHash,
    signatureHash,
    pdfFile: pdfInfo.fileName
  };
  user.agreement = agreementRecord;
  if (!Array.isArray(user.agreementHistory)) {
    user.agreementHistory = [];
  }
  user.agreementHistory.push({
    ...agreementRecord,
    recordedAt: signedAt
  });
  if (user.agreementHistory.length > 50) {
    user.agreementHistory = user.agreementHistory.slice(user.agreementHistory.length - 50);
  }
  persistUsers();

  return {
    signedAt,
    agreementHash,
    signatureHash,
    pdfInfo
  };
}

const callingCodeToIso = {
  1: 'us',
  7: 'ru',
  20: 'eg',
  30: 'gr',
  31: 'nl',
  32: 'be',
  33: 'fr',
  34: 'es',
  36: 'hu',
  39: 'it',
  40: 'ro',
  44: 'gb',
  49: 'de',
  52: 'mx',
  54: 'ar',
  55: 'br',
  61: 'au',
  62: 'id',
  64: 'nz',
  65: 'sg',
  66: 'th',
  81: 'jp',
  82: 'kr',
  84: 'vn',
  90: 'tr',
  91: 'in',
  92: 'pk',
  212: 'ma',
  213: 'dz',
  216: 'tn',
  218: 'ly',
  220: 'gm',
  221: 'sn',
  222: 'mr',
  223: 'ml',
  224: 'gn',
  225: 'ci',
  226: 'bf',
  227: 'ne',
  228: 'tg',
  229: 'bj',
  230: 'mu',
  231: 'lr',
  232: 'sl',
  233: 'gh',
  234: 'ng',
  235: 'td',
  236: 'cf',
  237: 'cm',
  238: 'cv',
  239: 'st',
  240: 'gq',
  241: 'ga',
  242: 'cg',
  243: 'cd',
  244: 'ao',
  245: 'gw',
  246: 'io',
  247: 'ac'
};

Object.assign(callingCodeToIso, {
  248: 'sc',
  249: 'sd',
  250: 'rw',
  251: 'et',
  252: 'so',
  253: 'dj',
  254: 'ke',
  255: 'tz',
  256: 'ug',
  257: 'bi',
  258: 'mz',
  260: 'zm',
  261: 'mg',
  262: 're',
  263: 'zw',
  264: 'na',
  265: 'mw',
  266: 'ls',
  267: 'bw',
  268: 'sz',
  269: 'km',
  290: 'sh',
  291: 'er',
  297: 'aw',
  298: 'fo',
  299: 'gl',
  350: 'gi',
  351: 'pt',
  352: 'lu',
  353: 'ie',
  354: 'is',
  355: 'al',
  356: 'mt',
  357: 'cy',
  358: 'fi',
  359: 'bg',
  370: 'lt',
  371: 'lv',
  372: 'ee',
  373: 'md',
  374: 'am',
  375: 'by',
  376: 'ad',
  377: 'mc',
  378: 'sm',
  380: 'ua',
  381: 'rs',
  382: 'me',
  385: 'hr',
  386: 'si',
  387: 'ba',
  389: 'mk',
  420: 'cz',
  421: 'sk',
  423: 'li',
  500: 'fk',
  501: 'bz',
  502: 'gt',
  503: 'sv',
  504: 'hn',
  505: 'ni',
  506: 'cr',
  507: 'pa',
  508: 'pm',
  509: 'ht',
  591: 'bo',
  592: 'gy',
  593: 'ec',
  594: 'gf',
  595: 'py',
  596: 'mq',
  597: 'sr',
  598: 'uy',
  599: 'cw',
  670: 'tl',
  672: 'nf',
  673: 'bn',
  674: 'nr',
  675: 'pg',
  676: 'to',
  677: 'sb',
  678: 'vu',
  679: 'fj',
  680: 'pw',
  681: 'wf',
  682: 'ck',
  683: 'nu',
  685: 'ws',
  686: 'ki',
  687: 'nc',
  688: 'tv',
  689: 'pf',
  690: 'tk',
  691: 'fm',
  692: 'mh',
  850: 'kp',
  852: 'hk',
  853: 'mo',
  855: 'kh',
  856: 'la',
  880: 'bd',
  886: 'tw',
  960: 'mv',
  961: 'lb',
  962: 'jo',
  963: 'sy',
  964: 'iq',
  965: 'kw',
  966: 'sa',
  967: 'ye',
  968: 'om',
  970: 'ps',
  971: 'ae',
  972: 'il',
  973: 'bh',
  974: 'qa',
  975: 'bt',
  976: 'mn',
  977: 'np',
  992: 'tj',
  993: 'tm',
  994: 'az',
  995: 'ge',
  996: 'kg',
  998: 'uz'
});

// Shared dashboard state (mocked data for admin view)
const dashboardState = {
  lastScanned: new Date().toISOString(),
  sessions: [],
  queuedMessages: [],
  totalMessagesSent: 0,
  maxQueueLength: MAX_QUEUE_LENGTH
};

const activeWebSessions = new Map();
const systemLoopHealth = {
  webSessionCleanup: {
    key: 'webSessionCleanup',
    label: 'Web Sessiya Təmizləmə',
    intervalMs: WEB_SESSION_CLEANUP_INTERVAL_MS,
    running: false,
    overlapCount: 0,
    runCount: 0,
    errorCount: 0,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null
  },
  dispatch: {
    key: 'dispatch',
    label: 'Dispatch Loop',
    intervalMs: DISPATCH_LOOP_INTERVAL_MS,
    running: false,
    overlapCount: 0,
    runCount: 0,
    errorCount: 0,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null
  },
  historyCleanup: {
    key: 'historyCleanup',
    label: 'History Cleanup',
    intervalMs: HISTORY_CLEANUP_INTERVAL_MS,
    running: false,
    overlapCount: 0,
    runCount: 0,
    errorCount: 0,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null
  },
  watchdog: {
    key: 'watchdog',
    label: 'Watchdog',
    intervalMs: WATCHDOG_INTERVAL_MS,
    running: false,
    overlapCount: 0,
    runCount: 0,
    errorCount: 0,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null
  }
};

if (ISOLATED_TENANT) {
  systemLoopHealth.isolatedDispatch = {
    key: 'isolatedDispatch',
    label: 'Isolated Tenant Dispatch',
    intervalMs: 2000,
    running: false,
    overlapCount: 0,
    runCount: 0,
    errorCount: 0,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null
  };
}

function startLoopMeasure(loopKey) {
  const loop = systemLoopHealth[loopKey];
  if (!loop) return Date.now();
  if (loop.running) {
    loop.overlapCount += 1;
  }
  loop.running = true;
  loop.lastRunAt = Date.now();
  return loop.lastRunAt;
}

function finishLoopMeasure(loopKey, startedAt, error = null) {
  const loop = systemLoopHealth[loopKey];
  if (!loop) return;
  const now = Date.now();
  loop.running = false;
  loop.runCount += 1;
  loop.lastDurationMs = Math.max(0, now - (startedAt || now));
  if (error) {
    loop.errorCount += 1;
    loop.lastError = (error && error.message) ? error.message : String(error);
  } else {
    loop.lastError = null;
  }
}

// Session Tracking Middleware
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    const user = req.session.user;
    activeWebSessions.set(req.sessionID, {
      username: user.username,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown',
      ua: req.get('User-Agent') || 'Unknown',
      lastSeen: new Date().toISOString()
    });
  }
  next();
});

// Periodic cleanup of stale web sessions (older than 2. hours)
setInterval(() => {
  const startedAt = startLoopMeasure('webSessionCleanup');
  const now = Date.now();
  try {
    for (const [sid, data] of activeWebSessions.entries()) {
      if (now - new Date(data.lastSeen).getTime() > 15 * 60 * 1000) {
        activeWebSessions.delete(sid);
      }
    }
    finishLoopMeasure('webSessionCleanup', startedAt);
  } catch (error) {
    finishLoopMeasure('webSessionCleanup', startedAt, error);
  }
}, WEB_SESSION_CLEANUP_INTERVAL_MS);

app.get('/admin/login-logs', ensureAdmin, (req, res) => {
  res.json({
    logins: loginLogs,
    activity: activityLog,
    activeSessions: Array.from(activeWebSessions.values())
  });
});

app.get('/admin/detailed-logs', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 1000 : Math.max(1, Math.min(limitRaw, 10000));
  const searchTerm = (req.query.q || '').toString().trim().toLowerCase();
  const fromDate = parseIsoDateValue(req.query.from, false);
  const toDate = parseIsoDateValue(req.query.to, true);
  const sourceFilter = new Set(parseMultiFilterValue(req.query.sources));
  const levelFilter = new Set(parseMultiFilterValue(req.query.levels));
  const ownerFilter = new Set(parseMultiFilterValue(req.query.owners));
  const typeFilter = new Set(parseMultiFilterValue(req.query.types));
  const statusFilter = new Set(parseMultiFilterValue(req.query.statuses));
  const criticalOnly = req.query.critical === '1' || req.query.critical === 'true';

  const combined = [];

  loginLogs.forEach((item, index) => {
    if (!item) return;
    combined.push({
      id: `login_${index}_${item.timestamp || index}`,
      at: item.timestamp || null,
      source: 'login',
      level: item.success ? 'info' : 'warn',
      type: 'auth.login',
      owner: item.username || null,
      status: item.success ? 'success' : 'failed',
      message: `${item.username || 'unknown'} giriş ${item.success ? 'başarılı' : 'başarısız'}`,
      ip: item.ip || null,
      recipient: null,
      deviceId: null,
      nodeId: null,
      error: item.success ? null : 'login_failed',
      meta: {
        country: item.country || null,
        countryCode: item.countryCode || null,
        ua: item.ua || null
      },
      raw: item
    });
  });

  activityLog.forEach((item, index) => {
    if (!item) return;
    combined.push({
      id: `activity_${index}_${item.at || index}`,
      at: item.at || null,
      source: 'activity',
      level: item.level || 'info',
      type: item.type || 'event',
      owner: item.owner || null,
      status: null,
      message: item.message || '',
      ip: item.meta && item.meta.ip ? item.meta.ip : null,
      recipient: item.meta && item.meta.recipient ? item.meta.recipient : null,
      deviceId: item.meta && item.meta.deviceId ? item.meta.deviceId : null,
      nodeId: item.meta && item.meta.nodeId ? item.meta.nodeId : null,
      error: item.level === 'error' ? (item.message || 'error') : null,
      meta: item.meta || null,
      raw: item
    });
  });

  messageDispatchLogs.forEach((item, index) => {
    if (!item) return;
    const status = item.status || 'queued';
    combined.push({
      id: item.id || `dispatch_${index}`,
      at: item.sentAt || item.lastAttempt || item.updatedAt || item.createdAt || null,
      source: 'dispatch',
      level: status === 'hata' ? 'error' : (status === 'iletildi' ? 'info' : 'debug'),
      type: 'message.dispatch',
      owner: item.owner || 'admin',
      status,
      message: item.snippet || '',
      ip: null,
      recipient: item.recipient || null,
      deviceId: item.deviceId || item.clientId || null,
      nodeId: item.nodeId || item.clientId || null,
      error: item.error || null,
      meta: {
        refCode: item.refCode || null,
        nodeLabel: item.nodeLabel || null,
        deviceLabel: item.deviceLabel || null
      },
      raw: item
    });
  });

  const owners = Array.from(new Set(combined.map((entry) => entry.owner).filter(Boolean))).sort();
  const levels = Array.from(new Set(combined.map((entry) => entry.level).filter(Boolean))).sort();
  const sources = Array.from(new Set(combined.map((entry) => entry.source).filter(Boolean))).sort();
  const types = Array.from(new Set(combined.map((entry) => entry.type).filter(Boolean))).sort();
  const statuses = Array.from(new Set(combined.map((entry) => entry.status).filter(Boolean))).sort();

  const filtered = combined
    .filter((entry) => {
      const atDate = entry.at ? new Date(entry.at) : null;
      if (fromDate || toDate) {
        if (!atDate || Number.isNaN(atDate.getTime())) return false;
        if (fromDate && atDate < fromDate) return false;
        if (toDate && atDate > toDate) return false;
      }
      if (sourceFilter.size && !sourceFilter.has(entry.source || '')) return false;
      if (levelFilter.size && !levelFilter.has(entry.level || '')) return false;
      if (ownerFilter.size && !ownerFilter.has(entry.owner || '')) return false;
      if (typeFilter.size && !typeFilter.has(entry.type || '')) return false;
      if (statusFilter.size && !statusFilter.has(entry.status || '')) return false;
      if (criticalOnly) {
        const isCritical = (
          entry.level === 'error' ||
          entry.level === 'warn' ||
          entry.status === 'hata' ||
          entry.status === 'failed' ||
          !!entry.error
        );
        if (!isCritical) return false;
      }
      if (searchTerm) {
        const haystack = [
          entry.id,
          entry.source,
          entry.level,
          entry.type,
          entry.owner,
          entry.status,
          entry.message,
          entry.ip,
          entry.recipient,
          entry.deviceId,
          entry.nodeId,
          entry.error,
          entry.meta ? JSON.stringify(entry.meta) : ''
        ]
          .filter((value) => value != null)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());

  res.json({
    total: filtered.length,
    limit,
    logs: filtered.slice(0, limit),
    filterOptions: {
      sources,
      levels,
      owners,
      types,
      statuses
    }
  });
});


let loginLogs = readJson(loginLogsPath, []);
const MAX_LOGIN_LOGS = 1000;

function persistLoginLogs() {
  if (loginLogs.length > MAX_LOGIN_LOGS) {
    loginLogs = loginLogs.slice(0, MAX_LOGIN_LOGS);
  }
  writeJson(loginLogsPath, loginLogs);
}

// Map of common country codes to flag emojis (simplified)
const countryFlags = {
  'TR': '🇹🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'AZ': '🇦🇿', 'RU': '🇷🇺', 'NL': '🇳🇱'
};

async function logLoginAttempt(req, username, success = true) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown';
  const ua = req.get('User-Agent') || 'Unknown';
  const timestamp = new Date().toISOString();

  let countryCode = 'UNK';
  let countryName = 'Unknown';
  let flag = '🌍';

  // Try to geolocate server-side (timeout quickly to not block login too much)
  if (ip && ip !== '::1' && ip !== '127.0.0.1' && ip !== 'unknown') {
    try {
      // Using native fetch if Node 18+, otherwise requires 'node-fetch'
      // Since we are unsure of environment, wrapping in try/catch for fetch availability
      if (typeof fetch !== 'undefined') {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
        const geo = await geoRes.json();
        if (geo.status === 'success') {
          countryCode = geo.countryCode;
          countryName = geo.country;
          flag = countryFlags[countryCode] || '🏳️';
        }
      }
    } catch (err) {
      // Silent fail on geo lookup
    }
  } else if (ip === '::1' || ip === '127.0.0.1') {
    countryName = 'Localhost';
    countryCode = 'LO';
    flag = '🏠';
  }

  const logEntry = {
    username,
    ip,
    ua,
    country: countryName,
    countryCode,
    flag,
    timestamp,
    success
  };

  loginLogs.unshift(logEntry);
  persistLoginLogs();

  // Also log to general activity
  logActivity({
    type: 'auth.login',
    owner: username,
    message: `${username} giriş denemesi (${success ? 'Başarılı' : 'Başarısız'})`,
    meta: { ip, country: countryCode, success }
  });
}

const queueStatusTotals = {
  queued: 0,
  iletiliyor: 0,
  iletildi: 0,
  hata: 0
};

const queueStatusTotalsByOwner = {};

function getQueueTotalsForOwner(owner) {
  const normalizedOwner = owner || 'admin';
  if (!queueStatusTotalsByOwner[normalizedOwner]) {
    queueStatusTotalsByOwner[normalizedOwner] = { queued: 0, iletiliyor: 0, iletildi: 0, hata: 0 };
  }
  return queueStatusTotalsByOwner[normalizedOwner];
}

function resetQueueStatusTotals() {
  Object.keys(queueStatusTotals).forEach((key) => {
    queueStatusTotals[key] = 0;
  });
  Object.keys(queueStatusTotalsByOwner).forEach((owner) => {
    delete queueStatusTotalsByOwner[owner];
  });
}

function rebuildQueueStatusTotals() {
  resetQueueStatusTotals();
  dashboardState.queuedMessages.forEach((entry) => {
    const status = entry.status || 'queued';
    const owner = entry.owner || 'admin';
    queueStatusTotals[status] = (queueStatusTotals[status] || 0) + 1;
    const totals = getQueueTotalsForOwner(owner);
    totals[status] = (totals[status] || 0) + 1;
  });
  dashboardState.totalMessagesSent = queueStatusTotals.iletildi;
}

function adjustStatusTotals(previousStatus, nextStatus) {
  if (previousStatus) {
    queueStatusTotals[previousStatus] = Math.max(
      0,
      (queueStatusTotals[previousStatus] || 0) - 1
    );
  }
  if (nextStatus) {
    queueStatusTotals[nextStatus] = (queueStatusTotals[nextStatus] || 0) + 1;
  }
}

function adjustOwnerStatusTotals(owner, previousStatus, nextStatus) {
  const totals = getQueueTotalsForOwner(owner);
  if (previousStatus) {
    totals[previousStatus] = Math.max(0, (totals[previousStatus] || 0) - 1);
  }
  if (nextStatus) {
    totals[nextStatus] = (totals[nextStatus] || 0) + 1;
  }
}

function setMessageStatus(entry, nextStatus) {
  const previousStatus = entry.status;
  entry.status = nextStatus;
  adjustStatusTotals(previousStatus, nextStatus);
  adjustOwnerStatusTotals(entry.owner || 'admin', previousStatus, nextStatus);
}

const clientSessions = new Map();
const CLIENT_PREFIX = 'client-';
let clientIndex = 1;
const connectedDevices = [];
const ownerDeviceCursor = {}; // round-robin state per owner
const ownerLastDeviceUsed = new Map();
const deviceHealthById = new Map();
const ownerDispatchHealth = new Map();
const recipientSendHistory = new Map();
const ownerSendHistory = new Map();
const ownerContentFingerprintHistory = new Map();
const ownerAiRiskState = new Map();

function getDayKey(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getOrCreateDeviceHealth(deviceId) {
  if (!deviceHealthById.has(deviceId)) {
    const now = Date.now();
    deviceHealthById.set(deviceId, {
      windowStartedAt: now,
      sentInWindow: 0,
      attemptsWindowStartedAt: now,
      attemptsInWindow: 0,
      totalSent: 0,
      totalFailed: 0,
      consecutiveFailures: 0,
      suspended: false,
      suspendedUntil: null,
      suspendedReason: null,
      lastError: null,
      lastErrorAt: null
    });
  }
  return deviceHealthById.get(deviceId);
}

function resetDeviceWindowsIfNeeded(stats, now) {
  if (now - stats.windowStartedAt >= DEVICE_RATE_WINDOW_MS) {
    stats.windowStartedAt = now;
    stats.sentInWindow = 0;
  }
  if (now - stats.attemptsWindowStartedAt >= DEVICE_ERROR_WINDOW_MS) {
    stats.attemptsWindowStartedAt = now;
    stats.attemptsInWindow = 0;
  }
}

function getDeviceErrorRate(stats) {
  if (!stats.attemptsInWindow) return 0;
  const failedInWindow = Math.max(0, stats.attemptsInWindow - stats.sentInWindow);
  return failedInWindow / stats.attemptsInWindow;
}

function normalizeErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || '';
}

function isBanRelatedError(error) {
  const msg = normalizeErrorMessage(error).toLowerCase();
  return (
    msg.includes('banned') ||
    msg.includes('ban') ||
    msg.includes('blocked') ||
    msg.includes('forbidden') ||
    msg.includes('not-authorized') ||
    msg.includes('unauthorized') ||
    msg.includes('too many requests') ||
    msg.includes('spam')
  );
}

function isInvalidRecipientError(error) {
  const msg = normalizeErrorMessage(error).toLowerCase();
  return (
    msg.includes('geçersiz') ||
    msg.includes('invalid jid') ||
    msg.includes('invalid number') ||
    msg.includes('not on whatsapp') ||
    msg.includes('does not exist') ||
    msg.includes('recipient_daily_limit') ||
    msg.includes('recipient_cooldown')
  );
}

function isRetryableDispatchError(error) {
  const msg = normalizeErrorMessage(error).toLowerCase();
  if (!msg) return true;
  if (isBanRelatedError(msg) || isBlockedRecipientError(msg) || isInvalidRecipientError(msg)) {
    return false;
  }
  return (
    msg === 'unknown' ||
    msg.includes('unknown') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('connection') ||
    msg.includes('closed') ||
    msg.includes('closing') ||
    msg.includes('terminated') ||
    msg.includes('unavailable') ||
    msg.includes('stream errored') ||
    msg.includes('socket') ||
    msg.includes('econnreset') ||
    msg.includes('broken pipe') ||
    msg.includes('not connected') ||
    msg.includes('network') ||
    msg.includes('temporar') ||
    msg.includes('restart required')
  );
}

function getRetryableDispatchDelayMs(entry) {
  const retryCount = Math.max(0, Number(entry.retryCount) || 0);
  const backoffFactor = Math.pow(2, retryCount);
  return Math.min(RETRYABLE_SEND_ERROR_MAX_MS, RETRYABLE_SEND_ERROR_BASE_MS * backoffFactor);
}

function getOrCreateOwnerHealth(owner) {
  const normalizedOwner = owner || 'admin';
  if (!ownerDispatchHealth.has(normalizedOwner)) {
    ownerDispatchHealth.set(normalizedOwner, {
      windowStartedAt: Date.now(),
      attempts: 0,
      failures: 0,
      pausedUntil: null,
      pausedReason: null
    });
  }
  return ownerDispatchHealth.get(normalizedOwner);
}

function resetOwnerWindowIfNeeded(stats, now) {
  if (now - stats.windowStartedAt >= OWNER_FAILURE_WINDOW_MS) {
    stats.windowStartedAt = now;
    stats.attempts = 0;
    stats.failures = 0;
  }
}

function pauseOwnerQueue(owner, reason, durationMs = OWNER_PAUSE_MS) {
  const normalizedOwner = owner || 'admin';
  const stats = getOrCreateOwnerHealth(normalizedOwner);
  stats.pausedUntil = Date.now() + durationMs;
  stats.pausedReason = reason || 'risk_control';
  logActivity({
    level: 'error',
    type: 'owner.queue_paused',
    owner: normalizedOwner,
    message: `Owner queue pause aktiv edildi: ${normalizedOwner} (${stats.pausedReason})`,
    meta: {
      owner: normalizedOwner,
      pausedUntil: stats.pausedUntil
    }
  });
}

function isOwnerQueuePaused(owner) {
  const normalizedOwner = owner || 'admin';
  const stats = getOrCreateOwnerHealth(normalizedOwner);
  if (!stats.pausedUntil) return false;
  if (Date.now() < stats.pausedUntil) return true;
  stats.pausedUntil = null;
  stats.pausedReason = null;
  stats.windowStartedAt = Date.now();
  stats.attempts = 0;
  stats.failures = 0;
  logActivity({
    type: 'owner.queue_resumed',
    owner: normalizedOwner,
    message: `Owner queue pause bitdi: ${normalizedOwner}`,
    meta: { owner: normalizedOwner }
  });
  return false;
}

function registerOwnerDispatchResult(owner, success, error) {
  const normalizedOwner = owner || 'admin';
  const stats = getOrCreateOwnerHealth(normalizedOwner);
  const now = Date.now();
  resetOwnerWindowIfNeeded(stats, now);
  stats.attempts += 1;
  if (!success) {
    stats.failures += 1;
  }

  if (!success && isBanRelatedError(error)) {
    pauseOwnerQueue(normalizedOwner, 'ban_risk_burst', OWNER_BAN_PAUSE_MS);
    return;
  }

  if (stats.attempts >= OWNER_FAILURE_MIN_ATTEMPTS) {
    const failureRate = stats.failures / Math.max(stats.attempts, 1);
    if (failureRate >= OWNER_FAILURE_RATE_THRESHOLD) {
      pauseOwnerQueue(normalizedOwner, 'high_failure_rate', OWNER_PAUSE_MS);
    }
  }
}

function getRecipientKey(owner, recipient) {
  const normalizedOwner = owner || 'admin';
  const normalizedRecipient = (recipient || '').toString().replace(/\D/g, '');
  return `${normalizedOwner}:${normalizedRecipient}`;
}

function canSendToRecipient(owner, recipient, now = Date.now()) {
  const key = getRecipientKey(owner, recipient);
  const dayKey = getDayKey(now);
  const stats = recipientSendHistory.get(key);
  if (!stats) {
    return { ok: true, reason: null, retryAt: null };
  }

  if (RECIPIENT_COOLDOWN_MS > 0 && now - stats.lastSentAt < RECIPIENT_COOLDOWN_MS) {
    return {
      ok: false,
      reason: 'recipient_cooldown',
      retryAt: stats.lastSentAt + RECIPIENT_COOLDOWN_MS
    };
  }

  if (RECIPIENT_DAILY_MAX > 0 && stats.dayKey === dayKey && stats.dailyCount >= RECIPIENT_DAILY_MAX) {
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 0);
    return {
      ok: false,
      reason: 'recipient_daily_limit',
      retryAt: nextDay.getTime()
    };
  }

  return { ok: true, reason: null, retryAt: null };
}

function registerRecipientSend(owner, recipient, now = Date.now()) {
  const key = getRecipientKey(owner, recipient);
  const dayKey = getDayKey(now);
  const stats = recipientSendHistory.get(key) || {
    dayKey,
    dailyCount: 0,
    lastSentAt: 0
  };

  if (stats.dayKey !== dayKey) {
    stats.dayKey = dayKey;
    stats.dailyCount = 0;
  }

  stats.dailyCount += 1;
  stats.lastSentAt = now;
  recipientSendHistory.set(key, stats);
}

function cleanupRecipientHistory(now = Date.now()) {
  for (const [key, stats] of recipientSendHistory.entries()) {
    if (!stats || !stats.lastSentAt || now - stats.lastSentAt > RECIPIENT_HISTORY_RETENTION_MS) {
      recipientSendHistory.delete(key);
    }
  }
}

function getOrCreateOwnerSendHistory(owner) {
  const normalizedOwner = owner || 'admin';
  if (!ownerSendHistory.has(normalizedOwner)) {
    ownerSendHistory.set(normalizedOwner, {
      dayKey: getDayKey(),
      dayCount: 0,
      hourWindowStartedAt: Date.now(),
      hourCount: 0,
      lastSentAt: 0,
      burstCount: 0,
      burstPauseUntil: null
    });
  }
  return ownerSendHistory.get(normalizedOwner);
}

function resetOwnerSendWindowsIfNeeded(stats, now = Date.now()) {
  const dayKey = getDayKey(now);
  if (stats.dayKey !== dayKey) {
    stats.dayKey = dayKey;
    stats.dayCount = 0;
    stats.burstCount = 0;
    stats.burstPauseUntil = null;
  }

  if (now - stats.hourWindowStartedAt >= 60 * 60 * 1000) {
    stats.hourWindowStartedAt = now;
    stats.hourCount = 0;
  }
}

function canSendForOwner(owner, now = Date.now()) {
  const stats = getOrCreateOwnerSendHistory(owner);
  resetOwnerSendWindowsIfNeeded(stats, now);

  if (stats.burstPauseUntil && now < stats.burstPauseUntil) {
    return {
      ok: false,
      reason: 'owner_burst_pause',
      retryAt: stats.burstPauseUntil
    };
  }

  if (OWNER_MIN_INTERVAL_MS > 0 && stats.lastSentAt && now - stats.lastSentAt < OWNER_MIN_INTERVAL_MS) {
    return {
      ok: false,
      reason: 'owner_min_interval',
      retryAt: stats.lastSentAt + OWNER_MIN_INTERVAL_MS
    };
  }

  if (OWNER_HOURLY_MAX > 0 && stats.hourCount >= OWNER_HOURLY_MAX) {
    return {
      ok: false,
      reason: 'owner_hourly_limit',
      retryAt: stats.hourWindowStartedAt + (60 * 60 * 1000)
    };
  }

  if (OWNER_DAILY_MAX > 0 && stats.dayCount >= OWNER_DAILY_MAX) {
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 0);
    return {
      ok: false,
      reason: 'owner_daily_limit',
      retryAt: nextDay.getTime()
    };
  }

  return { ok: true, reason: null, retryAt: null };
}

function registerOwnerSend(owner, now = Date.now()) {
  const stats = getOrCreateOwnerSendHistory(owner);
  resetOwnerSendWindowsIfNeeded(stats, now);
  stats.lastSentAt = now;
  stats.hourCount += 1;
  stats.dayCount += 1;
  stats.burstCount += 1;

  if (OWNER_BURST_SIZE > 0 && stats.burstCount >= OWNER_BURST_SIZE) {
    stats.burstCount = 0;
    stats.burstPauseUntil = now + OWNER_BURST_PAUSE_MS;
  }
}

function cleanupOwnerSendHistory(now = Date.now()) {
  for (const [key, stats] of ownerSendHistory.entries()) {
    if (!stats || !stats.lastSentAt || now - stats.lastSentAt > RECIPIENT_HISTORY_RETENTION_MS) {
      ownerSendHistory.delete(key);
    }
  }
}

function normalizeTextForAi(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '{url}')
    .replace(/[^\p{L}\p{N}\s{}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAiContentFingerprint(value) {
  const normalized = normalizeTextForAi(value);
  if (!normalized) return '';
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 20);
}

function getOwnerContentBucket(owner) {
  const key = owner || 'admin';
  if (!ownerContentFingerprintHistory.has(key)) {
    ownerContentFingerprintHistory.set(key, new Map());
  }
  return ownerContentFingerprintHistory.get(key);
}

function cleanupAiGuardHistory(now = Date.now()) {
  for (const [owner, fpMap] of ownerContentFingerprintHistory.entries()) {
    for (const [fp, item] of fpMap.entries()) {
      if (!item || !item.lastAt || now - item.lastAt > AI_GUARD_CONTENT_WINDOW_MS) {
        fpMap.delete(fp);
      }
    }
    if (!fpMap.size) ownerContentFingerprintHistory.delete(owner);
  }
  for (const [owner, state] of ownerAiRiskState.entries()) {
    if (!state || !state.lastUpdated || now - state.lastUpdated > AI_GUARD_CONTENT_WINDOW_MS) {
      ownerAiRiskState.delete(owner);
    }
  }
}

function registerAiFingerprint(owner, messageText, now = Date.now()) {
  const fp = buildAiContentFingerprint(messageText);
  if (!fp) return;
  const bucket = getOwnerContentBucket(owner);
  const item = bucket.get(fp) || { count: 0, firstAt: now, lastAt: now };
  item.count += 1;
  item.lastAt = now;
  bucket.set(fp, item);
}

function getOwnerRecentDispatchStats(owner, lookback = AI_GUARD_DISPATCH_LOOKBACK) {
  const normalizedOwner = owner || 'admin';
  let attempts = 0;
  let failures = 0;
  let blocked = 0;
  for (let i = messageDispatchLogs.length - 1; i >= 0 && attempts < lookback; i -= 1) {
    const item = messageDispatchLogs[i];
    if (!item || (item.owner || 'admin') !== normalizedOwner) continue;
    const status = item.status || '';
    if (status !== 'iletildi' && status !== 'hata') continue;
    attempts += 1;
    if (status === 'hata') {
      failures += 1;
      if (isBlockedRecipientError(item.error || '')) blocked += 1;
    }
  }
  const failureRate = attempts ? failures / attempts : 0;
  const blockedRate = attempts ? blocked / attempts : 0;
  return { attempts, failures, blocked, failureRate, blockedRate };
}

function evaluateAiGuardRisk(entry, device, now = Date.now()) {
  const owner = entry.owner || 'admin';
  const snippet = (entry.snippet || '').toString();
  const raw = normalizeTextForAi(snippet);
  const fp = buildAiContentFingerprint(raw);
  const reasons = [];
  let score = 0;

  const ownerState = ownerAiRiskState.get(owner) || { bias: 0, lastUpdated: now };
  score += Math.max(0, Number(ownerState.bias) || 0);

  const recent = getOwnerRecentDispatchStats(owner);
  if (recent.attempts >= 10 && recent.failureRate >= 0.2) {
    score += 18;
    reasons.push('high_failure_rate');
  }
  if (recent.attempts >= 10 && recent.blockedRate >= 0.08) {
    score += 28;
    reasons.push('recent_block_pattern');
  }

  if (/https?:\/\//i.test(snippet)) {
    score += 14;
    reasons.push('contains_link');
  }
  if (snippet.length > 420) {
    score += 8;
    reasons.push('long_message');
  }
  const lettersOnly = snippet.replace(/[^A-Za-zƏəİıÖöÜüĞğŞşÇç]/g, '');
  const upperLetters = lettersOnly.replace(/[^A-ZƏİÖÜĞŞÇ]/g, '');
  if (lettersOnly.length >= 40 && upperLetters.length / lettersOnly.length > 0.55) {
    score += 6;
    reasons.push('too_much_uppercase');
  }

  if (fp) {
    const bucket = getOwnerContentBucket(owner);
    const prev = bucket.get(fp);
    if (prev && now - prev.lastAt <= AI_GUARD_CONTENT_WINDOW_MS) {
      if (prev.count >= 5) {
        score += 22;
        reasons.push('content_repeated_heavy');
      } else if (prev.count >= 3) {
        score += 12;
        reasons.push('content_repeated');
      }
    }
  }

  if (device && device.id) {
    const health = getDeviceHealthSnapshot(device.id, owner);
    if (health.suspended) {
      score += 40;
      reasons.push('device_suspended');
    } else if (health.errorRate >= 0.25 || health.consecutiveFailures >= 2) {
      score += 12;
      reasons.push('device_unstable');
    }
  }

  const shouldBlockNow = AI_GUARD_ENABLED && score >= AI_GUARD_BLOCK_SCORE;
  const shouldWarn = AI_GUARD_ENABLED && score >= AI_GUARD_WARN_SCORE;
  const deferMs = Math.min(
    AI_GUARD_MAX_DEFER_MS,
    Math.max(AI_GUARD_BASE_DEFER_MS, Math.floor(AI_GUARD_BASE_DEFER_MS * (1 + score / 100)))
  );

  const nextBias = Math.max(0, shouldBlockNow ? score * 0.2 : score * 0.06);
  ownerAiRiskState.set(owner, { bias: Math.min(30, nextBias), lastUpdated: now });

  return {
    score: Math.round(score),
    reasons,
    shouldWarn,
    shouldBlockNow,
    deferMs
  };
}

function suspendDevice(deviceId, reason, durationMs, owner = 'admin') {
  const stats = getOrCreateDeviceHealth(deviceId);
  const now = Date.now();
  stats.suspended = true;
  stats.suspendedUntil = durationMs ? now + durationMs : null;
  stats.suspendedReason = reason || 'unknown';
  logActivity({
    level: 'error',
    type: 'device.suspended',
    owner,
    message: `Cihaz pasif edildi: ${deviceId} (${stats.suspendedReason})`,
    meta: {
      deviceId,
      suspendedUntil: stats.suspendedUntil,
      consecutiveFailures: stats.consecutiveFailures
    }
  });
}

function isDeviceSuspended(deviceId, owner = 'admin') {
  const stats = getOrCreateDeviceHealth(deviceId);
  if (!stats.suspended) return false;

  if (stats.suspendedUntil && Date.now() >= stats.suspendedUntil) {
    stats.suspended = false;
    stats.suspendedUntil = null;
    stats.suspendedReason = null;
    stats.consecutiveFailures = 0;
    logActivity({
      type: 'device.reactivated',
      owner,
      message: `Cihaz yeniden aktif edildi: ${deviceId}`,
      meta: { deviceId }
    });
    return false;
  }
  return true;
}

function getDynamicLimitForDevice(deviceId, now = Date.now()) {
  const stats = getOrCreateDeviceHealth(deviceId);
  resetDeviceWindowsIfNeeded(stats, now);
  const errorRate = getDeviceErrorRate(stats);
  const scaled = Math.floor(DEVICE_BASE_LIMIT_PER_WINDOW * (1 - Math.min(0.8, errorRate)));
  return Math.max(DEVICE_MIN_LIMIT_PER_WINDOW, scaled);
}

function getDynamicMinIntervalForDevice(deviceId, now = Date.now()) {
  const stats = getOrCreateDeviceHealth(deviceId);
  resetDeviceWindowsIfNeeded(stats, now);
  const errorRate = getDeviceErrorRate(stats);
  const multiplier = 1 + Math.min(2, errorRate * 3) + Math.min(2, stats.consecutiveFailures * 0.2);
  return Math.max(SEND_INTERVAL_MS, Math.floor(SEND_INTERVAL_MS * multiplier));
}

function getSendJitterMs() {
  const minJitter = Math.max(0, SEND_JITTER_MIN_MS);
  const maxJitter = Math.max(minJitter, SEND_JITTER_MAX_MS);
  return minJitter + Math.floor(Math.random() * (maxJitter - minJitter + 1));
}

function isDeviceRateLimited(deviceId, now = Date.now()) {
  const stats = getOrCreateDeviceHealth(deviceId);
  resetDeviceWindowsIfNeeded(stats, now);
  const dynamicLimit = getDynamicLimitForDevice(deviceId, now);
  return stats.sentInWindow >= dynamicLimit;
}

function canDispatchWithDevice(device, now = Date.now()) {
  if (!device) return false;
  if (isDeviceSuspended(device.id, device.owner || 'admin')) return false;
  if (isDeviceRateLimited(device.id, now)) return false;

  const clientId = device.clientId;
  const lastSend = deviceLastSend.get(clientId) || 0;
  const restUntil = deviceRestUntil.get(clientId) || 0;
  const dynamicInterval = getDynamicMinIntervalForDevice(device.id, now);

  if (deviceLocks.has(clientId)) return false;
  if (REST_BREAK_ENABLED && now < restUntil) return false;
  if (now - lastSend < dynamicInterval) return false;
  return true;
}

function registerDeviceDispatchResult(device, success, error) {
  if (!device || !device.id) return;
  const stats = getOrCreateDeviceHealth(device.id);
  const now = Date.now();
  resetDeviceWindowsIfNeeded(stats, now);

  stats.attemptsInWindow += 1;
  if (success) {
    stats.sentInWindow += 1;
    stats.totalSent += 1;
    stats.consecutiveFailures = 0;
    stats.lastError = null;
    stats.lastErrorAt = null;
    return;
  }

  const msg = normalizeErrorMessage(error);
  stats.totalFailed += 1;
  stats.consecutiveFailures += 1;
  stats.lastError = msg || 'unknown';
  stats.lastErrorAt = new Date().toISOString();

  if (isBanRelatedError(error)) {
    suspendDevice(device.id, 'ban_or_block', DEVICE_BAN_SUSPEND_MS, device.owner || 'admin');
    return;
  }

  if (DEVICE_ERROR_COOLDOWN_MS > 0 && stats.consecutiveFailures >= 2) {
    suspendDevice(device.id, 'send_error_cooldown', DEVICE_ERROR_COOLDOWN_MS, device.owner || 'admin');
  }

  const errorRate = getDeviceErrorRate(stats);
  if (
    stats.consecutiveFailures >= DEVICE_CONSECUTIVE_ERROR_THRESHOLD ||
    (stats.attemptsInWindow >= DEVICE_MIN_ATTEMPTS_FOR_SUSPEND && errorRate >= DEVICE_ERROR_RATE_THRESHOLD)
  ) {
    suspendDevice(device.id, 'high_error_rate', DEVICE_TEMP_SUSPEND_MS, device.owner || 'admin');
  }
}

function getDeviceHealthSnapshot(deviceId, owner = 'admin') {
  const now = Date.now();
  const stats = getOrCreateDeviceHealth(deviceId);
  resetDeviceWindowsIfNeeded(stats, now);
  const errorRate = getDeviceErrorRate(stats);
  return {
    suspended: isDeviceSuspended(deviceId, owner),
    suspendedUntil: stats.suspendedUntil,
    suspendedReason: stats.suspendedReason,
    consecutiveFailures: stats.consecutiveFailures,
    errorRate: Number(errorRate.toFixed(3)),
    sentInWindow: stats.sentInWindow,
    dynamicLimit: getDynamicLimitForDevice(deviceId, now),
    dynamicMinIntervalMs: getDynamicMinIntervalForDevice(deviceId, now),
    totalSent: stats.totalSent,
    totalFailed: stats.totalFailed,
    lastError: stats.lastError,
    lastErrorAt: stats.lastErrorAt
  };
}

function deriveIsoFromPhone(phone) {
  if (!phone) {
    return '';
  }
  const digits = phone.toString().replace(/\D/g, '');
  for (let len = 4; len >= 1; len -= 1) {
    if (digits.length >= len) {
      const prefix = digits.slice(0, len);
      if (callingCodeToIso[prefix]) {
        return callingCodeToIso[prefix];
      }
    }
  }
  return '';
}

function deriveJidFromPhone(phone) {
  if (!phone) return null;
  const clean = phone.toString().replace(/\D/g, '');
  if (!clean) return null;
  return `${clean}@s.whatsapp.net`;
}

function serializeSession(session) {
  if (!session) {
    return null;
  }
  return {
    id: session.id,
    label: session.label,
    ready: session.ready,
    status: session.status,
    statusMessage: session.statusMessage,
    qr: session.qr,
    lastQrAt: session.lastQrAt,
    owner: session.owner,
    createdAt: session.createdAt
  };
}

function getClientSummaries() {
  return Array.from(clientSessions.values()).map(serializeSession);
}

function refreshDashboardSessions() {
  dashboardState.sessions = getClientSummaries();
}

function removeDevicesForClient(clientId, { preserveUserDevices = false } = {}) {
  for (let i = connectedDevices.length - 1; i >= 0; i -= 1) {
    if (connectedDevices[i].clientId === clientId) {
      const removed = connectedDevices.splice(i, 1)[0];
      deviceHealthById.delete(removed.id);
      if (!preserveUserDevices && usersStore[removed.owner]) {
        usersStore[removed.owner].devices = usersStore[removed.owner].devices.filter(
          (deviceId) => deviceId !== removed.id
        );
      }
    }
  }

  if (!preserveUserDevices) {
    if (sessionsStore[clientId]) {
      delete sessionsStore[clientId];
      persistSessions();
    }
  }

  persistUsers();
}

function getReadyDevicesForOwner(owner) {
  ensureDemoDevices();
  const normalizedOwner = owner || 'admin';
  const readyDevices = connectedDevices.filter((device) => {
    if (device.owner !== normalizedOwner || !device.ready) {
      return false;
    }
    const sessionMeta = clientSessions.get(device.clientId);
    return sessionMeta && !sessionMeta.restartPromise && !deviceLocks.has(device.clientId);
  });

  const user = usersStore[normalizedOwner];
  if (!user || !Array.isArray(user.devices) || !user.devices.length) {
    return readyDevices;
  }

  const orderMap = new Map();
  user.devices.forEach((deviceId, index) => orderMap.set(deviceId, index));

  return readyDevices
    .slice()
    .sort((a, b) => {
      const aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.label.localeCompare(b.label);
    });
}

function hasActiveDeviceForOwner(owner) {
  ensureDemoDevices();
  const normalizedOwner = owner || 'admin';
  if (isOwnerQueuePaused(normalizedOwner)) {
    return false;
  }
  return connectedDevices.some((device) => {
    if (device.owner !== normalizedOwner || !device.ready) {
      return false;
    }
    const sessionMeta = clientSessions.get(device.clientId);
    if (!sessionMeta || !sessionMeta.ready || sessionMeta.restartPromise) {
      return false;
    }
    return !isDeviceSuspended(device.id, normalizedOwner);
  });
}

async function attachClientToSession(meta) {
  if (!meta || deviceLocks.has(meta.id)) return;
  deviceLocks.add(meta.id);

  const logger = pino({ level: 'silent' });
  const sessionDir = path.join(dataDir, 'sessions', meta.id);

  try {
    const { state, saveCreds } = isMysqlStorageEnabled
      ? createMysqlAuthState(meta.id)
      : await useMultiFileAuthState(sessionDir);
    let version = global.cachedBaileysVersion || [2, 3000, 1015901307]; // Fallback or global cached version
    // Versiyanı asinxron olaraq arxa planda yeniləyirik (QR koda 5 saniyə gecikmə verməsin deyə)
    fetchLatestBaileysVersion().then(latest => {
      if (latest && latest.version) {
        global.cachedBaileysVersion = latest.version;
      }
    }).catch(() => { });

    console.log(`[baileys] ${meta.id} başladılır (v${version.join('.')})...`);

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ['HubMSG-AZ', 'Desktop', '1.0.0'],
      connectTimeoutMs: 90000,
      defaultQueryTimeoutMs: 90000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 2000,
      maxRetries: 20,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      shouldSyncHistoryMessage: () => false, // Minimize load, don't sync history
      options: {
        timeout: 90000
      }
    });

    meta.client = sock;
    meta.status = 'initializing';
    meta.statusMessage = 'Sistem hazırlanır...';
    meta.lastUpdated = Date.now();
    refreshDashboardSessions();

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log(`[baileys] ${meta.id} update:`, JSON.stringify({ connection, qr: !!qr }));

      if (connection === 'connecting') {
        meta.ready = false;
        meta.status = 'initializing';
        meta.statusMessage = 'Bağlantı qurulur...';
        meta.lastUpdated = Date.now();
        refreshDashboardSessions();
      }

      if (qr) {
        meta.ready = false;
        meta.status = 'qr';
        meta.statusMessage = 'Bağlanmaq üçün QR kodu skan edin';
        meta.lastQrAt = Date.now();
        try {
          meta.qr = await QRCode.toDataURL(qr, { margin: 1, width: 330 });
          console.log(`[baileys] ${meta.id} üçün QR kod yaradıldı.`);
        } catch (err) {
          console.error(`[baileys] ${meta.id} QR kod xətası:`, err);
          meta.qr = null;
        }
        meta.lastUpdated = Date.now();
        refreshDashboardSessions();
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message;

        console.log(`[baileys] ${meta.id} bağlantısı kəsildi. Səbəb: ${statusCode} (${reason})`);

        const shouldReconnect = !meta.deleted &&
          clientSessions.has(meta.id) &&
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== DisconnectReason.forbidden;

        meta.ready = false;
        meta.qr = null;
        meta.status = 'disconnected';
        meta.statusMessage = shouldReconnect ? 'Yenidən bağlanır...' : 'Oturum sonlandırıldı';
        meta.lastUpdated = Date.now();
        refreshDashboardSessions();

        if (startupLogContext.active && startupLogContext.results[meta.id] && startupLogContext.results[meta.id].status === 'pending') {
          if (!shouldReconnect) {
            startupLogContext.results[meta.id].status = 'failed';
            startupLogContext.results[meta.id].error = reason || `Code: ${statusCode}`;
            checkStartupComplete();
          }
          // If shouldReconnect is true, we don't mark as failed yet, we wait for the next attempt or timeout
        }

        if (shouldReconnect) {
          const delay = Math.min(60000, 5000 * (meta.reconnectCount || 1));
          meta.reconnectCount = (meta.reconnectCount || 0) + 1;

          console.log(`[baileys] ${meta.id} ${delay / 1000} saniyə sonra yenidən qoşulacaq (Səbəb: ${statusCode}, Cəhd: ${meta.reconnectCount})`);
          setTimeout(() => {
            if (meta.deleted || !clientSessions.has(meta.id)) {
              console.log(`[baileys] ${meta.id} silindiyi üçün yenidən qoşulma ləğv edildi.`);
              return;
            }
            deviceLocks.delete(meta.id);
            attachClientToSession(meta);
          }, delay);
        } else {
          console.log(`[baileys] ${meta.id} oturumu birdəfəlik bağlandı (Səbəb: ${statusCode || 'Naməlum'}).`);
          if (meta.heartbeatInterval) clearInterval(meta.heartbeatInterval);
          removeDevicesForClient(meta.id);
          if (isMysqlStorageEnabled) {
            deleteMysqlAuthSession(meta.id);
          } else {
            try {
              if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
              }
            } catch (e) { }
          }
          clientSessions.delete(meta.id);
          deviceLocks.delete(meta.id);
        }
        refreshDashboardSessions();
      } else if (connection === 'open') {
        console.log(`[baileys] ${meta.id} bağlantısı açıldı.`);
        deviceLocks.delete(meta.id);
        meta.ready = true;
        meta.status = 'ready';
        meta.statusMessage = 'Sistem hazır vəziyyətdədir';
        meta.qr = null;
        meta.reconnectCount = 0;
        meta.lastUpdated = Date.now();

        const userJid = sock.user.id.split(':')[0];
        registerDevice({
          wid: { user: userJid },
          pushname: sock.user.name || 'WhatsApp Cihazı',
          me: { name: { displayName: sock.user.name } },
          platform: 'Baileys'
        }, meta.id);

        refreshDashboardSessions();

        if (startupLogContext.active && startupLogContext.results[meta.id] && startupLogContext.results[meta.id].status === 'pending') {
          startupLogContext.results[meta.id].status = 'ready';
          startupLogContext.results[meta.id].jid = userJid;
          checkStartupComplete();
        }

        // Infrastructure: Heartbeat to keep connection alive
        if (meta.heartbeatInterval) clearInterval(meta.heartbeatInterval);
        meta.heartbeatInterval = setInterval(async () => {
          if (meta.ready && meta.client) {
            try {
              // Lightweight query to check connection health
              await meta.client.query({
                tag: 'iq',
                attrs: {
                  to: S_WHATSAPP_NET,
                  type: 'get',
                  xmlns: 'w:p',
                },
                content: [{ tag: 'ping', attrs: {} }]
              }).catch(() => { });
              meta.lastHeartbeat = Date.now();
            } catch (e) {
              console.warn(`[infra] ${meta.id} heartbeat failed:`, e.message);
            }
          }
        }, 5 * 60 * 1000); // Every 5 minutes
      }
    });

    sock.ev.on('messages.upsert', () => { });

    // Infrastructure: Ignore large history syncs but log for awareness
    sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }) => {
      console.log(`[infra] ${meta.id} messaging history sync: ${chats.length} chats, ${contacts.length} contacts, ${messages.length} messages. isLatest: ${isLatest}`);
      ingestContactsToRecipientRegistry(meta.owner || 'admin', contacts || []);
    });
  } catch (err) {
    console.error(`[baileys] ${meta.id} başlatılarkən kritik xəta:`, err);
    deviceLocks.delete(meta.id);
  }
}

function createClientSession(label = `Cihaz ${clientIndex}`, sessionId, owner = 'admin') {
  const id = sessionId || `${CLIENT_PREFIX}${crypto.randomBytes(3).toString('hex')}`;
  const meta = {
    id,
    label,
    ready: false,
    status: 'initializing',
    statusMessage: null,
    qr: null,
    lastQrAt: null,
    lastUpdated: Date.now(),
    createdAt: new Date().toISOString(),
    client: null,
    restartPromise: null,
    owner: owner || 'admin'
  };
  clientSessions.set(id, meta);

  // Persist session metadata
  sessionsStore[id] = {
    id,
    label: meta.label,
    owner: meta.owner,
    createdAt: meta.createdAt
  };
  persistSessions();

  logActivity({
    type: 'session.created',
    owner: meta.owner,
    message: `Yeni WhatsApp sessiyası yaradıldı: ${meta.id}`,
    meta: { sessionId: meta.id }
  });
  attachClientToSession(meta);
  clientIndex += 1;
  refreshDashboardSessions();
  return meta;
}

async function restartClientSession(sessionId) {
  const meta = clientSessions.get(sessionId);
  if (!meta) {
    throw new Error('Cihaz tapılmadı');
  }
  if (meta.restartPromise) {
    return meta.restartPromise;
  }

  const restartPromise = (async () => {
    meta.ready = false;
    meta.status = 'restarting';
    meta.statusMessage = 'Yenidən başlatılır';
    meta.lastUpdated = Date.now();
    refreshDashboardSessions();

    if (meta.client) {
      if (meta.heartbeatInterval) clearInterval(meta.heartbeatInterval);
      try {
        meta.client.end();
      } catch (e) { }
      meta.client = null;
    }

    removeDevicesForClient(sessionId, { preserveUserDevices: true });
    attachClientToSession(meta);
    logActivity({
      type: 'session.restarted',
      owner: meta.owner || 'admin',
      message: `WhatsApp sessiyası yeniləndi: ${meta.id}`,
      meta: { sessionId: meta.id }
    });
    refreshDashboardSessions();
    return meta;
  })();

  meta.restartPromise = restartPromise;
  restartPromise.finally(() => {
    if (meta.restartPromise === restartPromise) {
      meta.restartPromise = null;
    }
  });

  return restartPromise;
}

function deleteClientSession(sessionId, { removeSessionDir = true } = {}) {
  const meta = clientSessions.get(sessionId);
  if (!meta) {
    throw new Error('Cihaz tapılmadı');
  }

  meta.deleted = true;
  meta.ready = false;
  meta.status = 'disconnected';
  meta.statusMessage = 'Oturum silindi';
  meta.qr = null;
  meta.lastUpdated = Date.now();

  if (meta.client) {
    try {
      meta.client.end(new Error('Session removed by user'));
    } catch (e) { }
    meta.client = null;
  }

  removeDevicesForClient(sessionId);
  clientSessions.delete(sessionId);
  deviceLocks.delete(sessionId);

  if (removeSessionDir) {
    if (isMysqlStorageEnabled) {
      deleteMysqlAuthSession(sessionId);
    } else {
      const sessionDir = path.join(dataDir, 'sessions', sessionId);
      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) { }
    }
  }

  logActivity({
    type: 'session.deleted',
    owner: meta.owner || 'admin',
    message: `WhatsApp sessiyası silindi: ${meta.id}`,
    meta: { sessionId: meta.id }
  });

  refreshDashboardSessions();
  return meta;
}

function findReadyDeviceForEntry(entry) {
  const owner = entry.owner || 'admin';
  if (isOwnerQueuePaused(owner)) {
    return null;
  }
  // Get connected and generally ready devices
  let candidates = getReadyDevicesForOwner(owner);
  const now = Date.now();

  const isAutomatic = !entry.deviceId || entry.deviceId === 'automatic';

  if (!isAutomatic) {
    const preferred = candidates.find((device) => device.id === entry.deviceId);
    if (preferred && canDispatchWithDevice(preferred, now)) {
      return preferred;
    }
  }

  if (!candidates.length) {
    return null;
  }

  candidates = candidates.filter((device) => canDispatchWithDevice(device, now));

  if (!candidates.length) return null; // No device is ready right now

  const cursorKey = owner || 'admin';
  const cursor = ownerDeviceCursor[cursorKey] || 0;
  const lastUsedDeviceId = ownerLastDeviceUsed.get(cursorKey) || null;
  const orderMap = new Map();
  candidates.forEach((device, index) => orderMap.set(device.id, index));

  // Prevent back-to-back dispatch from the same device for the same owner when alternatives exist.
  let balancedCandidates = candidates;
  if (balancedCandidates.length > 1 && lastUsedDeviceId) {
    const alternatives = balancedCandidates.filter((device) => device.id !== lastUsedDeviceId);
    if (alternatives.length) {
      balancedCandidates = alternatives;
    }
  }

  // Prefer lower load devices to reduce single-number pressure and ban risk.
  const sortedCandidates = balancedCandidates
    .slice()
    .sort((a, b) => {
      const aHealth = getOrCreateDeviceHealth(a.id);
      const bHealth = getOrCreateDeviceHealth(b.id);
      const aWindowLoad = aHealth.sentInWindow || 0;
      const bWindowLoad = bHealth.sentInWindow || 0;
      if (aWindowLoad !== bWindowLoad) {
        return aWindowLoad - bWindowLoad;
      }
      const aLastSent = deviceLastSend.get(a.clientId) || 0;
      const bLastSent = deviceLastSend.get(b.clientId) || 0;
      if (aLastSent !== bLastSent) {
        return aLastSent - bLastSent;
      }
      const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

  const selected = sortedCandidates[cursor % sortedCandidates.length];
  ownerDeviceCursor[cursorKey] = (cursor + 1) % 1000; // Keep it bounded
  ownerLastDeviceUsed.set(cursorKey, selected.id);

  return selected;
}

function hasReadySession() {
  return Array.from(clientSessions.values()).some((session) => session.ready);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

let usersStore = readJson(usersPath, {});
let apiKeysStore = readJson(apiKeysPath, {});
let sessionsStore = readJson(sessionsPath, {});
let auditStore = readJson(auditPath, { jid: null, enabled: false });
const persistedQueue = readJson(queuePath, []);
let messageDispatchLogs = readJson(dispatchLogsPath, []);
let ticketsStore = readJson(ticketsPath, []);
let templatesStore = readJson(templatesPath, []);
let mobileAnnouncementsStore = readJson(mobileAnnouncementsPath, []);
let passwordChangeRequestsStore = readJson(passwordChangeRequestsPath, []);
let recipientRegistryStore = readJson(recipientRegistryPath, {});

if (!recipientRegistryStore || typeof recipientRegistryStore !== 'object' || Array.isArray(recipientRegistryStore)) {
  recipientRegistryStore = {};
}
const dispatchLogIndexById = new Map();

function rebuildDispatchLogIndex() {
  dispatchLogIndexById.clear();
  messageDispatchLogs.forEach((log, index) => {
    if (log && log.id) {
      dispatchLogIndexById.set(log.id, index);
    }
  });
}

rebuildDispatchLogIndex();

if (!Array.isArray(mobileAnnouncementsStore)) {
  mobileAnnouncementsStore = [];
}
if (!Array.isArray(passwordChangeRequestsStore)) {
  passwordChangeRequestsStore = [];
}

if ((!Array.isArray(messageDispatchLogs) || messageDispatchLogs.length === 0) && Array.isArray(persistedQueue) && persistedQueue.length) {
  const seedTime = Date.now();
  messageDispatchLogs = persistedQueue.map((entry, index) => ({
    id: entry.logId || `legacy-${seedTime}-${index}`,
    refCode: entry.refCode || null,
    owner: entry.owner || 'admin',
    label: entry.label || null,
    recipient: entry.recipient || null,
    normalizedRecipient: entry.normalizedRecipient || null,
    snippet: entry.snippet || '',
    status: entry.status || 'queued',
    error: entry.error || null,
    createdAt: entry.createdAt || null,
    sentAt: entry.sentAt || null,
    lastAttempt: entry.lastAttempt || null,
    deviceId: entry.deviceId || null,
    deviceLabel: null,
    clientId: entry.clientId || null,
    nodeId: entry.clientId || null,
    nodeLabel: null,
    updatedAt: new Date().toISOString()
  }));
  trimDispatchLogsIfNeeded();
  rebuildDispatchLogIndex();
  writeJson(dispatchLogsPath, messageDispatchLogs);
}

const tenantQueuesDir = path.join(dataDir, 'tenant_queues');
if (!fs.existsSync(tenantQueuesDir)) {
  fs.mkdirSync(tenantQueuesDir, { recursive: true });
}

function getTenantQueuePath(owner) {
  return path.join(tenantQueuesDir, `${owner}.json`);
}

function enqueueIsolatedMessage(owner, entry) {
  try {
    const qPath = getTenantQueuePath(owner);
    const queue = readJson(qPath, []);
    queue.push(entry);
    writeJson(qPath, queue);
    console.log(`[Isolated Queue] Enqueued msg for tenant: ${owner}`);
  } catch (err) {
    console.error(`[Isolated Queue] Error enqueuing for ${owner}:`, err);
    // Fallback? or just log.
  }
}


const externalLogBuffer = [];
let externalLogInterval = null;

if (!usersStore.admin) {
  usersStore.admin = {
    username: 'admin',
    role: 'admin',
    apiKey: adminProfile.apiKey,
    devices: [],
    deviceLimit: null,
    billing: {
      lastPaidPeriod: getBillingPeriod(new Date()),
      lastPaidAt: new Date().toISOString()
    },
    agreement: null,
    agreementHistory: []
  };
  apiKeysStore[adminProfile.apiKey] = 'admin';
}

if (!Array.isArray(usersStore.admin.devices)) {
  usersStore.admin.devices = [];
}
for (const fixture of DEMO_DEVICE_FIXTURES) {
  if (!usersStore.admin.devices.includes(fixture.id)) {
    usersStore.admin.devices.push(fixture.id);
  }
}

adminProfile.apiKey = usersStore.admin.apiKey;
apiKeysStore[adminProfile.apiKey] = 'admin';

writeJson(usersPath, usersStore);
writeJson(apiKeysPath, apiKeysStore);
dashboardState.queuedMessages = persistedQueue;

function cleanupStuckMessages(queue) {
  let fixedCount = 0;
  queue.forEach(m => {
    if (m.status === 'iletiliyor') {
      m.status = 'queued';
      fixedCount++;
    }
  });
  if (fixedCount > 0) {
    console.log(`[cleanup] ${fixedCount} stuck messages reset to queued.`);
  }
}

// Cleanup global queue
cleanupStuckMessages(dashboardState.queuedMessages);

// If isolated, cleanup isolated queue too
if (ISOLATED_TENANT) {
  const qPath = getTenantQueuePath(ISOLATED_TENANT);
  if (fs.existsSync(qPath)) {
    const q = readJson(qPath, []);
    cleanupStuckMessages(q);
    writeJson(qPath, q);
  }
}

rebuildQueueStatusTotals();

Object.values(usersStore).forEach((user) => {
  if (!Array.isArray(user.devices)) {
    user.devices = [];
  }
  if (!Object.prototype.hasOwnProperty.call(user, 'deviceLimit')) {
    user.deviceLimit = null;
  }
  if (!Object.prototype.hasOwnProperty.call(user, 'passwordHash')) {
    user.passwordHash = null;
  }
  if (!Object.prototype.hasOwnProperty.call(user, 'agreement')) {
    user.agreement = null;
  }
  if (!Array.isArray(user.agreementHistory)) {
    user.agreementHistory = [];
  }
  ensureUserBillingShape(user);
});
writeJson(usersPath, usersStore);

function normalizeDeviceLimit(value) {
  if (value == null) {
    return null;
  }
  const limitValue = typeof value === 'number' ? value : parseInt(value, 10);
  if (Number.isNaN(limitValue) || limitValue < 0) {
    return null;
  }
  return limitValue;
}

function persistAudit() {
  writeJson(auditPath, auditStore);
}
function hashPassword(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateDealerPassword() {
  return crypto.randomBytes(5).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

function verifyDealerPassword(user, password) {
  if (!user || !user.passwordHash || !password) {
    return false;
  }
  return user.passwordHash === hashPassword(password);
}

function getUserDeviceCount(username) {
  const user = usersStore[username];
  if (!user) {
    return 0;
  }
  return Array.isArray(user.devices) ? user.devices.length : 0;
}

function getUserDeviceLimit(username) {
  const user = usersStore[username];
  if (!user) {
    return null;
  }
  return normalizeDeviceLimit(user.deviceLimit);
}

function resolveUsername(username) {
  if (!username) {
    return null;
  }
  const normalized = username.toString().trim();
  if (!normalized) {
    return null;
  }
  if (usersStore[normalized]) {
    return normalized;
  }
  const lower = normalized.toLowerCase();
  const match = Object.keys(usersStore).find((key) => key.toLowerCase() === lower);
  return match || null;
}

function canAssignDeviceToUser(username) {
  if (!username) {
    return false;
  }
  const user = usersStore[username];
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  const limit = getUserDeviceLimit(username);
  if (limit === null) {
    return true;
  }
  return getUserDeviceCount(username) < limit;
}

function listDealers() {
  return Object.values(usersStore)
    .filter((user) => user.role === 'dealer')
    .map((dealer) => ({
      username: dealer.username,
      deviceLimit: getUserDeviceLimit(dealer.username),
      deviceCount: getUserDeviceCount(dealer.username),
      billing: getUserBillingState(dealer),
      devices: Array.isArray(dealer.devices) ? dealer.devices.slice() : []
    }));
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function persistUsersImmediate() {
  writeJson(usersPath, usersStore);
}
const persistUsers = debounce(persistUsersImmediate, 2000);

function persistApiKeys() {
  writeJson(apiKeysPath, apiKeysStore);
}

function persistQueueImmediate() {
  writeJson(queuePath, dashboardState.queuedMessages);
}
const persistQueue = debounce(persistQueueImmediate, 2000);

function trimDispatchLogsIfNeeded() {
  if (messageDispatchLogs.length <= MAX_DISPATCH_LOGS) {
    return;
  }
  const excess = messageDispatchLogs.length - MAX_DISPATCH_LOGS;
  messageDispatchLogs.splice(0, excess);
  rebuildDispatchLogIndex();
}

function persistDispatchLogsImmediate() {
  trimDispatchLogsIfNeeded();
  writeJson(dispatchLogsPath, messageDispatchLogs);
}
const persistDispatchLogs = debounce(persistDispatchLogsImmediate, 2000);

function trimMobileAnnouncementsIfNeeded() {
  if (mobileAnnouncementsStore.length <= MAX_MOBILE_ANNOUNCEMENTS) {
    return;
  }
  const excess = mobileAnnouncementsStore.length - MAX_MOBILE_ANNOUNCEMENTS;
  mobileAnnouncementsStore.splice(0, excess);
}

function persistMobileAnnouncementsImmediate() {
  trimMobileAnnouncementsIfNeeded();
  writeJson(mobileAnnouncementsPath, mobileAnnouncementsStore);
}
const persistMobileAnnouncements = debounce(persistMobileAnnouncementsImmediate, 2000);

function trimPasswordChangeRequestsIfNeeded() {
  if (passwordChangeRequestsStore.length <= MAX_PASSWORD_CHANGE_REQUESTS) {
    return;
  }
  const excess = passwordChangeRequestsStore.length - MAX_PASSWORD_CHANGE_REQUESTS;
  passwordChangeRequestsStore.splice(0, excess);
}

function persistPasswordChangeRequestsImmediate() {
  trimPasswordChangeRequestsIfNeeded();
  writeJson(passwordChangeRequestsPath, passwordChangeRequestsStore);
}
const persistPasswordChangeRequests = debounce(persistPasswordChangeRequestsImmediate, 2000);

function persistRecipientRegistryImmediate() {
  writeJson(recipientRegistryPath, recipientRegistryStore);
}
const persistRecipientRegistry = debounce(persistRecipientRegistryImmediate, 1500);

function normalizeRecipientDigits(value) {
  return (value || '').toString().replace(/\D/g, '');
}

function makeRecipientRegistryKey(owner, recipient) {
  const normalizedOwner = owner || 'admin';
  const digits = normalizeRecipientDigits(recipient);
  return `${normalizedOwner}:${digits || (recipient || '')}`;
}

function toIsoIfValid(dateLike) {
  const ts = new Date(dateLike || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts).toISOString();
}

function getLookupClientMeta({ owner = null, deviceId = null, allowGlobalFallback = true } = {}) {
  if (deviceId) {
    const exactDevice = connectedDevices.find((item) => item && item.id === deviceId && item.ready);
    if (exactDevice) {
      const exactMeta = clientSessions.get(exactDevice.clientId);
      if (exactMeta && exactMeta.ready && exactMeta.client) {
        return { meta: exactMeta, device: exactDevice };
      }
    }
  }

  const ownerFilter = owner ? String(owner) : null;
  const candidates = connectedDevices.filter((device) => {
    if (!device || !device.ready) return false;
    if (ownerFilter && (device.owner || 'admin') !== ownerFilter) return false;
    const meta = clientSessions.get(device.clientId);
    return !!(meta && meta.ready && meta.client);
  });
  if (candidates.length) {
    const picked = candidates[0];
    return { meta: clientSessions.get(picked.clientId), device: picked, fallbackUsed: false };
  }

  // Optional fallback: if owner-scoped device is not ready, use any ready device for lookup
  if (!allowGlobalFallback) return { meta: null, device: null, fallbackUsed: false };
  const fallbackCandidates = connectedDevices.filter((device) => {
    if (!device || !device.ready) return false;
    const meta = clientSessions.get(device.clientId);
    return !!(meta && meta.ready && meta.client);
  });
  if (!fallbackCandidates.length) return { meta: null, device: null, fallbackUsed: false };
  const picked = fallbackCandidates[0];
  return { meta: clientSessions.get(picked.clientId), device: picked, fallbackUsed: true };
}

async function fetchRecipientLookupProfile(meta, jid, fallbackDigits = '') {
  const result = {
    jid,
    recipientDigits: fallbackDigits || normalizeRecipientDigits(jid.split('@')[0] || ''),
    exists: null,
    displayName: null,
    profileName: null,
    businessName: null,
    profilePictureUrl: null,
    statusText: null,
    statusSetAt: null,
    estimatedCreatedAt: null,
    source: 'lookup',
    lookupError: null
  };

  if (!meta || !meta.client || !jid) {
    result.lookupError = 'ready_client_not_found';
    return result;
  }

  const sock = meta.client;
  let onWhatsAppItem = null;
  let onWhatsAppAttempted = false;
  let onWhatsAppFailed = false;
  try {
    if (typeof sock.onWhatsApp === 'function') {
      onWhatsAppAttempted = true;
      let waRows = await sock.onWhatsApp(jid);
      if (!waRows || (Array.isArray(waRows) && waRows.length === 0)) {
        // Compatibility fallback for different Baileys versions/signatures
        waRows = await sock.onWhatsApp([jid]).catch(() => waRows);
      }
      if (!waRows || (Array.isArray(waRows) && waRows.length === 0)) {
        const digitsOnly = normalizeRecipientDigits(fallbackDigits || jid);
        if (digitsOnly) {
          waRows = await sock.onWhatsApp(`${digitsOnly}@s.whatsapp.net`).catch(() => waRows);
        }
      }
      if (Array.isArray(waRows) && waRows.length) {
        onWhatsAppItem = waRows[0];
      } else if (waRows && typeof waRows === 'object') {
        onWhatsAppItem = waRows;
      }
    }
  } catch (error) {
    onWhatsAppFailed = true;
    result.lookupError = error && error.message ? error.message : String(error);
  }

  if (onWhatsAppItem) {
    if (typeof onWhatsAppItem.exists === 'boolean') {
      result.exists = onWhatsAppItem.exists;
    } else {
      result.exists = true;
    }
    result.profileName =
      onWhatsAppItem.notify ||
      onWhatsAppItem.name ||
      onWhatsAppItem.verifiedName ||
      null;
  } else if (result.exists === null && onWhatsAppAttempted && !onWhatsAppFailed) {
    result.exists = false;
  }

  if (result.exists && typeof sock.profilePictureUrl === 'function') {
    try {
      result.profilePictureUrl = await sock.profilePictureUrl(jid, 'image');
    } catch (_) { }
  }

  if (result.exists && typeof sock.fetchStatus === 'function') {
    try {
      const statusRes = await sock.fetchStatus(jid);
      if (statusRes) {
        result.statusText = statusRes.status || null;
        result.statusSetAt = toIsoIfValid(statusRes.setAt);
      }
    } catch (_) { }
  }

  if (result.exists && typeof sock.getBusinessProfile === 'function') {
    try {
      const biz = await sock.getBusinessProfile(jid);
      if (biz) {
        result.businessName =
          biz.name ||
          biz.verifiedName ||
          biz.description ||
          null;
      }
    } catch (_) { }
  }

  const contacts = sock.contacts && typeof sock.contacts === 'object' ? sock.contacts : null;
  const contact = contacts ? contacts[jid] : null;
  const contactName = contact
    ? (contact.name || contact.notify || contact.verifiedName || null)
    : null;

  result.displayName = contactName || result.businessName || result.profileName || null;
  return result;
}

function upsertRecipientRegistry(entry = {}) {
  const owner = entry.owner || 'admin';
  const recipient = entry.recipient || '';
  const recipientDigits = normalizeRecipientDigits(recipient);
  const key = makeRecipientRegistryKey(owner, recipient || recipientDigits);
  const nowIso = new Date().toISOString();

  const existing = recipientRegistryStore[key] || {
    key,
    owner,
    recipient,
    recipientDigits,
    jid: entry.jid || (recipientDigits ? `${recipientDigits}@s.whatsapp.net` : null),
    firstSeenAt: nowIso,
    estimatedCreatedAt: nowIso,
    firstSentAt: null,
    lastSentAt: null,
    lastLookupAt: null,
    lookupCount: 0,
    messageCount: 0,
    successCount: 0,
    failedCount: 0,
    lastStatus: null,
    lastError: null,
    lastDeviceId: null,
    lastLabel: null,
    exists: null,
    displayName: null,
    profileName: null,
    businessName: null,
    profilePictureUrl: null,
    statusText: null,
    statusSetAt: null,
    source: null
  };

  existing.owner = owner;
  existing.recipient = recipient || existing.recipient;
  existing.recipientDigits = recipientDigits || existing.recipientDigits;
  existing.jid = entry.jid || existing.jid || (existing.recipientDigits ? `${existing.recipientDigits}@s.whatsapp.net` : null);
  existing.lastDeviceId = entry.deviceId || existing.lastDeviceId || null;
  existing.lastLabel = entry.label || existing.lastLabel || null;

  if (entry.status) {
    existing.lastStatus = entry.status;
    existing.messageCount = Number(existing.messageCount || 0) + 1;
    if (entry.status === 'iletildi') {
      existing.successCount = Number(existing.successCount || 0) + 1;
      existing.lastSentAt = nowIso;
      if (!existing.firstSentAt) existing.firstSentAt = nowIso;
    } else if (entry.status === 'hata') {
      existing.failedCount = Number(existing.failedCount || 0) + 1;
      if (entry.error) existing.lastError = entry.error;
    }
  }

  if (Object.prototype.hasOwnProperty.call(entry, 'exists')) existing.exists = entry.exists;
  if (entry.displayName) existing.displayName = entry.displayName;
  if (entry.profileName) existing.profileName = entry.profileName;
  if (entry.businessName) existing.businessName = entry.businessName;
  if (entry.profilePictureUrl) existing.profilePictureUrl = entry.profilePictureUrl;
  if (Object.prototype.hasOwnProperty.call(entry, 'statusText')) existing.statusText = entry.statusText;
  if (entry.statusSetAt) existing.statusSetAt = entry.statusSetAt;
  if (entry.source) existing.source = entry.source;
  if (entry.lookupError) existing.lastError = entry.lookupError;
  if (entry.lookupAttempted) {
    existing.lastLookupAt = nowIso;
    existing.lookupCount = Number(existing.lookupCount || 0) + 1;
  }
  if (!existing.estimatedCreatedAt) {
    existing.estimatedCreatedAt = existing.firstSeenAt || nowIso;
  }
  if (entry.statusSetAt) {
    const currentEstimateTs = safeParseTimeMs(existing.estimatedCreatedAt);
    const statusTs = safeParseTimeMs(entry.statusSetAt);
    if (statusTs > 0 && (currentEstimateTs === 0 || statusTs < currentEstimateTs)) {
      existing.estimatedCreatedAt = new Date(statusTs).toISOString();
    }
  }

  recipientRegistryStore[key] = existing;
  persistRecipientRegistry();
  return existing;
}

function ingestContactsToRecipientRegistry(owner, contacts = []) {
  if (!Array.isArray(contacts) || !contacts.length) return;
  contacts.forEach((contact) => {
    if (!contact) return;
    const jid = (contact.id || contact.jid || '').toString();
    const digits = normalizeRecipientDigits(jid.split('@')[0] || '');
    if (!digits) return;
    const displayName =
      contact.name ||
      contact.notify ||
      contact.verifiedName ||
      null;
    upsertRecipientRegistry({
      owner: owner || 'admin',
      recipient: `+${digits}`,
      jid: `${digits}@s.whatsapp.net`,
      displayName,
      profileName: displayName,
      source: 'history_sync'
    });
  });
}

function addMobileAnnouncement({
  type = 'system',
  title = '',
  body = '',
  owner = 'all',
  createdBy = 'admin',
  meta = null
}) {
  const normalizedOwner = owner || 'all';
  const announcement = {
    id: `ann_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    type,
    title: (title || '').toString().trim(),
    body: (body || '').toString().trim(),
    owner: normalizedOwner,
    createdBy,
    createdAt: new Date().toISOString(),
    meta: meta || null
  };
  if (!announcement.title && !announcement.body) {
    return null;
  }
  mobileAnnouncementsStore.push(announcement);
  persistMobileAnnouncements();
  return announcement;
}

function addPasswordChangeRequest({
  owner,
  note = '',
  ip = '',
  userAgent = '',
  source = 'mobile_api'
}) {
  const normalizedOwner = resolveUsername(owner);
  if (!normalizedOwner || !usersStore[normalizedOwner]) {
    return null;
  }
  const requestItem = {
    id: `pwreq_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    owner: normalizedOwner,
    note: (note || '').toString().trim().slice(0, 1000),
    status: 'pending',
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ip: ip || null,
    userAgent: userAgent ? userAgent.slice(0, 240) : null
  };
  passwordChangeRequestsStore.push(requestItem);
  persistPasswordChangeRequests();
  return requestItem;
}

function persistTickets() {
  writeJson(ticketsPath, ticketsStore);
}

function persistSessions() {
  writeJson(sessionsPath, sessionsStore);
}

function getSessionUserMeta(req) {
  if (!req || !req.session || !req.session.user) {
    return null;
  }
  return req.session.user;
}

function getSessionUsername(req) {
  const sessionUser = getSessionUserMeta(req);
  return sessionUser ? sessionUser.username : null;
}

function generateLogId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `log-${crypto.randomBytes(8).toString('hex')}`;
}

function ensureEntryLogId(entry) {
  if (!entry.logId) {
    entry.logId = generateLogId();
  }
  return entry.logId;
}

function getNodeMetaForDispatch(clientId, deviceId) {
  const sessionMeta = clientId ? clientSessions.get(clientId) : null;
  let device = null;
  if (deviceId) {
    device = connectedDevices.find((item) => item.id === deviceId) || null;
  }
  if (!device && clientId) {
    device = connectedDevices.find((item) => item.clientId === clientId) || null;
  }
  return {
    nodeId: clientId || null,
    nodeLabel: (sessionMeta && sessionMeta.label) || (device && device.label) || null,
    deviceLabel: (device && device.label) || null
  };
}

function findDispatchLogIndexByEntry(entry) {
  if (!entry) return -1;
  const logId = ensureEntryLogId(entry);
  if (dispatchLogIndexById.has(logId)) {
    return dispatchLogIndexById.get(logId);
  }
  for (let i = messageDispatchLogs.length - 1; i >= 0; i -= 1) {
    const item = messageDispatchLogs[i];
    if (!item) continue;
    if (
      item.refCode &&
      entry.refCode &&
      item.refCode === entry.refCode &&
      (item.owner || 'admin') === (entry.owner || 'admin') &&
      (item.recipient || '') === (entry.recipient || '')
    ) {
      dispatchLogIndexById.set(logId, i);
      return i;
    }
  }
  return -1;
}

function appendDispatchLogFromEntry(entry, extra = {}) {
  if (!entry) return;
  const logId = ensureEntryLogId(entry);
  if (dispatchLogIndexById.has(logId)) return;

  const nodeMeta = getNodeMetaForDispatch(extra.clientId || entry.clientId, extra.deviceId || entry.deviceId);
  const logEntry = {
    id: logId,
    refCode: entry.refCode || null,
    owner: entry.owner || 'admin',
    label: entry.label || null,
    recipient: entry.recipient || null,
    normalizedRecipient: entry.normalizedRecipient || null,
    snippet: entry.snippet || '',
    status: extra.status || entry.status || 'queued',
    error: extra.error || entry.error || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    sentAt: entry.sentAt || null,
    lastAttempt: entry.lastAttempt || null,
    deviceId: extra.deviceId || entry.deviceId || null,
    clientId: extra.clientId || entry.clientId || null,
    nodeId: nodeMeta.nodeId,
    nodeLabel: nodeMeta.nodeLabel,
    deviceLabel: nodeMeta.deviceLabel,
    updatedAt: new Date().toISOString()
  };

  messageDispatchLogs.push(logEntry);
  dispatchLogIndexById.set(logId, messageDispatchLogs.length - 1);
  trimDispatchLogsIfNeeded();
  persistDispatchLogs();
}

function updateDispatchLogFromEntry(entry, extra = {}) {
  if (!entry) return;
  const logId = ensureEntryLogId(entry);
  let index = findDispatchLogIndexByEntry(entry);
  if (index < 0) {
    appendDispatchLogFromEntry(entry, extra);
    index = findDispatchLogIndexByEntry(entry);
    if (index < 0) return;
  }

  const item = messageDispatchLogs[index] || {};
  const clientId = extra.clientId || entry.clientId || item.clientId || null;
  const deviceId = extra.deviceId || entry.deviceId || item.deviceId || null;
  const nodeMeta = getNodeMetaForDispatch(clientId, deviceId);

  item.id = logId;
  item.refCode = entry.refCode || item.refCode || null;
  item.owner = entry.owner || item.owner || 'admin';
  item.label = entry.label || item.label || null;
  item.recipient = entry.recipient || item.recipient || null;
  item.normalizedRecipient = entry.normalizedRecipient || item.normalizedRecipient || null;
  item.snippet = entry.snippet || item.snippet || '';
  item.status = extra.status || entry.status || item.status || 'queued';
  item.error = extra.error !== undefined ? extra.error : (entry.error !== undefined ? entry.error : item.error || null);
  item.createdAt = entry.createdAt || item.createdAt || new Date().toISOString();
  item.sentAt = entry.sentAt || item.sentAt || null;
  item.lastAttempt = entry.lastAttempt || item.lastAttempt || null;
  item.deviceId = deviceId;
  item.clientId = clientId;
  item.nodeId = nodeMeta.nodeId;
  item.nodeLabel = nodeMeta.nodeLabel || item.nodeLabel || null;
  item.deviceLabel = nodeMeta.deviceLabel || item.deviceLabel || null;
  item.updatedAt = new Date().toISOString();

  messageDispatchLogs[index] = item;
  dispatchLogIndexById.set(logId, index);
  persistDispatchLogs();
}

function getStoredSessionUser(req) {
  const username = getSessionUsername(req);
  return username ? usersStore[username] : null;
}

function isSessionAuthenticated(req) {
  return !!(req && req.session && req.session.authenticated);
}

function parseMultiFilterValue(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => item.toString().split(','))
      .map((item) => item.trim())
      .filter((item) => item);
  }
  return raw
    .toString()
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item);
}

function parseIsoDateValue(value, endOfDay = false) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
}

function normalizeRecipientId(value) {
  if (!value) {
    return null;
  }
  const normalized = value.toString().replace(/\D/g, '');
  return normalized ? `${normalized}@s.whatsapp.net` : null;
}

function parseRecipientsInput(rawRecipient, rawBulk) {
  const entries = [];
  const seenRecipients = new Set();

  const addEntry = (item) => {
    let recipient = item.trim();
    let customMessage = null;

    if (recipient.includes('|')) {
      const parts = recipient.split('|');
      recipient = parts[0].trim();
      customMessage = parts.slice(1).join('|').trim();
    }

    const cleaned = recipient.replace(/\D/g, '');
    if (cleaned.length >= 7 && !seenRecipients.has(cleaned)) {
      seenRecipients.add(cleaned);
      entries.push({
        recipient: cleaned,
        message: customMessage
      });
    }
  };

  if (rawRecipient != null) {
    const rVal = rawRecipient.toString().trim();
    if (rVal) {
      if (!rVal.includes('|')) {
        rVal.split(/[\n\r,;]+/).forEach(it => addEntry(it));
      } else {
        addEntry(rVal);
      }
    }
  }

  const bulkSource = typeof rawBulk === 'string' ? rawBulk : Array.isArray(rawBulk) ? rawBulk.join('\n') : '';
  bulkSource
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line)
    .forEach((line) => {
      if (!line.includes('|')) {
        line.split(/[,;]+/).forEach(it => addEntry(it));
      } else {
        addEntry(line);
      }
    });

  return entries;
}

function generateRefCode(entry) {
  if (entry.refCode) {
    return entry.refCode;
  }
  const random = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  entry.refCode = random;
  return random;
}

function enqueueMessage(entry) {
  try {
    entry.logId = ensureEntryLogId(entry);
    entry.createdAt = entry.createdAt || new Date().toISOString();
    entry.snippet = entry.snippet || '';
    entry.status = entry.status || 'queued';
    entry.refCode = generateRefCode(entry);
    entry.normalizedRecipient = normalizeRecipientId(entry.recipient);
    appendDispatchLogFromEntry(entry, { status: entry.status });

    const owner = entry.owner || 'admin';
    const user = usersStore[owner];

    if (user && user.isIsolated) {
      enqueueIsolatedMessage(owner, entry);
      // We still log activity but we don't put it in the main dashboard queue
      logActivity({
        type: 'message.enqueued.isolated',
        owner: owner,
        message: `Mesaj izole quyruğa əlavə edildi: ${entry.recipient}`,
        meta: { refCode: entry.refCode }
      });
      return;
    }

    setMessageStatus(entry, entry.status);
    dashboardState.queuedMessages.push(entry);

    if (dashboardState.queuedMessages.length > dashboardState.maxQueueLength) {
      const excess = dashboardState.queuedMessages.length - dashboardState.maxQueueLength;
      const removed = dashboardState.queuedMessages.splice(0, excess);
      removed.forEach((oldEntry) => {
        adjustStatusTotals(oldEntry.status, null);
        adjustOwnerStatusTotals(oldEntry.owner || 'admin', oldEntry.status, null);
      });
    }

    persistQueue();
  } catch (err) {
    console.error(`[queue] Error enqueuing message for ${entry.recipient}:`, err.message);
  }
}

const IS_WINDOWS = os.platform() === 'win32';
const TELEMETRY_LOG_INTERVAL_MS = 60 * 1000;

// Replaced global locks with per-device tracking
const deviceLocks = new Set();
const ownerDispatchLocks = new Set();
const deviceLastSend = new Map();
const deviceRestUntil = new Map();
const activeDispatchByClient = new Map();
const activeDispatchByOwner = new Map();

let lastTelemetryLogAt = 0;
const telemetry = {
  dispatches: 0,
  successes: 0,
  failures: 0,
  totalDurationMs: 0
};
const cpuMeasurement = {
  usage: process.cpuUsage(),
  hrtime: process.hrtime.bigint()
};

const activityLogPath = path.join(dataDir, 'activity_log.json');
let activityLog = readJson(activityLogPath, []);
const MAX_ACTIVITY_LOG = parseInt(process.env.MAX_ACTIVITY_LOG, 10) || 300;

function persistActivityLog() {
  if (activityLog.length > MAX_ACTIVITY_LOG) {
    activityLog = activityLog.slice(activityLog.length - MAX_ACTIVITY_LOG);
  }
  writeJson(activityLogPath, activityLog);
}

function logActivity(entry) {
  if (!entry) {
    return;
  }
  const newEntry = {
    at: new Date().toISOString(),
    level: entry.level || 'info',
    type: entry.type || 'event',
    owner: entry.owner || null,
    message: entry.message || '',
    meta: entry.meta || null
  };
  activityLog.push(newEntry);
  persistActivityLog();

  // If it's an error or critical event, add to system log buffer for WhatsApp notification
  if (newEntry.level === 'error' || newEntry.type.includes('error') || newEntry.type.includes('crash')) {
    systemLogBuffer.push(newEntry);
    // Limit buffer size to prevent memory issues if WhatsApp is down
    if (systemLogBuffer.length > 50) systemLogBuffer.shift();
  }
}

function sampleCpuPercent() {
  const nowHr = process.hrtime.bigint();
  const latestUsage = process.cpuUsage();
  const elapsedMicro = Number(nowHr - cpuMeasurement.hrtime) / 1000;
  const cpuMicro =
    Math.max(0, latestUsage.user - cpuMeasurement.usage.user) +
    Math.max(0, latestUsage.system - cpuMeasurement.usage.system);
  cpuMeasurement.hrtime = nowHr;
  cpuMeasurement.usage = latestUsage;
  if (elapsedMicro <= 0) {
    return 0;
  }
  return Number(Math.min(99, (cpuMicro / elapsedMicro) * 100));
}

function getActiveBrowserCount() {
  return Array.from(clientSessions.values()).filter((session) => session.ready).length;
}

function logTelemetryEvent(reason, delayMs, cpuPercent, activeBrowsers) {
  const now = Date.now();
  if (reason === 'success' && now - lastTelemetryLogAt < TELEMETRY_LOG_INTERVAL_MS) {
    return;
  }
  lastTelemetryLogAt = now;
  const avgDuration = telemetry.dispatches
    ? telemetry.totalDurationMs / telemetry.dispatches
    : 0;
  const successRate = telemetry.dispatches
    ? (telemetry.successes / telemetry.dispatches) * 100
    : 0;
  console.info(
    `[telemetry] event=${reason} delay=${delayMs}ms cpu=${cpuPercent.toFixed(
      1
    )}% activeBrowsers=${activeBrowsers} failureStreak=${globalFailureStreak} successRate=${successRate.toFixed(
      1
    )}% avgDispatch=${avgDuration.toFixed(1)}ms`
  );
}

function shouldRestartSessionOnError(error) {
  if (!error || !error.message) {
    return false;
  }
  const lowered = error.message.toLowerCase();
  return lowered.includes('session closed') || lowered.includes('page has been closed');
}

function createDispatchTimeoutError(timeoutMs) {
  const error = new Error(`dispatch_timeout_${timeoutMs}ms`);
  error.code = 'DISPATCH_TIMEOUT';
  return error;
}

function withTimeout(promise, timeoutMs, timeoutErrorFactory = () => createDispatchTimeoutError(timeoutMs)) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutErrorFactory()), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function markDispatchActive(clientId, owner, entry, deviceId) {
  const startedAt = Date.now();
  const payload = {
    clientId,
    owner,
    deviceId: deviceId || null,
    logId: ensureEntryLogId(entry),
    recipient: entry && entry.recipient ? entry.recipient : null,
    startedAt
  };
  activeDispatchByClient.set(clientId, payload);
  activeDispatchByOwner.set(owner, payload);
}

function clearActiveDispatch(clientId, owner) {
  if (clientId) {
    activeDispatchByClient.delete(clientId);
  }
  if (owner) {
    const ownerPayload = activeDispatchByOwner.get(owner);
    if (!ownerPayload || !clientId || ownerPayload.clientId === clientId) {
      activeDispatchByOwner.delete(owner);
    }
  }
}

function releaseStaleDispatchLocks(now = Date.now(), thresholdMs = STUCK_SENDING_THRESHOLD_MS) {
  let released = 0;
  for (const [clientId, payload] of activeDispatchByClient.entries()) {
    if (!payload || !payload.startedAt || now - payload.startedAt < thresholdMs) {
      continue;
    }

    deviceLocks.delete(clientId);
    if (payload.owner) {
      ownerDispatchLocks.delete(payload.owner);
    }
    clearActiveDispatch(clientId, payload.owner);
    released += 1;

    logActivity({
      level: 'error',
      type: 'message.dispatch_timeout',
      owner: payload.owner || 'admin',
      message: `Asılı gönderim kilidi bırakıldı: ${payload.recipient || clientId}`,
      meta: {
        clientId,
        deviceId: payload.deviceId || null,
        logId: payload.logId || null,
        stuckMs: now - payload.startedAt
      }
    });
  }
  return released;
}

async function dispatchNextMessage() {
  const queuedMessages = dashboardState.queuedMessages.filter((message) => message.status === 'queued');
  if (!queuedMessages.length) {
    return;
  }

  // Check more messages to find matching devices
  const limit = Math.min(queuedMessages.length, DISPATCH_SCAN_LIMIT);
  const tasks = [];

  for (let i = 0; i < limit; i++) {
    const nextEntry = queuedMessages[i];
    const owner = nextEntry.owner || 'admin';
    if (nextEntry.deferUntil) {
      const deferUntilTs = new Date(nextEntry.deferUntil).getTime();
      if (!Number.isNaN(deferUntilTs) && Date.now() < deferUntilTs) {
        continue;
      }
      delete nextEntry.deferUntil;
      updateDispatchLogFromEntry(nextEntry, { status: 'queued', error: null });
    }
    if (isOwnerQueuePaused(owner)) continue;
    if (ownerDispatchLocks.has(owner)) continue;
    const targetDevice = findReadyDeviceForEntry(nextEntry);

    if (!targetDevice) continue;

    if (!canDispatchWithDevice(targetDevice, Date.now())) continue;

    const clientId = targetDevice.clientId;

    const clientMeta = clientSessions.get(clientId);
    if (!clientMeta || !clientMeta.ready || !clientMeta.client) continue;

    tasks.push(performDispatch(nextEntry, targetDevice, clientMeta));
  }

  if (tasks.length) {
    await Promise.allSettled(tasks);
  }
}


let globalFailureStreak = 0;

async function performDispatch(nextEntry, targetDevice, clientMeta) {
  const clientId = targetDevice.clientId;
  const now = Date.now();
  const owner = nextEntry.owner || 'admin';

  deviceLocks.add(clientId);
  ownerDispatchLocks.add(owner);
  markDispatchActive(clientId, owner, nextEntry, targetDevice.id);
  nextEntry.clientId = clientId;
  nextEntry.deviceId = targetDevice.id;

  const dispatchStart = process.hrtime.bigint();
  let succeeded = false;
  let attemptedNetworkSend = false;
  let finalizedFailure = false;

  try {
    const jid = nextEntry.normalizedRecipient || normalizeRecipientId(nextEntry.recipient);
    if (!jid) {
      throw new Error('Geçersiz nömrə');
    }

    const ownerPolicy = canSendForOwner(owner, now);
    if (!ownerPolicy.ok) {
      const fallbackRetryAt = Date.now() + Math.max(15000, OWNER_MIN_INTERVAL_MS || 15000);
      const retryAt = ownerPolicy.retryAt || fallbackRetryAt;
      nextEntry.deferUntil = new Date(retryAt).toISOString();
      nextEntry.error = null;
      setMessageStatus(nextEntry, 'queued');
      updateDispatchLogFromEntry(nextEntry, {
        status: 'queued',
        error: null,
        clientId,
        deviceId: targetDevice.id
      });
      externalLogBuffer.push({
        owner,
        recipient: nextEntry.recipient,
        status: 'deferred',
        error: ownerPolicy.reason,
        at: new Date().toISOString()
      });
      logActivity({
        type: 'message.deferred.owner_policy',
        owner,
        message: `Mesaj owner policy səbəbi ilə ertələndi: ${nextEntry.recipient} (${ownerPolicy.reason})`,
        meta: { deviceId: targetDevice.id, reason: ownerPolicy.reason, retryAt: nextEntry.deferUntil }
      });
      return;
    }

    const recipientPolicy = canSendToRecipient(owner, nextEntry.recipient, now);
    if (!recipientPolicy.ok) {
      const fallbackRetryAt = Date.now() + Math.max(15000, RECIPIENT_COOLDOWN_MS || 15000);
      const retryAt = recipientPolicy.retryAt || fallbackRetryAt;
      nextEntry.deferUntil = new Date(retryAt).toISOString();
      nextEntry.error = null;
      setMessageStatus(nextEntry, 'queued');
      updateDispatchLogFromEntry(nextEntry, {
        status: 'queued',
        error: null,
        clientId,
        deviceId: targetDevice.id
      });
      externalLogBuffer.push({
        owner,
        recipient: nextEntry.recipient,
        status: 'deferred',
        error: recipientPolicy.reason,
        at: new Date().toISOString()
      });
      logActivity({
        type: 'message.deferred.policy',
        owner,
        message: `Mesaj policy səbəbi ilə ertələndi: ${nextEntry.recipient} (${recipientPolicy.reason})`,
        meta: { deviceId: targetDevice.id, reason: recipientPolicy.reason, retryAt: nextEntry.deferUntil }
      });
      return;
    }

    if (AI_GUARD_ENABLED) {
      const aiRisk = evaluateAiGuardRisk(nextEntry, targetDevice, now);
      if (aiRisk.shouldBlockNow) {
        const retryAt = Date.now() + aiRisk.deferMs;
        nextEntry.deferUntil = new Date(retryAt).toISOString();
        nextEntry.error = null;
        setMessageStatus(nextEntry, 'queued');
        updateDispatchLogFromEntry(nextEntry, {
          status: 'queued',
          error: null,
          clientId,
          deviceId: targetDevice.id
        });
        externalLogBuffer.push({
          owner,
          recipient: nextEntry.recipient,
          status: 'deferred',
          error: `ai_guard:${aiRisk.reasons.join('|') || 'risk_score'}`,
          at: new Date().toISOString()
        });
        logActivity({
          type: 'message.deferred.ai_guard',
          owner,
          message: `Mesaj AI Guard səbəbi ilə ertələndi: ${nextEntry.recipient} (score ${aiRisk.score})`,
          meta: {
            deviceId: targetDevice.id,
            reasons: aiRisk.reasons,
            score: aiRisk.score,
            retryAt: nextEntry.deferUntil
          }
        });
        return;
      }
      if (aiRisk.shouldWarn) {
        logActivity({
          level: 'error',
          type: 'message.ai_guard.warn',
          owner,
          message: `AI Guard risk xəbərdarlığı: ${nextEntry.recipient} (score ${aiRisk.score})`,
          meta: {
            deviceId: targetDevice.id,
            reasons: aiRisk.reasons,
            score: aiRisk.score
          }
        });
      }
    }

    delete nextEntry.deferUntil;
    setMessageStatus(nextEntry, 'iletiliyor');
    nextEntry.lastAttempt = new Date().toISOString();
    nextEntry.attempts = (nextEntry.attempts || 0) + 1;
    updateDispatchLogFromEntry(nextEntry, {
      status: 'iletiliyor',
      clientId,
      deviceId: targetDevice.id,
      error: null
    });
    persistQueue();
    deviceLastSend.set(clientId, Date.now());

    const refCode = generateRefCode(nextEntry);
    nextEntry.refCode = refCode;
    const outgoingText = `${nextEntry.snippet}\n\nQeyd: Avtomatik bildirişdir. REF: ${refCode}`;
    attemptedNetworkSend = true;
    await withTimeout(
      clientMeta.client.sendMessage(jid, { text: outgoingText }),
      DISPATCH_SEND_TIMEOUT_MS
    );
    if (AI_GUARD_ENABLED) {
      registerAiFingerprint(owner, nextEntry.snippet || '', Date.now());
    }

    setMessageStatus(nextEntry, 'iletildi');
    succeeded = true;
    finalizedFailure = false;
    nextEntry.retryCount = 0;
    nextEntry.lastTransientError = null;
    upsertRecipientRegistry({
      owner,
      recipient: nextEntry.recipient,
      jid,
      status: 'iletildi',
      deviceId: targetDevice.id,
      label: nextEntry.label || null
    });
    fetchRecipientLookupProfile(clientMeta, jid, normalizeRecipientDigits(nextEntry.recipient))
      .then((lookup) => {
        upsertRecipientRegistry({
          owner,
          recipient: nextEntry.recipient,
          jid,
          lookupAttempted: true,
          ...lookup
        });
      })
      .catch((lookupErr) => {
        upsertRecipientRegistry({
          owner,
          recipient: nextEntry.recipient,
          jid,
          lookupAttempted: true,
          lookupError: lookupErr && lookupErr.message ? lookupErr.message : String(lookupErr),
          source: 'lookup'
        });
      });
    registerOwnerSend(owner, Date.now());
    registerRecipientSend(owner, nextEntry.recipient, Date.now());
    externalLogBuffer.push({
      owner,
      recipient: nextEntry.recipient,
      status: 'success',
      at: new Date().toISOString()
    });
    nextEntry.sentAt = new Date().toISOString();
    dashboardState.totalMessagesSent += 1;
    nextEntry.deviceId = targetDevice.id;
    nextEntry.clientId = clientId;
    nextEntry.normalizedRecipient = jid;
    nextEntry.error = null;
    updateDispatchLogFromEntry(nextEntry, {
      status: 'iletildi',
      error: null,
      clientId,
      deviceId: targetDevice.id
    });
    globalFailureStreak = 0;
    logActivity({
      type: 'message.sent',
      owner,
      message: `Mesaj iletildi: ${nextEntry.recipient} (ref ${nextEntry.refCode})`,
      meta: { deviceId: targetDevice.id }
    });
  } catch (err) {
    const errorMessage = normalizeErrorMessage(err) || 'Unknown';
    const retryCount = Number(nextEntry.retryCount) || 0;
    const shouldRetry =
      attemptedNetworkSend &&
      isRetryableDispatchError(err) &&
      retryCount < MAX_RETRYABLE_SEND_ATTEMPTS;

    if (shouldRetry) {
      const retryDelayMs = getRetryableDispatchDelayMs(nextEntry);
      nextEntry.retryCount = retryCount + 1;
      nextEntry.lastTransientError = errorMessage;
      nextEntry.error = null;
      nextEntry.deferUntil = new Date(Date.now() + retryDelayMs).toISOString();
      setMessageStatus(nextEntry, 'queued');
      updateDispatchLogFromEntry(nextEntry, {
        status: 'queued',
        error: null,
        clientId,
        deviceId: targetDevice.id
      });
      externalLogBuffer.push({
        owner,
        recipient: nextEntry.recipient,
        status: 'deferred',
        error: `retryable:${errorMessage}`,
        at: new Date().toISOString()
      });
      logActivity({
        level: 'error',
        type: 'message.retry_scheduled',
        owner,
        message: `Mesaj tekrar növbəyə alındı: ${nextEntry.recipient} (${errorMessage})`,
        meta: {
          deviceId: targetDevice ? targetDevice.id : null,
          retryCount: nextEntry.retryCount,
          retryAt: nextEntry.deferUntil
        }
      });
      if (targetDevice && shouldRestartSessionOnError(err)) {
        restartClientSession(clientId).catch((restartErr) => {
          console.error('İstifadəçi sessiyasını yenidən başlatmaq alınmadı:', restartErr);
        });
      }
      return;
    }

    finalizedFailure = true;
    nextEntry.error = errorMessage;
    setMessageStatus(nextEntry, 'hata');
    upsertRecipientRegistry({
      owner,
      recipient: nextEntry.recipient,
      jid: nextEntry.normalizedRecipient || normalizeRecipientId(nextEntry.recipient),
      status: 'hata',
      error: errorMessage,
      deviceId: targetDevice ? targetDevice.id : null,
      label: nextEntry.label || null
    });
    updateDispatchLogFromEntry(nextEntry, {
      status: 'hata',
      error: errorMessage,
      clientId,
      deviceId: targetDevice.id
    });
    externalLogBuffer.push({
      owner,
      recipient: nextEntry.recipient,
      status: 'error',
      error: errorMessage,
      at: new Date().toISOString()
    });
    if (attemptedNetworkSend) {
      globalFailureStreak += 1;
    }
    logActivity({
      level: 'error',
      type: 'message.error',
      owner,
      message: `Mesaj hatası: ${nextEntry.recipient} (${errorMessage})`,
      meta: { deviceId: targetDevice ? targetDevice.id : null }
    });
    if (attemptedNetworkSend && targetDevice && shouldRestartSessionOnError(err)) {
      restartClientSession(clientId).catch((restartErr) => {
        console.error('İstifadəçi sessiyasını yenidən başlatmaq alınmadı:', restartErr);
      });
    }
  } finally {
    if (attemptedNetworkSend && (succeeded || finalizedFailure)) {
      registerDeviceDispatchResult(targetDevice, succeeded, succeeded ? null : nextEntry.error);
      registerOwnerDispatchResult(owner, succeeded, succeeded ? null : nextEntry.error);
    }

    const durationMs = Number(process.hrtime.bigint() - dispatchStart) / 1e6;
    if (attemptedNetworkSend && (succeeded || finalizedFailure)) {
      telemetry.dispatches += 1;
      telemetry.totalDurationMs += durationMs;
      if (succeeded) {
        telemetry.successes += 1;
      } else {
        telemetry.failures += 1;
      }
    }

    if (REST_BREAK_ENABLED && attemptedNetworkSend) {
      const cpuPercent = sampleCpuPercent();
      const activeBrowsers = getActiveBrowserCount();
      const adaptiveDelay = calculateAdaptiveDelay(succeeded || !finalizedFailure, activeBrowsers, cpuPercent);
      const dynamicMinInterval = getDynamicMinIntervalForDevice(targetDevice.id);
      const enforcedDelay = Math.max(dynamicMinInterval, adaptiveDelay);
      const finalDelay = enforcedDelay + getSendJitterMs();
      deviceRestUntil.set(clientId, Date.now() + finalDelay);

      if (finalizedFailure || finalDelay > REST_BREAK_BASE_MS) {
        logTelemetryEvent(succeeded ? 'success' : finalizedFailure ? 'error' : 'retry', finalDelay, cpuPercent, activeBrowsers);
      }
    }

    persistQueue();
    deviceLocks.delete(clientId);
    ownerDispatchLocks.delete(owner);
    clearActiveDispatch(clientId, owner);

    // Instant Log to Managers
    if (succeeded || finalizedFailure) {
      sendInstantLogToManagers(nextEntry, succeeded, nextEntry.error).catch(e => {
        console.error('[instant-log] error:', e.message);
      });
    }

    // Send to Audit Log if enabled
    if ((succeeded || finalizedFailure) && auditStore.enabled && auditStore.jid) {
      sendAuditLog(nextEntry, succeeded, nextEntry.error);
    }
  }
}

async function sendAuditLog(nextEntry, succeeded, errorMsg) {
  // Find a ready admin session to send the log
  const adminMeta = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);
  if (!adminMeta) return;

  try {
    const auditText = buildWhatsappDispatchLog(nextEntry, succeeded, errorMsg, {
      title: 'AUDIT LOG',
      previewLength: 150
    });
    await adminMeta.client.sendMessage(auditStore.jid, { text: auditText });
  } catch (err) {
    console.error('[audit] Log gönderilirken xəta:', err);
  }
}

// Update calculateAdaptiveDelay to use global failure streak or per-device?
// For now let's use global for simplicity as it was before, or just fix it.
function calculateAdaptiveDelay(success, activeBrowsers, cpuPercent) {
  let delay = REST_BREAK_BASE_MS;
  if (ADAPTIVE_BACKOFF_ENABLED) {
    if (!success) {
      delay += Math.pow(Math.max(globalFailureStreak, 1), 2) * 1000;
    }
    delay += activeBrowsers * 1000; // Reduced from 1500
    delay += Math.min(2000, Math.floor((cpuPercent / 100) * 2000)); // Reduced from 4000
  } else if (!success) {
    delay += REST_BREAK_BASE_MS;
  }
  return Math.min(MAX_ADAPTIVE_BACKOFF_MS, delay);
}

setInterval(() => {
  const startedAt = startLoopMeasure('dispatch');
  // If we are in master mode, only process non-isolated messages in dashboardState.queuedMessages
  // (Though enqueueMessage already filters them out from this array)
  dispatchNextMessage()
    .then(() => {
      finishLoopMeasure('dispatch', startedAt);
    })
    .catch((error) => {
      finishLoopMeasure('dispatch', startedAt, error);
      console.error('[queue] dispatch loop error:', error);
    });
}, DISPATCH_LOOP_INTERVAL_MS);

setInterval(() => {
  const startedAt = startLoopMeasure('historyCleanup');
  try {
    cleanupRecipientHistory();
    cleanupOwnerSendHistory();
    cleanupAiGuardHistory();
    finishLoopMeasure('historyCleanup', startedAt);
  } catch (error) {
    finishLoopMeasure('historyCleanup', startedAt, error);
  }
}, HISTORY_CLEANUP_INTERVAL_MS);

// If isolated tenant, we also need a special loop to process their specific file
if (ISOLATED_TENANT) {
  setInterval(async () => {
    const startedAt = startLoopMeasure('isolatedDispatch');
    try {
      await processIsolatedQueue(ISOLATED_TENANT);
      finishLoopMeasure('isolatedDispatch', startedAt);
    } catch (error) {
      finishLoopMeasure('isolatedDispatch', startedAt, error);
    }
  }, 2000);
}

// Watchdog: Reset messages stuck in 'iletiliyor' status for more than 5 minutes
setInterval(() => {
  const startedAt = startLoopMeasure('watchdog');
  try {
    const now = Date.now();
    const STUCK_THRESHOLD = STUCK_SENDING_THRESHOLD_MS;
    let fixed = 0;

    // Check global queue
    dashboardState.queuedMessages.forEach(m => {
      if (m.status === 'iletiliyor' && m.lastAttempt && (now - new Date(m.lastAttempt).getTime() > STUCK_THRESHOLD)) {
        setMessageStatus(m, 'queued');
        updateDispatchLogFromEntry(m, { status: 'queued' });
        fixed++;
      }
    });

    // Check isolated queue
    if (ISOLATED_TENANT) {
      const qPath = getTenantQueuePath(ISOLATED_TENANT);
      if (fs.existsSync(qPath)) {
        const q = readJson(qPath, []);
        let qFixed = 0;
        q.forEach(m => {
          if (m.status === 'iletiliyor' && m.lastAttempt && (now - new Date(m.lastAttempt).getTime() > STUCK_THRESHOLD)) {
            m.status = 'queued';
            updateDispatchLogFromEntry(m, { status: 'queued' });
            qFixed++;
          }
        });
        if (qFixed > 0) {
          writeJson(qPath, q);
          fixed += qFixed;
        }
      }
    }

    fixed += releaseStaleDispatchLocks(now, STUCK_THRESHOLD);

    if (fixed > 0) {
      persistQueue();
      console.log(`[watchdog] Fixed ${fixed} stuck messages.`);
    }
    finishLoopMeasure('watchdog', startedAt);
  } catch (error) {
    finishLoopMeasure('watchdog', startedAt, error);
  }
}, WATCHDOG_INTERVAL_MS);


async function processIsolatedQueue(tenantId) {
  const qPath = getTenantQueuePath(tenantId);
  if (!fs.existsSync(qPath)) return;

  const queue = readJson(qPath, []);
  if (!queue.length) return;

  const queued = queue.filter(m => m.status === 'queued');
  if (!queued.length) return;

  const limit = Math.min(queued.length, ISOLATED_DISPATCH_SCAN_LIMIT);
  let processed = false;
  const tasks = [];

  for (let i = 0; i < limit; i++) {
    const nextEntry = queued[i];
    const owner = nextEntry.owner || 'admin';
    if (nextEntry.deferUntil) {
      const deferUntilTs = new Date(nextEntry.deferUntil).getTime();
      if (!Number.isNaN(deferUntilTs) && Date.now() < deferUntilTs) {
        continue;
      }
      delete nextEntry.deferUntil;
      updateDispatchLogFromEntry(nextEntry, { status: 'queued', error: null });
    }
    if (isOwnerQueuePaused(owner)) continue;
    if (ownerDispatchLocks.has(owner)) continue;
    const targetDevice = findReadyDeviceForEntry(nextEntry);
    if (!targetDevice) continue;

    const clientId = targetDevice.clientId;
    const clientMeta = clientSessions.get(clientId);
    if (!clientMeta || !clientMeta.ready || !clientMeta.client) continue;
    if (!canDispatchWithDevice(targetDevice, Date.now())) continue;

    processed = true;
    tasks.push(performDispatch(nextEntry, targetDevice, clientMeta));
  }

  if (tasks.length) {
    await Promise.allSettled(tasks);
  }

  if (processed) {
    writeJson(qPath, queue);
  }
}



// External Logging Numbers (Managers)
const EXTERNAL_LOG_NUMBERS = [
  '994508300030@s.whatsapp.net',
  '905464233871@s.whatsapp.net',
  '994552545214@s.whatsapp.net'
];

function formatAzTimestamp(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('az-AZ');
}

function truncateText(value, maxLength = 120) {
  const text = (value || '').toString().replace(/\s+/g, ' ').trim();
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function formatLogLine(label, value) {
  return `${label}: ${value ?? '-'}`;
}

function calculatePercent(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 100;
  }
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function formatPercent(value) {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toFixed(1)}%`;
}

function renderPercentBar(percent, width = 18) {
  const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round((normalized / 100) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
}

function padTableCell(value, width) {
  return truncateText(value, width).padEnd(width, ' ');
}

function buildTextTable(headers, rows, widths) {
  const headerLine = headers.map((header, index) => padTableCell(header, widths[index])).join(' | ');
  const separator = widths.map((width) => '-'.repeat(width)).join('-|-');
  const body = rows.map((row) => row.map((cell, index) => padTableCell(cell, widths[index])).join(' | ')).join('\n');
  return `\`\`\`\n${headerLine}\n${separator}\n${body}\n\`\`\``;
}

function getFriendlySessionState(status, errorMessage) {
  if (status === 'ready') return 'Hazır';
  const text = (errorMessage || '').toString().toLowerCase();
  if (text.includes('qr')) return 'QR Bekliyor';
  if (text.includes('yenidən')) return 'Yenidən Qoşulur';
  if (text.includes('hazırlanır')) return 'Hazırlanır';
  return 'Sorunlu';
}

function isDemoSessionForReport(sessionMeta) {
  if (!sessionMeta) return false;
  if (sessionMeta.id && DEMO_CLIENT_IDS.has(sessionMeta.id)) return true;
  if (sessionMeta.clientId && DEMO_CLIENT_IDS.has(sessionMeta.clientId)) return true;
  if (sessionMeta.label && DEMO_SESSION_LABELS.has(sessionMeta.label)) return true;
  return false;
}

function getDispatchErrorCategory(errorValue) {
  if (!errorValue) return 'none';
  if (isBanRelatedError(errorValue)) return 'ban_risk';
  if (isBlockedRecipientError(errorValue)) return 'recipient_blocked';
  if (isInvalidRecipientError(errorValue)) return 'invalid_recipient';
  if (isRetryableDispatchError(errorValue)) return 'transient';
  return 'dispatch_error';
}

function humanizeDispatchErrorCategory(category) {
  switch (category) {
    case 'ban_risk':
      return 'Ban riski';
    case 'recipient_blocked':
      return 'Alıcı bloklu';
    case 'invalid_recipient':
      return 'Keçərsiz alıcı';
    case 'transient':
      return 'Keçici bağlantı xətası';
    case 'dispatch_error':
      return 'Göndərim xətası';
    default:
      return '-';
  }
}

function buildWhatsappDispatchLog(nextEntry, succeeded, errorMsg, options = {}) {
  const statusText = succeeded ? 'Gönderildi' : 'Gönderilemedi';
  const errorCategory = getDispatchErrorCategory(errorMsg);
  const retryCount = Number(nextEntry.retryCount) || 0;
  const lines = [
    `${options.title || 'HubMSG Bildirimi'}`,
    '----------------------------',
    formatLogLine('Durum', statusText),
    formatLogLine('Bayi', nextEntry.owner || 'admin'),
    formatLogLine('Alıcı', nextEntry.recipient || '-'),
    formatLogLine('Cihaz', nextEntry.deviceId || 'Bilinmiyor'),
    formatLogLine('Saat', formatAzTimestamp())
  ];

  if (options.includePreview !== false) {
    lines.push(formatLogLine('Mesaj Özeti', truncateText(nextEntry.snippet || '', options.previewLength || 140)));
  }

  if (nextEntry.refCode) {
    lines.push(formatLogLine('Referans', nextEntry.refCode));
  }

  if ((Number(nextEntry.attempts) || 0) > 1) {
    lines.push(formatLogLine('Deneme', Number(nextEntry.attempts) || 0));
  }

  if (retryCount > 0) {
    lines.push(formatLogLine('Tekrar', retryCount));
  }

  if (!succeeded) {
    lines.push(formatLogLine('Sorun Türü', humanizeDispatchErrorCategory(errorCategory)));
    lines.push(formatLogLine('Açıklama', truncateText(errorMsg || nextEntry.lastTransientError || 'Bilinmeyen hata', 180)));
  }

  if (nextEntry.lastTransientError && succeeded) {
    lines.push(formatLogLine('Not', `Önce kısa süreli bir sorun yaşandı: ${truncateText(nextEntry.lastTransientError, 110)}`));
  }

  if (nextEntry.deferUntil && !succeeded) {
    lines.push(formatLogLine('Tekrar Zamanı', formatAzTimestamp(nextEntry.deferUntil)));
  }

  lines.push('----------------------------');
  return lines.join('\n');
}

function buildSystemAlertBatchReport(logs) {
  const levelCounts = logs.reduce((acc, log) => {
    const level = log.level === 'error' ? 'error' : 'warn';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, { error: 0, warn: 0 });

  const lines = [
    'HubMSG Sistem Uyarı Özeti',
    '----------------------------',
    formatLogLine('Zaman Aralığı', 'Son 5 dakika'),
    formatLogLine('Saat', formatAzTimestamp()),
    formatLogLine('Hata', levelCounts.error || 0),
    formatLogLine('Uyarı', levelCounts.warn || 0),
    '',
    'Öne Çıkan Olaylar:'
  ];

  logs.slice(0, 12).forEach((log, idx) => {
    const prefix = `${idx + 1}. ${formatAzTimestamp(log.at)}`;
    const ownerPart = log.owner ? ` (${log.owner})` : '';
    lines.push(`${prefix}${ownerPart}`);
    lines.push(`   ${truncateText(log.message, 180)}`);
  });

  lines.push('----------------------------');
  return lines.join('\n');
}

function buildExternalDispatchSummary(logs) {
  const stats = {};
  const totals = { success: 0, deferred: 0, error: 0 };

  logs.forEach((log) => {
    const owner = log.owner || 'admin';
    if (!stats[owner]) {
      stats[owner] = { success: 0, deferred: 0, error: 0 };
    }
    const key = log.status === 'success' ? 'success' : log.status === 'deferred' ? 'deferred' : 'error';
    stats[owner][key] += 1;
    totals[key] += 1;
  });

  const lines = [
    'HubMSG Gönderim Özeti',
    '----------------------------',
    formatLogLine('Zaman Aralığı', 'Son 20 dakika'),
    formatLogLine('Saat', formatAzTimestamp()),
    formatLogLine('Başarılı', totals.success),
    formatLogLine('Bekleyen', totals.deferred),
    formatLogLine('Başarısız', totals.error),
    '',
    'Bayi Bazında:'
  ];

  Object.keys(stats).sort().forEach((owner) => {
    const row = stats[owner];
    lines.push(`${owner}: ${row.success} başarılı, ${row.deferred} bekleyen, ${row.error} başarısız`);
  });

  lines.push('----------------------------');
  return lines.join('\n');
}

// Startup Notification Context
const startupLogContext = {
  active: false,
  totalToLoad: 0,
  results: {}, // sessionId -> { label, owner, status, error, jid }
  timer: null,
  sent: false
};

function generateDetailedSystemReport(type = 'BOOT_COMPLETE') {
  const sessionList = Array.from(clientSessions.values())
    .filter((session) => !isDemoSessionForReport(session))
    .map(s => {
    let jid = null;
    try {
      if (s.client && s.client.user) {
        jid = s.client.user.id.split(':')[0];
      }
    } catch (e) { }

    return {
      label: s.label,
      owner: s.owner,
      status: s.ready ? 'ready' : 'failed',
      statusLabel: getFriendlySessionState(s.ready ? 'ready' : 'failed', s.statusMessage || ''),
      jid: jid,
      error: s.statusMessage || 'Naməlum xəta'
    };
  });

  const total = sessionList.length;
  const connected = sessionList.filter(r => r.status === 'ready');
  const failed = sessionList.filter(r => r.status === 'failed');

  const totalUsers = Object.keys(usersStore).length;
  const dealers = Object.values(usersStore).filter(u => u.role === 'dealer' || u.role === 'bayi').length;
  const totalDevicesStored = Object.keys(sessionsStore).length;
  const queueTotals = {
    queued: Number(queueStatusTotals.queued) || 0,
    sending: Number(queueStatusTotals.iletiliyor) || 0,
    delivered: Number(queueStatusTotals.iletildi) || 0,
    failed: Number(queueStatusTotals.hata) || 0
  };
  const dispatchAttempts = queueTotals.delivered + queueTotals.failed;
  const dispatchSuccessRate = calculatePercent(queueTotals.delivered, dispatchAttempts);
  const sessionHealthRate = calculatePercent(connected.length, total);
  const completionRate = calculatePercent(
    queueTotals.delivered,
    queueTotals.delivered + queueTotals.failed + queueTotals.queued + queueTotals.sending
  );
  const primarySuccessRate = dispatchAttempts > 0 ? dispatchSuccessRate : sessionHealthRate;

  const graphBlock = [
    '```',
    `${padTableCell('Gönderim Başarı', 16)} ${renderPercentBar(primarySuccessRate)} ${formatPercent(primarySuccessRate)}`,
    `${padTableCell('Oturum Sağlığı', 16)} ${renderPercentBar(sessionHealthRate)} ${formatPercent(sessionHealthRate)}`,
    `${padTableCell('Tamamlanma', 16)} ${renderPercentBar(completionRate)} ${formatPercent(completionRate)}`,
    '```'
  ].join('\n');

  const overviewTable = buildTextTable(
    ['Metrik', 'Değer'],
    [
      ['Kullanıcı', totalUsers],
      ['Bayi', dealers],
      ['Cihaz', totalDevicesStored],
      ['Aktif Oturum', connected.length],
      ['Sorunlu Oturum', failed.length],
      ['Kuyrukta', queueTotals.queued],
      ['Gönderiliyor', queueTotals.sending],
      ['Gönderildi', queueTotals.delivered],
      ['Hatalı', queueTotals.failed]
    ],
    [18, 10]
  );

  const deviceRows = sessionList.map((session, index) => ([
    index + 1,
    session.label || '-',
    session.owner || '-',
    session.statusLabel
  ]));

  const deviceTable = buildTextTable(
    ['No', 'Cihaz', 'Bayi', 'Durum'],
    deviceRows,
    [3, 24, 14, 14]
  );

  const ownerSummary = {};
  sessionList.forEach((session) => {
    const owner = session.owner || 'admin';
    if (!ownerSummary[owner]) {
      ownerSummary[owner] = { ready: 0, problem: 0 };
    }
    if (session.status === 'ready') ownerSummary[owner].ready += 1;
    else ownerSummary[owner].problem += 1;
  });

  const ownerTable = buildTextTable(
    ['Bayi', 'Hazır', 'Sorunlu'],
    Object.keys(ownerSummary)
      .sort()
      .map((owner) => [owner, ownerSummary[owner].ready, ownerSummary[owner].problem]),
    [18, 7, 8]
  );

  let message = `HubMSG Sistem Durumu\n`;
  message += `----------------------------\n`;
  message += `${formatLogLine('Olay', type)}\n`;
  message += `${formatLogLine('Saat', formatAzTimestamp())}\n`;
  message += `${formatLogLine('Başarı Oranı', formatPercent(primarySuccessRate))}\n`;
  message += `${formatLogLine('Oturum Sağlığı', formatPercent(sessionHealthRate))}\n\n`;
  message += `Grafik:\n${graphBlock}\n\n`;
  message += `Genel Tablo:\n${overviewTable}\n\n`;
  message += `Cihaz Tablosu:\n${deviceTable}\n\n`;
  message += `Bayi Özeti:\n${ownerTable}`;

  message += `----------------------------`;
  return message;
}

async function finalizeStartupLog() {
  if (startupLogContext.sent) return;
  startupLogContext.sent = true;
  if (startupLogContext.timer) clearTimeout(startupLogContext.timer);

  const message = generateDetailedSystemReport('BOOT_COMPLETE');

  // Find ANY ready session to send the log, admin preferred
  let loggerMeta = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);

  if (!loggerMeta) {
    console.error('[startup-log] No active session found to send startup summary.');
    return;
  }

  try {
    for (const jid of EXTERNAL_LOG_NUMBERS) {
      await loggerMeta.client.sendMessage(jid, { text: message });
    }
    console.log('[startup-log] Startup summary sent to managers.');
  } catch (err) {
    console.error('[startup-log] Error sending startup summary:', err.message);
  }
}

async function sendInstantLogToManagers(nextEntry, succeeded, errorMsg) {
  // If no manager numbers, skip
  if (!EXTERNAL_LOG_NUMBERS.length) return;

  // Find ANY ready session to send the log, admin preferred
  let loggerMeta = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);

  if (!loggerMeta) return;

  try {
    const logText = buildWhatsappDispatchLog(nextEntry, succeeded, errorMsg, {
      title: 'MESSAGE DISPATCH',
      previewLength: 120
    });

    for (const jid of EXTERNAL_LOG_NUMBERS) {
      await loggerMeta.client.sendMessage(jid, { text: logText });
    }
  } catch (err) {
    console.error('[instant-log] Göndərilərkən xəta:', err.message);
  }
}

const systemLogBuffer = [];
const SYSTEM_LOG_BATCH_INTERVAL = 5 * 60 * 1000; // 5 minutes batching for system issues

async function sendBatchedSystemLogs() {
  if (systemLogBuffer.length === 0) return;

  let loggerMeta = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);
  if (!loggerMeta) loggerMeta = Array.from(clientSessions.values()).find(s => s.ready && s.client);
  if (!loggerMeta) return;

  try {
    const logs = [...systemLogBuffer];
    systemLogBuffer.length = 0; // Clear buffer after taking snapshot

    const report = buildSystemAlertBatchReport(logs);

    for (const jid of EXTERNAL_LOG_NUMBERS) {
      await loggerMeta.client.sendMessage(jid, { text: report });
    }
  } catch (err) {
    console.error('[system-batch-log] Xəta:', err.message);
  }
}
setInterval(sendBatchedSystemLogs, SYSTEM_LOG_BATCH_INTERVAL);

// External Logging Interval (20 minutes)
const LOG_INTERVAL_MS = 20 * 60 * 1000;

async function sendExternalLogs() {
  if (externalLogBuffer.length === 0) return;

  // Find admin session
  const adminMeta = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);
  if (!adminMeta) {
    console.log('[external-log] Admin hazır cihazı yoxdur, log göndərilmədi.');
    return;
  }

  try {
    const logs = [...externalLogBuffer];
    externalLogBuffer.length = 0; // Clear buffer
    const report = buildExternalDispatchSummary(logs);

    for (const jid of EXTERNAL_LOG_NUMBERS) {
      await adminMeta.client.sendMessage(jid, { text: report });
    }
    console.log('[external-log] Loglar göndərildi.');
  } catch (err) {
    console.error('[external-log] Xəta:', err);
  }
}

setInterval(sendExternalLogs, LOG_INTERVAL_MS);

// Maintenance Watchdog: Auto-heal broken sessions
setInterval(async () => {
  console.log('[watchdog] Running session maintenance logic...');
  const healableSessions = Array.from(clientSessions.values()).filter(s => {
    if (s.ready) return false;
    const msg = (s.statusMessage || '').toLowerCase();
    // Don't auto-heal if we are already trying, initializing, or if it's a permanent close
    if (msg.includes('yenidən başladılır') || msg.includes('hazırlanır') || msg.includes('birdəfəlik bağlandı')) return false;
    // Don't auto-heal if it's a new device waiting for QR
    if (s.qr) return false;
    return true;
  });

  for (const s of healableSessions) {
    console.log(`[watchdog] Attempting to auto-heal broken session: ${s.id} (${s.label})`);
    try {
      await restartClientSession(s.id).catch(() => { });
    } catch (e) {
      console.error(`[watchdog] Auto-heal failed for ${s.id}:`, e.message);
    }
  }
}, 15 * 60 * 1000); // Check every 15 minutes

function generateApiKey() {
  return crypto.randomBytes(16).toString('hex');
}

function ensureAdmin(req, res, next) {
  const provided = req.headers['x-admin-api-key'];
  if (provided !== adminProfile.apiKey) {
    return res.status(401).json({ error: 'Səlahiyyətsiz' });
  }
  next();
}

function getUserByApiKey(key) {
  const username = apiKeysStore[key];
  if (!username) {
    return null;
  }
  return usersStore[username];
}

function resolveApiUserOrReject(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const user = getUserByApiKey(apiKey);
  if (!user) {
    res.status(401).json({ error: 'Etibarlı API açarı tələb olunur' });
    return null;
  }
  if (!isAgreementAccepted(user)) {
    agreementRequiredApiResponse(res);
    return null;
  }
  if (billingSuspendedResponse(req, res, user)) {
    return null;
  }
  return user;
}

function applyApiCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (APP_CORS_ALLOW_ALL) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && APP_CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', APP_CORS_ALLOWED_HEADERS);
  res.setHeader('Access-Control-Allow-Methods', APP_CORS_ALLOWED_METHODS);
  res.setHeader('Access-Control-Max-Age', '86400');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: 'smapi-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Session Store Memory Cleanup Interval
setInterval(() => {
  // express-session memory store automatically handles expiration,
  // but if we were using a custom store, we'd clean it here.
}, 60 * 60 * 1000);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin/assets', express.static(path.join(refineAdminDistDir, 'assets')));
app.use('/mobile/css', express.static(path.join(__dirname, 'mobile', 'css')));
app.use('/mobile/js', express.static(path.join(__dirname, 'mobile', 'js')));
app.use('/api', (req, res, next) => {
  applyApiCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

function registerDevice(info, clientId) {
  const user = info && info.wid ? info.wid.user : null;
  if (!user) {
    return;
  }
  const labelParts = [];
  if (info.pushname) {
    labelParts.push(info.pushname);
  }
  if (info.me && info.me.name && info.me.name.displayName) {
    labelParts.push(info.me.name.displayName);
  }
  const label = labelParts.length ? labelParts.join(' • ') : `WhatsApp cihazı ${user}`;
  const timestamp = new Date().toISOString();
  const platform = info.platform || 'WhatsApp Web';
  const phone = user;
  const iso = deriveIsoFromPhone(phone);
  const existingIndex = connectedDevices.findIndex((device) => device.id === user);
  let owner = 'admin';
  if (existingIndex !== -1) {
    owner = connectedDevices[existingIndex].owner || 'admin';
    connectedDevices.splice(existingIndex, 1);
  }
  const clientMeta = clientSessions.get(clientId);
  if (clientMeta && clientMeta.owner) {
    owner = clientMeta.owner;
  }
  if (!usersStore[owner]) {
    owner = 'admin';
  }

  const deviceInfo = {
    id: user,
    label,
    platform,
    readyAt: timestamp,
    phone,
    iso,
    owner,
    clientId,
    ready: true
  };

  connectedDevices.unshift(deviceInfo);
  logActivity({
    type: 'device.connected',
    owner,
    message: `WhatsApp cihazı qoşuldu: ${phone}`,
    meta: { deviceId: user, clientId }
  });

  let shouldPersist = false;
  Object.keys(usersStore).forEach((username) => {
    if (username === owner) {
      return;
    }
    const record = usersStore[username];
    if (!record || !Array.isArray(record.devices) || !record.devices.length) {
      return;
    }
    if (record.devices.includes(user)) {
      record.devices = record.devices.filter((deviceId) => deviceId !== user);
      shouldPersist = true;
    }
  });

  if (usersStore[owner]) {
    if (!usersStore[owner].devices.includes(user)) {
      usersStore[owner].devices.push(user);
      shouldPersist = true;
    }
  }

  if (shouldPersist) {
    persistUsers();
  }
}

function loadSessions() {
  console.log(`[baileys] Sessiyalar bərpa olunur... ${ISOLATED_TENANT ? `(Sadece tenant: ${ISOLATED_TENANT})` : '(Hamısı)'}`);
  let activeSessions = Object.values(sessionsStore);

  if (ISOLATED_TENANT) {
    activeSessions = activeSessions.filter(s => s.owner === ISOLATED_TENANT);
  } else {
    // Filter out isolated tenants from the main master process
    activeSessions = activeSessions.filter(s => {
      const owner = s.owner || 'admin';
      return !(usersStore[owner] && usersStore[owner].isIsolated);
    });
  }

  if (activeSessions.length === 0) {
    console.log('[baileys] Bərpa olunacaq sessiya tapılmadı, admin-panel başladılır.');
    if (!sessionsStore['admin-panel']) {
      createClientSession('Əsas cihaz', 'admin-panel', 'admin');
    }
    return;
  }

  // Setup Startup Tracker
  startupLogContext.active = true;
  startupLogContext.totalToLoad = activeSessions.length;
  startupLogContext.timer = setTimeout(() => {
    console.log('[startup-log] Safety timeout reached, sending partial report.');
    finalizeStartupLog();
  }, 120000); // 2 minutes max for startup report

  activeSessions.forEach((sessionData, index) => {
    const sId = sessionData.id;

    // Add to results tracker
    startupLogContext.results[sId] = {
      label: sessionData.label,
      owner: sessionData.owner || 'admin',
      status: 'pending',
      error: null
    };

    setTimeout(() => {
      console.log(`[baileys] Bərpa olunur: ${sId} (${sessionData.label}) - [${index + 1}/${activeSessions.length}]`);
      const sessionDir = path.join(dataDir, 'sessions', sId);
      const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));

      const meta = {
        id: sId,
        label: sessionData.label,
        owner: sessionData.owner || 'admin',
        ready: false,
        status: hasCreds ? 'initializing' : 'disconnected',
        statusMessage: hasCreds ? 'Bərpa olunur...' : 'Bağlanmaq üçün QR kod təzələyin',
        qr: null,
        lastQrAt: null,
        lastUpdated: Date.now(),
        createdAt: sessionData.createdAt || new Date().toISOString(),
        client: null,
        restartPromise: null
      };
      clientSessions.set(sId, meta);

      if (hasCreds) {
        attachClientToSession(meta).catch(err => {
          console.error(`[baileys] ${sId} bərpa edilərkən xəta:`, err.message);
          if (startupLogContext.results[sId]) {
            startupLogContext.results[sId].status = 'failed';
            startupLogContext.results[sId].error = err.message;
            checkStartupComplete();
          }
        });
      } else {
        console.log(`[baileys] ${sId} üçün creds.json tapılmadı, gözlənilir.`);
        if (startupLogContext.results[sId]) {
          startupLogContext.results[sId].status = 'failed';
          startupLogContext.results[sId].error = 'Creds not found';
          checkStartupComplete();
        }
      }
    }, index * 2000);
  });

  // Update clientIndex to avoid label conflicts
  clientIndex = activeSessions.length + 1;
}

function ensureDemoDevices() {
  const nowIso = new Date().toISOString();
  for (const fixture of DEMO_DEVICE_FIXTURES) {
    if (!clientSessions.has(fixture.clientId)) {
      clientSessions.set(fixture.clientId, {
        id: fixture.clientId,
        label: fixture.sessionLabel,
        owner: fixture.owner,
        ready: true,
        status: 'ready',
        statusMessage: 'Demo cihaz hazırdır',
        qr: null,
        lastQrAt: null,
        lastUpdated: Date.now(),
        createdAt: nowIso,
        client: null,
        restartPromise: null,
        demo: true
      });
    }

    const existingIndex = connectedDevices.findIndex((device) => device.id === fixture.id);
    const demoDevice = {
      id: fixture.id,
      label: fixture.label,
      platform: fixture.platform,
      readyAt: nowIso,
      phone: fixture.phone,
      iso: fixture.iso,
      owner: fixture.owner,
      clientId: fixture.clientId,
      ready: true,
      demo: true
    };

    if (existingIndex === -1) {
      connectedDevices.push(demoDevice);
    } else {
      connectedDevices[existingIndex] = {
        ...connectedDevices[existingIndex],
        ...demoDevice
      };
    }

    getOrCreateDeviceHealth(fixture.id);
  }
}

function checkStartupComplete() {
  if (!startupLogContext.active || startupLogContext.sent) return;
  const results = Object.values(startupLogContext.results);
  const finished = results.filter(r => r.status !== 'pending');
  if (finished.length >= startupLogContext.totalToLoad) {
    console.log('[startup-log] All initial sessions processed, sending report.');
    // Small delay to ensure things settle (e.g. admin session ready)
    setTimeout(finalizeStartupLog, 5000);
  }
}

// Template Management Routes
app.get('/admin/templates', (req, res) => {
  const user = getStoredSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Səlahiyyətsiz' });

  const userTemplates = templatesStore.filter(t => t.owner === user.username);
  res.json(userTemplates);
});

app.post('/admin/templates', (req, res) => {
  const user = getStoredSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Səlahiyyətsiz' });

  const { id, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Başlıq və məzmun mütləqdir' });

  if (id) {
    const idx = templatesStore.findIndex(t => t.id === id && t.owner === user.username);
    if (idx !== -1) {
      templatesStore[idx] = { ...templatesStore[idx], title, content };
    }
  } else {
    templatesStore.push({
      id: crypto.randomUUID(),
      owner: user.username,
      title,
      content,
      createdAt: new Date().toISOString()
    });
  }

  writeJson(templatesPath, templatesStore);
  res.json({ ok: true });
});

app.delete('/admin/templates/:id', (req, res) => {
  const user = getStoredSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Səlahiyyətsiz' });

  const id = req.params.id;
  templatesStore = templatesStore.filter(t => !(t.id === id && t.owner === user.username));
  writeJson(templatesPath, templatesStore);
  res.json({ ok: true });
});

loadSessions();
ensureDemoDevices();

app.get('/admin/clients', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdminUser = !!(sessionUser && sessionUser.role === 'admin');
  const sessionUsername = sessionUser ? sessionUser.username : null;
  const sessions = getClientSummaries();
  const filtered = isAdminUser
    ? sessions
    : sessions.filter((session) => session && session.owner === sessionUsername);
  res.json({ sessions: filtered });
});

app.post('/admin/clients', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const sessionUsername = sessionUser ? sessionUser.username : null;
  const isAdminUser = !!(sessionUser && sessionUser.role === 'admin');
  const requestedOwnerRaw =
    (req.body && typeof req.body.owner === 'string' ? req.body.owner.trim() : null) ||
    (req.query && typeof req.query.owner === 'string' ? req.query.owner.trim() : null);
  const requestedOwner = resolveUsername(requestedOwnerRaw);

  if (!isAdminUser && requestedOwner && sessionUsername && requestedOwner !== sessionUsername) {
    return res.status(403).json({ error: 'Bu əməliyyatı yerinə yetirməyə icazəniz yoxdur' });
  }

  let owner = sessionUsername || null;

  if (isAdminUser && requestedOwner) {
    if (!usersStore[requestedOwner]) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
    }
    if (requestedOwner !== 'admin' && usersStore[requestedOwner].role !== 'dealer') {
      return res.status(400).json({ error: 'Yalnız bayilər seçilə bilər' });
    }
    owner = requestedOwner;
  } else if (!owner && requestedOwner) {
    owner = requestedOwner;
  }

  if (!owner) {
    owner = 'admin';
  }

  if (!usersStore[owner]) {
    owner = 'admin';
  }

  if (!canAssignDeviceToUser(owner)) {
    return res.status(429).json({ error: 'Cihaz limiti doludur' });
  }

  const label = (req.body && typeof req.body.label === 'string' ? req.body.label.trim() : null) || 'Yeni Cihaz';

  const session = createClientSession(label, undefined, owner);
  res.json({ session: serializeSession(session) });
});

app.post('/admin/clients/:id/refresh', ensureAuthenticated, async (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdminUser = !!(sessionUser && sessionUser.role === 'admin');
  const sessionUsername = sessionUser ? sessionUser.username : null;
  const sessionId = req.params.id;
  const meta = clientSessions.get(sessionId);
  if (!meta) {
    return res.status(404).json({ error: 'Cihaz tapılmadı' });
  }
  if (!isAdminUser && meta.owner !== sessionUsername) {
    return res.status(403).json({ error: 'Bu cihaz üçün icazəniz yoxdur' });
  }
  try {
    const session = await restartClientSession(sessionId);
    res.json({ session: serializeSession(session) });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.delete('/admin/clients/:id', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdminUser = !!(sessionUser && sessionUser.role === 'admin');
  const sessionUsername = sessionUser ? sessionUser.username : null;
  const sessionId = req.params.id;
  const meta = clientSessions.get(sessionId);
  if (!meta) {
    return res.status(404).json({ error: 'Cihaz tapılmadı' });
  }
  if (!isAdminUser && meta.owner !== sessionUsername) {
    return res.status(403).json({ error: 'Bu cihaz üçün icazəniz yoxdur' });
  }
  try {
    const deleted = deleteClientSession(sessionId);
    return res.json({ ok: true, session: serializeSession(deleted) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Sessiya silinmədi' });
  }
});

app.get('/admin/devices', ensureAuthenticated, (req, res) => {
  const sessionUser = req.session.user;
  const isAdminUser = !!(sessionUser && sessionUser.role === 'admin');
  const filtered = isAdminUser
    ? connectedDevices
    : connectedDevices.filter((d) => d.owner === sessionUser.username);
  const devices = filtered.map((device) => ({
    ...device,
    health: getDeviceHealthSnapshot(device.id, device.owner || 'admin')
  }));
  return res.json({ devices });
});

app.delete('/admin/devices/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const sessionUser = req.session.user;
  if (!sessionUser || sessionUser.role !== 'admin') {
    return res.status(403).json({ error: 'Bu əməliyyat yalnız admin üçündür' });
  }
  const targetIndex = connectedDevices.findIndex((device) => device.id === id);
  if (targetIndex === -1) {
    return res.status(404).json({ error: 'Cihaz tapılmadı' });
  }
  const device = connectedDevices[targetIndex];

  connectedDevices.splice(targetIndex, 1);
  deviceHealthById.delete(device.id);
  if (usersStore[device.owner]) {
    usersStore[device.owner].devices = usersStore[device.owner].devices.filter((d) => d !== id);
    persistUsers();
  }

  return res.json({ ok: true });
});

app.get('/admin/queue', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
  const ownerUsername = isAdmin ? null : sessionUser.username;
  const filteredQueue = ownerUsername
    ? dashboardState.queuedMessages.filter((entry) => entry.owner === ownerUsername)
    : dashboardState.queuedMessages;
  const preview = filteredQueue.slice(-QUEUE_PREVIEW_LIMIT).reverse();
  const totalsSource = isAdmin
    ? queueStatusTotals
    : getQueueTotalsForOwner(ownerUsername || 'admin');
  const totals = {
    queued: Number(totalsSource.queued) || 0,
    iletiliyor: Number(totalsSource.iletiliyor) || 0,
    iletildi: Number(totalsSource.iletildi) || 0,
    hata: Number(totalsSource.hata) || 0
  };
  res.json({
    queue: preview,
    totals,
    total: totals.queued + totals.iletiliyor + totals.iletildi + totals.hata
  });
});

function buildOpsMetricsForOwner(owner = null, hours = 24) {
  const normalizedHours = Math.max(1, Math.min(Number(hours) || 24, 24 * 30));
  const sinceMs = Date.now() - normalizedHours * 60 * 60 * 1000;
  const ownerFilter = owner ? String(owner) : null;
  const visibleLogs = ownerFilter
    ? messageDispatchLogs.filter((entry) => (entry.owner || 'admin') === ownerFilter)
    : messageDispatchLogs;

  let totalDispatches = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let blockedCount = 0;
  const uniqueRecipients = new Set();
  for (let i = visibleLogs.length - 1; i >= 0; i -= 1) {
    const entry = visibleLogs[i];
    if (!entry) continue;
    const at = new Date(entry.sentAt || entry.lastAttempt || entry.updatedAt || entry.createdAt || 0).getTime();
    if (!Number.isFinite(at) || at < sinceMs) continue;
    const status = entry.status || 'queued';
    if (status !== 'iletildi' && status !== 'hata') continue;
    totalDispatches += 1;
    if (entry.recipient) uniqueRecipients.add(String(entry.recipient));
    if (status === 'iletildi') {
      deliveredCount += 1;
    } else {
      failedCount += 1;
      if (isBlockedRecipientError(entry.error || '')) {
        blockedCount += 1;
      }
    }
  }

  const devices = ownerFilter
    ? connectedDevices.filter((device) => (device.owner || 'admin') === ownerFilter)
    : connectedDevices;
  const riskyDevices = devices
    .map((device) => {
      const health = getDeviceHealthSnapshot(device.id, device.owner || 'admin');
      return {
        id: device.id,
        label: device.label || device.id,
        owner: device.owner || 'admin',
        phone: device.phone || null,
        iso: device.iso || '',
        suspended: !!health.suspended,
        suspendedReason: health.suspendedReason || null,
        errorRate: Number(health.errorRate) || 0,
        consecutiveFailures: Number(health.consecutiveFailures) || 0,
        lastError: health.lastError || null,
        lastErrorAt: health.lastErrorAt || null,
        totalSent: Number(health.totalSent) || 0,
        totalFailed: Number(health.totalFailed) || 0
      };
    })
    .filter((item) => item.suspended || item.errorRate >= 0.2 || item.consecutiveFailures >= 2)
    .sort((a, b) => {
      if (a.suspended !== b.suspended) return a.suspended ? -1 : 1;
      if (a.errorRate !== b.errorRate) return b.errorRate - a.errorRate;
      return b.consecutiveFailures - a.consecutiveFailures;
    })
    .slice(0, 50);

  const successRate = totalDispatches > 0
    ? Number(((deliveredCount / totalDispatches) * 100).toFixed(1))
    : 0;

  return {
    hours: normalizedHours,
    windowStart: new Date(sinceMs).toISOString(),
    totalDispatches,
    deliveredCount,
    failedCount,
    blockedCount,
    successRate,
    uniqueRecipients: uniqueRecipients.size,
    suspendedCount: riskyDevices.filter((d) => d.suspended).length,
    riskyDevices
  };
}

app.get('/admin/ops-metrics', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
  const sessionUsername = sessionUser ? sessionUser.username : null;
  const hoursRaw = parseInt(req.query.hours, 10);
  const hours = Number.isNaN(hoursRaw) ? 24 : Math.max(1, Math.min(hoursRaw, 24 * 30));
  const metrics = buildOpsMetricsForOwner(isAdmin ? null : (sessionUsername || 'admin'), hours);
  res.json(metrics);
});

function safeParseTimeMs(value) {
  const ts = new Date(value || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function buildTopBlockedRows(logs, limit = 15) {
  const blockedByRecipient = new Map();
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const entry = logs[i];
    if (!entry || (entry.status || '') !== 'hata') continue;
    if (!isBlockedRecipientError(entry.error || '')) continue;
    const owner = entry.owner || 'admin';
    const recipient = (entry.recipient || '').toString().trim();
    if (!recipient) continue;
    const recipientDigits = recipient.replace(/\D/g, '') || recipient;
    const key = `${owner}:${recipientDigits}`;
    const atValue = extractEventAt(entry);
    const atMs = safeParseTimeMs(atValue);
    const row = blockedByRecipient.get(key) || {
      owner,
      recipient,
      blockedCount: 0,
      lastBlockedAt: atValue,
      lastBlockedTs: atMs,
      lastError: entry.error || null
    };
    row.blockedCount += 1;
    if (atMs >= row.lastBlockedTs) {
      row.lastBlockedAt = atValue;
      row.lastBlockedTs = atMs;
      row.lastError = entry.error || row.lastError;
    }
    blockedByRecipient.set(key, row);
  }

  return Array.from(blockedByRecipient.values())
    .sort((a, b) => {
      if (b.blockedCount !== a.blockedCount) return b.blockedCount - a.blockedCount;
      return b.lastBlockedTs - a.lastBlockedTs;
    })
    .slice(0, limit);
}

function buildQueueHealthSnapshot() {
  const now = Date.now();
  const queuedPool = dashboardState.queuedMessages.filter((entry) => (entry.status || 'queued') === 'queued');
  const sendingPool = dashboardState.queuedMessages.filter((entry) => (entry.status || 'queued') === 'iletiliyor');
  const deferredPool = queuedPool.filter((entry) => entry.deferUntil && safeParseTimeMs(entry.deferUntil) > now);
  const expiredDeferredPool = queuedPool.filter((entry) => entry.deferUntil && safeParseTimeMs(entry.deferUntil) <= now);
  const stuckSending = sendingPool
    .filter((entry) => {
      const attemptAt = safeParseTimeMs(entry.lastAttempt || entry.updatedAt || entry.createdAt);
      return attemptAt > 0 && now - attemptAt > STUCK_SENDING_THRESHOLD_MS;
    })
    .map((entry) => ({
      owner: entry.owner || 'admin',
      recipient: entry.recipient || '-',
      label: entry.label || 'Xüsusi',
      ageSec: Math.floor((now - safeParseTimeMs(entry.lastAttempt || entry.updatedAt || entry.createdAt)) / 1000),
      attempts: Number(entry.attempts) || 0,
      deviceId: entry.deviceId || entry.clientId || null
    }))
    .sort((a, b) => b.ageSec - a.ageSec)
    .slice(0, 80);

  const oldestQueued = queuedPool
    .map((entry) => {
      const createdMs = safeParseTimeMs(entry.createdAt || entry.updatedAt || entry.lastAttempt);
      return {
        owner: entry.owner || 'admin',
        recipient: entry.recipient || '-',
        label: entry.label || 'Xüsusi',
        ageSec: createdMs ? Math.floor((now - createdMs) / 1000) : 0,
        deferred: !!entry.deferUntil,
        deferUntil: entry.deferUntil || null,
        attempts: Number(entry.attempts) || 0
      };
    })
    .sort((a, b) => b.ageSec - a.ageSec)
    .slice(0, 80);

  const labelMap = new Map();
  queuedPool.forEach((entry) => {
    const label = (entry.label || 'Xüsusi').toString().trim() || 'Xüsusi';
    if (!labelMap.has(label)) {
      labelMap.set(label, {
        label,
        queuedCount: 0,
        deferredCount: 0,
        ownerCount: 0,
        oldestAgeSec: 0,
        owners: new Set()
      });
    }
    const row = labelMap.get(label);
    const createdMs = safeParseTimeMs(entry.createdAt || entry.updatedAt || entry.lastAttempt);
    const ageSec = createdMs ? Math.floor((now - createdMs) / 1000) : 0;
    row.queuedCount += 1;
    if (entry.deferUntil && safeParseTimeMs(entry.deferUntil) > now) row.deferredCount += 1;
    row.oldestAgeSec = Math.max(row.oldestAgeSec, ageSec);
    row.owners.add(entry.owner || 'admin');
  });

  const pendingByLabel = Array.from(labelMap.values())
    .map((row) => ({
      label: row.label,
      queuedCount: row.queuedCount,
      deferredCount: row.deferredCount,
      ownerCount: row.owners.size,
      oldestAgeSec: row.oldestAgeSec
    }))
    .sort((a, b) => {
      if (b.queuedCount !== a.queuedCount) return b.queuedCount - a.queuedCount;
      return b.oldestAgeSec - a.oldestAgeSec;
    })
    .slice(0, 40);

  return {
    queueLength: dashboardState.queuedMessages.length,
    queueLimit: dashboardState.maxQueueLength,
    queueLoadPercent: Math.round((dashboardState.queuedMessages.length / Math.max(1, dashboardState.maxQueueLength)) * 100),
    queuedCount: queuedPool.length,
    sendingCount: sendingPool.length,
    deferredCount: deferredPool.length,
    expiredDeferredCount: expiredDeferredPool.length,
    stuckSendingCount: stuckSending.length,
    pendingByLabel,
    oldestQueued,
    stuckSending
  };
}

function buildLoopHealthSnapshot() {
  const now = Date.now();
  return Object.values(systemLoopHealth).map((loop) => {
    const lastRunAtMs = loop.lastRunAt || 0;
    const sinceLastRunMs = lastRunAtMs ? (now - lastRunAtMs) : null;
    const lagMs = lastRunAtMs ? Math.max(0, sinceLastRunMs - loop.intervalMs) : null;
    let status = 'unknown';
    if (loop.running) status = 'running';
    else if (loop.lastError && sinceLastRunMs != null && sinceLastRunMs < loop.intervalMs * 3) status = 'error';
    else if (sinceLastRunMs == null) status = 'unknown';
    else if (sinceLastRunMs > loop.intervalMs * 3) status = 'delayed';
    else status = 'healthy';

    return {
      key: loop.key,
      label: loop.label,
      status,
      intervalMs: loop.intervalMs,
      running: !!loop.running,
      overlapCount: Number(loop.overlapCount) || 0,
      runCount: Number(loop.runCount) || 0,
      errorCount: Number(loop.errorCount) || 0,
      lastRunAt: loop.lastRunAt ? new Date(loop.lastRunAt).toISOString() : null,
      lastDurationMs: loop.lastDurationMs || 0,
      sinceLastRunMs,
      lagMs,
      lastError: loop.lastError || null
    };
  });
}

app.get('/admin/system-monitor', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const now = Date.now();
  const queue = buildQueueHealthSnapshot();
  const ops = buildOpsMetricsForOwner(null, 24);
  const activeClientCount = Array.from(clientSessions.values()).filter((item) => item && item.ready).length;
  const deviceHealth = connectedDevices.map((device) => ({
    id: device.id,
    label: device.label || device.id,
    owner: device.owner || 'admin',
    health: getDeviceHealthSnapshot(device.id, device.owner || 'admin')
  }));
  const restingDevices = connectedDevices
    .filter((device) => {
      const clientId = device.clientId;
      if (!clientId) return false;
      const restUntil = Number(deviceRestUntil.get(clientId) || 0);
      return restUntil > now;
    })
    .map((device) => ({
      id: device.id,
      label: device.label || device.id,
      owner: device.owner || 'admin',
      restUntil: new Date(Number(deviceRestUntil.get(device.clientId))).toISOString(),
      remainingMs: Math.max(0, Number(deviceRestUntil.get(device.clientId)) - now)
    }))
    .sort((a, b) => b.remainingMs - a.remainingMs)
    .slice(0, 30);

  const ownerDispatch = Array.from(ownerDispatchHealth.entries())
    .map(([owner, stats]) => ({
      owner,
      attempts: Number(stats.attempts) || 0,
      failures: Number(stats.failures) || 0,
      failureRate: stats.attempts > 0 ? Number((stats.failures / stats.attempts).toFixed(3)) : 0,
      pausedUntil: stats.pausedUntil ? new Date(stats.pausedUntil).toISOString() : null,
      pausedReason: stats.pausedReason || null,
      windowStartedAt: stats.windowStartedAt ? new Date(stats.windowStartedAt).toISOString() : null
    }))
    .sort((a, b) => {
      if (!!b.pausedUntil !== !!a.pausedUntil) return b.pausedUntil ? 1 : -1;
      return b.failureRate - a.failureRate;
    });

  const ownerSend = Array.from(ownerSendHistory.entries())
    .map(([owner, stats]) => ({
      owner,
      dayKey: stats.dayKey || null,
      dayCount: Number(stats.dayCount) || 0,
      hourCount: Number(stats.hourCount) || 0,
      lastSentAt: stats.lastSentAt ? new Date(stats.lastSentAt).toISOString() : null,
      burstPauseUntil: stats.burstPauseUntil ? new Date(stats.burstPauseUntil).toISOString() : null
    }))
    .sort((a, b) => b.dayCount - a.dayCount);

  const blockedTop = buildTopBlockedRows(messageDispatchLogs, 20);

  res.json({
    generatedAt: new Date(now).toISOString(),
    queue,
    loops: buildLoopHealthSnapshot(),
    blockedTop,
    owners: {
      dispatch: ownerDispatch,
      send: ownerSend
    },
    devices: {
      total: connectedDevices.length,
      ready: activeClientCount,
      locked: deviceLocks.size,
      suspended: deviceHealth.filter((item) => item.health && item.health.suspended).length,
      resting: restingDevices.length,
      risky: ops.riskyDevices.slice(0, 20),
      restingDevices
    },
    telemetry: {
      ...telemetry,
      averageDispatchMs: telemetry.dispatches > 0
        ? Number((telemetry.totalDurationMs / telemetry.dispatches).toFixed(1))
        : 0
    },
    config: {
      sendIntervalMs: SEND_INTERVAL_MS,
      restBreakBaseMs: REST_BREAK_BASE_MS,
      sendJitterMinMs: SEND_JITTER_MIN_MS,
      sendJitterMaxMs: SEND_JITTER_MAX_MS,
      recipientCooldownMs: RECIPIENT_COOLDOWN_MS,
      recipientDailyMax: RECIPIENT_DAILY_MAX,
      ownerMinIntervalMs: OWNER_MIN_INTERVAL_MS,
      ownerHourlyMax: OWNER_HOURLY_MAX,
      ownerDailyMax: OWNER_DAILY_MAX,
      ownerBurstSize: OWNER_BURST_SIZE,
      ownerBurstPauseMs: OWNER_BURST_PAUSE_MS,
      dispatchScanLimit: DISPATCH_SCAN_LIMIT,
      queueLimit: dashboardState.maxQueueLength,
      stuckSendingThresholdMs: STUCK_SENDING_THRESHOLD_MS
    }
  });
});

function parseSinceTimestamp(value) {
  if (!value) return 0;
  const num = Number(value);
  if (!Number.isNaN(num) && num > 0) {
    return num;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildOwnerNotificationFeed(owner, options = {}) {
  const normalizedOwner = owner || 'admin';
  const since = Math.max(0, Number(options.since) || 0);
  const limit = Math.max(1, Math.min(Number(options.limit) || 100, 500));
  const items = [];
  const seen = new Set();

  for (let i = mobileAnnouncementsStore.length - 1; i >= 0; i -= 1) {
    const item = mobileAnnouncementsStore[i];
    if (!item) continue;
    const targetOwner = item.owner || 'all';
    if (targetOwner !== 'all' && targetOwner !== normalizedOwner) continue;
    const atMs = new Date(item.createdAt || item.at || 0).getTime();
    if (!Number.isFinite(atMs) || atMs <= since) continue;
    const id = item.id || `ann_${i}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      type: item.type || 'campaign',
      title: item.title || 'Bildirim',
      body: item.body || '',
      at: item.createdAt || new Date(atMs).toISOString(),
      owner: targetOwner,
      source: 'announcement'
    });
  }

  for (let i = activityLog.length - 1; i >= 0; i -= 1) {
    const item = activityLog[i];
    if (!item) continue;
    const atMs = new Date(item.at || 0).getTime();
    if (!Number.isFinite(atMs) || atMs <= since) continue;
    const isOwnerMatch = !item.owner || item.owner === normalizedOwner;
    if (!isOwnerMatch) continue;
    const type = item.type || '';
    if (type !== 'dealer.limit_updated' && type !== 'owner.queue_paused' && type !== 'owner.queue_resumed' && type !== 'device.suspended') {
      continue;
    }
    const id = `act_${type}_${atMs}_${i}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      type,
      title: type === 'dealer.limit_updated' ? 'Limit yeniləndi' : 'Sistem bildirişi',
      body: item.message || '',
      at: item.at || new Date(atMs).toISOString(),
      owner: item.owner || 'all',
      source: 'activity'
    });
  }

  let failedCount = 0;
  for (let i = messageDispatchLogs.length - 1; i >= 0; i -= 1) {
    if (failedCount >= 250) break;
    const log = messageDispatchLogs[i];
    if (!log || (log.owner || 'admin') !== normalizedOwner) continue;
    if ((log.status || '') !== 'hata') continue;
    const atValue = log.sentAt || log.lastAttempt || log.updatedAt || log.createdAt;
    const atMs = new Date(atValue || 0).getTime();
    if (!Number.isFinite(atMs) || atMs <= since) continue;
    const id = `fail_${log.id || `${atMs}_${i}`}`;
    if (seen.has(id)) continue;
    seen.add(id);
    failedCount += 1;
    items.push({
      id,
      type: 'failed_send',
      title: 'Uğursuz göndəriş',
      body: `${log.recipient || '-'} · ${log.error || 'Xəta səbəbi alınmadı'}`,
      at: atValue || new Date(atMs).toISOString(),
      owner: normalizedOwner,
      source: 'dispatch'
    });
  }

  return items
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
    .slice(0, limit);
}

app.get('/mobile/notifications/feed', ensureAuthenticated, (req, res) => {
  const owner = getSessionUsername(req) || 'admin';
  const since = parseSinceTimestamp(req.query.since);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 100 : limitRaw;
  const notifications = buildOwnerNotificationFeed(owner, { since, limit });
  res.json({ notifications, owner, since });
});

app.get('/api/mobile/notifications', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;
  const since = parseSinceTimestamp(req.query.since);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 100 : limitRaw;
  const notifications = buildOwnerNotificationFeed(user.username, { since, limit });
  return res.json({
    notifications,
    owner: user.username,
    since
  });
});

app.get('/api/mobile/overview', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const hoursRaw = parseInt(req.query.hours, 10);
  const hours = Number.isNaN(hoursRaw) ? 24 : Math.max(1, Math.min(hoursRaw, 24 * 30));
  const owner = user.username;
  const queueTotalsRaw = getQueueTotalsForOwner(owner);
  const queueTotals = {
    queued: Number(queueTotalsRaw.queued) || 0,
    iletiliyor: Number(queueTotalsRaw.iletiliyor) || 0,
    iletildi: Number(queueTotalsRaw.iletildi) || 0,
    hata: Number(queueTotalsRaw.hata) || 0
  };
  const ops = buildOpsMetricsForOwner(owner, hours);
  const devices = connectedDevices.filter((device) => (device.owner || 'admin') === owner);
  const countrySet = new Set();
  devices.forEach((device) => {
    const iso = (device.iso || deriveIsoFromPhone(device.phone || device.id || '') || '').toUpperCase();
    if (iso) countrySet.add(iso);
  });

  return res.json({
    owner,
    generatedAt: new Date().toISOString(),
    hours: ops.hours,
    stats: {
      sessions: devices.length,
      pendingMessages: queueTotals.queued,
      deliveredMessages: queueTotals.iletildi,
      failedMessages: queueTotals.hata,
      successRate: ops.successRate,
      blockedCount: ops.blockedCount,
      riskyDeviceCount: ops.riskyDevices.length
    },
    queue: queueTotals,
    devices: {
      total: devices.length,
      countries: countrySet.size,
      suspended: ops.suspendedCount
    },
    metrics: ops
  });
});

app.get('/api/mobile/message-logs', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const statusesFilter = new Set(parseMultiFilterValue(req.query.statuses));
  const devicesFilter = new Set(parseMultiFilterValue(req.query.devices));
  const nodesFilter = new Set(parseMultiFilterValue(req.query.nodes));
  const searchTerm = (req.query.q || '').toString().trim().toLowerCase();
  const fromDate = parseIsoDateValue(req.query.from, false);
  const toDate = parseIsoDateValue(req.query.to, true);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 200 : Math.max(1, Math.min(limitRaw, 1000));

  const owner = user.username;
  const visibleLogs = messageDispatchLogs.filter((entry) => (entry.owner || 'admin') === owner);

  const filteredLogs = visibleLogs
    .filter((entry) => {
      const status = entry.status || 'queued';
      const device = entry.deviceId || entry.clientId || '';
      const node = entry.nodeLabel || entry.nodeId || '';
      const eventAt = entry.sentAt || entry.lastAttempt || entry.createdAt || entry.updatedAt;
      const eventDate = eventAt ? new Date(eventAt) : null;

      if (statusesFilter.size && !statusesFilter.has(status)) return false;
      if (devicesFilter.size && !devicesFilter.has(device)) return false;
      if (nodesFilter.size && !nodesFilter.has(node)) return false;

      if (fromDate || toDate) {
        if (!eventDate || Number.isNaN(eventDate.getTime())) return false;
        if (fromDate && eventDate < fromDate) return false;
        if (toDate && eventDate > toDate) return false;
      }

      if (searchTerm) {
        const haystack = [
          entry.id,
          entry.refCode,
          owner,
          entry.label,
          entry.recipient,
          entry.normalizedRecipient,
          entry.snippet,
          entry.error,
          device,
          entry.nodeId,
          entry.nodeLabel,
          entry.deviceLabel
        ]
          .filter((value) => value != null)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.sentAt || b.lastAttempt || b.createdAt || b.updatedAt || 0).getTime() -
        new Date(a.sentAt || a.lastAttempt || a.createdAt || a.updatedAt || 0).getTime()
    );

  const logs = filteredLogs.slice(0, limit).map((entry) => ({
    id: entry.id || null,
    refCode: entry.refCode || null,
    owner: entry.owner || 'admin',
    label: entry.label || null,
    recipient: entry.recipient || null,
    normalizedRecipient: entry.normalizedRecipient || null,
    snippet: entry.snippet || '',
    status: entry.status || 'queued',
    error: entry.error || null,
    createdAt: entry.createdAt || null,
    sentAt: entry.sentAt || null,
    lastAttempt: entry.lastAttempt || null,
    updatedAt: entry.updatedAt || null,
    deviceId: entry.deviceId || null,
    deviceLabel: entry.deviceLabel || null,
    clientId: entry.clientId || null,
    nodeId: entry.nodeId || entry.clientId || null,
    nodeLabel: entry.nodeLabel || null
  }));

  return res.json({
    logs,
    total: filteredLogs.length,
    limit,
    filterOptions: {
      statuses: Array.from(new Set(visibleLogs.map((entry) => entry.status || 'queued'))).sort(),
      devices: Array.from(
        new Set(
          visibleLogs
            .map((entry) => entry.deviceId || entry.clientId)
            .filter((value) => !!value)
        )
      ).sort(),
      nodes: Array.from(
        new Set(
          visibleLogs
            .map((entry) => entry.nodeLabel || entry.nodeId)
            .filter((value) => !!value)
        )
      ).sort()
    }
  });
});

app.get('/api/mobile/agreement', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const existing = user.agreement || null;
  return res.json({
    owner: user.username,
    title: AGREEMENT_TITLE,
    version: AGREEMENT_VERSION,
    text: AGREEMENT_TEXT,
    required: !isAgreementAccepted(user),
    existing: existing ? {
      fullName: existing.fullName || '',
      signedAt: existing.signedAt || null,
      version: existing.version || null
    } : null
  });
});

app.post('/api/mobile/agreement/sign', async (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const fullName = (req.body.fullName || '').toString().trim();
  const accepted = req.body.accepted === true;
  const confirmLegal = req.body.confirmLegal === true;
  const confirmFraud = req.body.confirmFraud === true;

  if (fullName.length < 5) {
    return res.status(400).json({ error: 'Ad soyad en az 5 karakter olmalıdır.' });
  }
  if (!accepted || !confirmLegal || !confirmFraud) {
    return res.status(400).json({ error: 'Devam etmek için tüm onay kutularını işaretleyin.' });
  }

  try {
    const ip = getRequestIp(req);
    const userAgent = (req.headers['user-agent'] || '').toString();
    const signResult = await signAgreementForUser({
      user,
      fullName,
      ip,
      userAgent
    });

    logActivity({
      type: 'legal.agreement.signed',
      owner: user.username,
      message: `Kullanım sözleşmesi mobil API üzerinden imzalandı (${AGREEMENT_VERSION})`,
      meta: { ip, pdfFile: signResult.pdfInfo.fileName, source: 'mobile_api' }
    });

    return res.json({
      ok: true,
      version: AGREEMENT_VERSION,
      signedAt: signResult.signedAt
    });
  } catch (error) {
    console.error('Mobile agreement sign error:', error);
    return res.status(500).json({ error: 'Sözleşme PDF oluşturulamadı.' });
  }
});

app.get('/api/mobile/agreement-documents', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const documents = buildAgreementDocumentsForUser(user).map((item) => ({
    id: item.id,
    title: item.title,
    version: item.version,
    fullName: item.fullName,
    signedAt: item.signedAt,
    source: item.source,
    pdfAvailable: item.pdfAvailable,
    pdfUrl: `/api/mobile/agreement-documents/${encodeURIComponent(item.id)}/pdf`
  }));

  return res.json({
    owner: user.username,
    total: documents.length,
    documents
  });
});

app.get('/api/mobile/agreement-documents/:id/pdf', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const docId = (req.params.id || '').toString().trim();
  if (!docId) {
    return res.status(400).json({ error: 'Sənəd identifikatoru tələb olunur' });
  }

  const doc = buildAgreementDocumentsForUser(user).find((item) => item.id === docId);
  if (!doc || !doc.pdfAvailable || !doc.pdfPath || !fs.existsSync(doc.pdfPath)) {
    return res.status(404).json({ error: 'Sənəd tapılmadı' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.pdfFile || 'agreement.pdf'}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(doc.pdfPath);
});

app.get('/api/mobile/password-change-requests', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 50 : Math.max(1, Math.min(limitRaw, 300));
  const requests = passwordChangeRequestsStore
    .filter((entry) => entry && entry.owner === user.username)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      note: entry.note || '',
      status: entry.status || 'pending',
      createdAt: entry.createdAt || null,
      updatedAt: entry.updatedAt || null
    }));

  return res.json({
    owner: user.username,
    total: requests.length,
    requests
  });
});

app.post('/api/mobile/password-change-requests', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;
  if (!isAgreementAccepted(user)) {
    return agreementRequiredApiResponse(res);
  }

  const note = (req.body.note || '').toString().trim();
  if (note.length > 1000) {
    return res.status(400).json({ error: 'Qeyd 1000 simvoldan uzun ola bilməz' });
  }

  const created = addPasswordChangeRequest({
    owner: user.username,
    note,
    ip: getRequestIp(req),
    userAgent: (req.headers['user-agent'] || '').toString(),
    source: 'mobile_api'
  });

  if (!created) {
    return res.status(400).json({ error: 'Şifrə dəyişmə tələbi yaradıla bilmədi' });
  }

  logActivity({
    type: 'security.password_change.requested',
    owner: user.username,
    message: 'Mobil tətbiqdən şifrə dəyişmə tələbi yaradıldı.',
    meta: {
      id: created.id,
      source: created.source,
      notePreview: note ? note.slice(0, 140) : null
    }
  });

  return res.json({
    ok: true,
    request: {
      id: created.id,
      note: created.note,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    }
  });
});

app.get('/admin/mobile/announcements', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 200 : Math.max(1, Math.min(limitRaw, 2000));
  const announcements = mobileAnnouncementsStore
    .slice(-limit)
    .reverse();
  res.json({ announcements });
});

app.post('/admin/mobile/announcements', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const title = (req.body.title || '').toString().trim();
  const body = (req.body.body || '').toString().trim();
  const owner = (req.body.owner || 'all').toString().trim() || 'all';
  const type = (req.body.type || 'campaign').toString().trim() || 'campaign';
  if (!title && !body) {
    return res.status(400).json({ error: 'Başlıq və ya mətn tələb olunur' });
  }
  if (owner !== 'all' && !usersStore[owner]) {
    return res.status(404).json({ error: 'Hədəf istifadəçi tapılmadı' });
  }
  const actor = getSessionUsername(req) || 'admin';
  const announcement = addMobileAnnouncement({
    type,
    title,
    body,
    owner,
    createdBy: actor,
    meta: req.body.meta || null
  });
  if (!announcement) {
    return res.status(400).json({ error: 'Bildirim yaradıla bilmədi' });
  }
  logActivity({
    type: 'mobile.announcement.created',
    owner: owner === 'all' ? null : owner,
    message: `Mobil bildirim yaradıldı: ${title || body}`,
    meta: { owner, type, createdBy: actor, id: announcement.id }
  });
  return res.json({ ok: true, announcement });
});

const BLOCKED_RECIPIENT_ERROR_MARKERS = [
  'blocked',
  'ban',
  'banned',
  'forbidden',
  'not-authorized',
  'unauthorized',
  'too many requests',
  'spam'
];

function isBlockedRecipientError(errorValue) {
  if (!errorValue) return false;
  const text = errorValue.toString().toLowerCase();
  return BLOCKED_RECIPIENT_ERROR_MARKERS.some((marker) => text.includes(marker));
}

function extractEventAt(entry) {
  return entry.sentAt || entry.lastAttempt || entry.updatedAt || entry.createdAt || null;
}

app.get('/admin/blocked-numbers', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
  const sessionUsername = sessionUser ? sessionUser.username : null;

  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 300 : Math.max(1, Math.min(limitRaw, 5000));
  const searchTerm = (req.query.q || '').toString().trim().toLowerCase();

  const visibleLogs = isAdmin
    ? messageDispatchLogs
    : messageDispatchLogs.filter((entry) => (entry.owner || 'admin') === sessionUsername);

  const blockedByRecipient = new Map();
  for (let i = visibleLogs.length - 1; i >= 0; i -= 1) {
    const entry = visibleLogs[i];
    if (!entry) continue;
    if ((entry.status || '') !== 'hata') continue;
    if (!isBlockedRecipientError(entry.error || '')) continue;

    const owner = entry.owner || 'admin';
    const recipient = (entry.recipient || '').toString().trim();
    if (!recipient) continue;
    const recipientDigits = recipient.replace(/\D/g, '') || recipient;
    const key = `${owner}:${recipientDigits}`;
    const eventAt = extractEventAt(entry);
    const eventAtTs = new Date(eventAt || 0).getTime();
    const normalizedTs = Number.isFinite(eventAtTs) ? eventAtTs : 0;

    if (!blockedByRecipient.has(key)) {
      blockedByRecipient.set(key, {
        owner,
        recipient,
        recipientDigits,
        blockedCount: 0,
        lastBlockedAt: eventAt,
        lastBlockedTs: normalizedTs,
        lastError: entry.error || null,
        deviceId: entry.deviceId || entry.clientId || null,
        nodeLabel: entry.nodeLabel || entry.nodeId || null
      });
    }

    const row = blockedByRecipient.get(key);
    row.blockedCount += 1;
    if (normalizedTs >= row.lastBlockedTs) {
      row.lastBlockedAt = eventAt;
      row.lastBlockedTs = normalizedTs;
      row.lastError = entry.error || row.lastError;
      row.deviceId = entry.deviceId || entry.clientId || row.deviceId;
      row.nodeLabel = entry.nodeLabel || entry.nodeId || row.nodeLabel;
    }
  }

  const rows = Array.from(blockedByRecipient.values())
    .filter((row) => {
      if (!searchTerm) return true;
      const haystack = [
        row.recipient,
        row.recipientDigits,
        row.owner,
        row.lastError,
        row.deviceId,
        row.nodeLabel
      ]
        .filter((value) => value != null)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchTerm);
    })
    .sort((a, b) => b.lastBlockedTs - a.lastBlockedTs);

  res.json({
    total: rows.length,
    rows: rows.slice(0, limit).map((row) => ({
      owner: row.owner,
      recipient: row.recipient,
      recipientDigits: row.recipientDigits,
      blockedCount: row.blockedCount,
      lastBlockedAt: row.lastBlockedAt,
      lastError: row.lastError,
      deviceId: row.deviceId,
      nodeLabel: row.nodeLabel
    }))
  });
});

app.post('/admin/devices/:id/health-action', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const { id } = req.params;
  const action = (req.body && req.body.action ? String(req.body.action) : '').trim().toLowerCase();
  const device = connectedDevices.find((item) => item.id === id) || null;

  if (!device && !deviceHealthById.has(id)) {
    return res.status(404).json({ error: 'Cihaz tapılmadı' });
  }

  const owner = (device && device.owner) || 'admin';
  const stats = getOrCreateDeviceHealth(id);

  if (action === 'suspend') {
    const durationRaw = parseInt(req.body && req.body.durationMs, 10);
    const durationMs = Number.isNaN(durationRaw)
      ? 60 * 60 * 1000
      : Math.max(5 * 60 * 1000, Math.min(durationRaw, 7 * 24 * 60 * 60 * 1000));
    suspendDevice(id, 'manual_admin', durationMs, owner);
  } else if (action === 'resume') {
    stats.suspended = false;
    stats.suspendedUntil = null;
    stats.suspendedReason = null;
    stats.consecutiveFailures = 0;
    logActivity({
      type: 'device.reactivated.manual',
      owner,
      message: `Cihaz manuel olaraq aktiv edildi: ${id}`,
      meta: { deviceId: id }
    });
  } else if (action === 'reset') {
    const now = Date.now();
    stats.windowStartedAt = now;
    stats.sentInWindow = 0;
    stats.attemptsWindowStartedAt = now;
    stats.attemptsInWindow = 0;
    stats.totalSent = 0;
    stats.totalFailed = 0;
    stats.consecutiveFailures = 0;
    stats.lastError = null;
    stats.lastErrorAt = null;
    logActivity({
      type: 'device.health_reset',
      owner,
      message: `Cihaz health məlumatları sıfırlandı: ${id}`,
      meta: { deviceId: id }
    });
  } else {
    return res.status(400).json({ error: 'Keçərsiz action' });
  }

  return res.json({
    ok: true,
    action,
    deviceId: id,
    health: getDeviceHealthSnapshot(id, owner)
  });
});

app.get('/admin/message-logs', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
  const sessionUsername = sessionUser ? sessionUser.username : null;

  const statusesFilter = new Set(parseMultiFilterValue(req.query.statuses));
  const devicesFilter = new Set(parseMultiFilterValue(req.query.devices));
  const ownersFilter = new Set(parseMultiFilterValue(req.query.owners));
  const nodesFilter = new Set(parseMultiFilterValue(req.query.nodes));
  const searchTerm = (req.query.q || '').toString().trim().toLowerCase();
  const fromDate = parseIsoDateValue(req.query.from, false);
  const toDate = parseIsoDateValue(req.query.to, true);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 500 : Math.max(1, Math.min(limitRaw, 5000));

  const visibleLogs = isAdmin
    ? messageDispatchLogs
    : messageDispatchLogs.filter((entry) => (entry.owner || 'admin') === sessionUsername);

  const filterOptions = {
    statuses: Array.from(new Set(visibleLogs.map((entry) => entry.status || 'queued'))).sort(),
    devices: Array.from(
      new Set(
        visibleLogs
          .map((entry) => entry.deviceId || entry.clientId)
          .filter((value) => !!value)
      )
    ).sort(),
    nodes: Array.from(
      new Set(
        visibleLogs
          .map((entry) => entry.nodeLabel || entry.nodeId)
          .filter((value) => !!value)
      )
    ).sort(),
    owners: isAdmin
      ? Array.from(new Set(visibleLogs.map((entry) => entry.owner || 'admin'))).sort()
      : []
  };

  const filteredLogs = visibleLogs
    .filter((entry) => {
      const status = entry.status || 'queued';
      const owner = entry.owner || 'admin';
      const device = entry.deviceId || entry.clientId || '';
      const node = entry.nodeLabel || entry.nodeId || '';
      const eventAt = entry.sentAt || entry.lastAttempt || entry.createdAt || entry.updatedAt;
      const eventDate = eventAt ? new Date(eventAt) : null;

      if (statusesFilter.size && !statusesFilter.has(status)) return false;
      if (devicesFilter.size && !devicesFilter.has(device)) return false;
      if (isAdmin && ownersFilter.size && !ownersFilter.has(owner)) return false;
      if (nodesFilter.size && !nodesFilter.has(node)) return false;

      if (fromDate || toDate) {
        if (!eventDate || Number.isNaN(eventDate.getTime())) return false;
        if (fromDate && eventDate < fromDate) return false;
        if (toDate && eventDate > toDate) return false;
      }

      if (searchTerm) {
        const haystack = [
          entry.id,
          entry.refCode,
          owner,
          entry.label,
          entry.recipient,
          entry.normalizedRecipient,
          entry.snippet,
          entry.error,
          device,
          entry.nodeId,
          entry.nodeLabel,
          entry.deviceLabel
        ]
          .filter((value) => value != null)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.sentAt || b.lastAttempt || b.createdAt || b.updatedAt || 0).getTime() -
        new Date(a.sentAt || a.lastAttempt || a.createdAt || a.updatedAt || 0).getTime()
    );

  const total = filteredLogs.length;
  const logs = filteredLogs.slice(0, limit).map((entry) => ({
    id: entry.id || null,
    refCode: entry.refCode || null,
    owner: entry.owner || 'admin',
    label: entry.label || null,
    recipient: entry.recipient || null,
    normalizedRecipient: entry.normalizedRecipient || null,
    snippet: entry.snippet || '',
    status: entry.status || 'queued',
    error: entry.error || null,
    createdAt: entry.createdAt || null,
    sentAt: entry.sentAt || null,
    lastAttempt: entry.lastAttempt || null,
    updatedAt: entry.updatedAt || null,
    deviceId: entry.deviceId || null,
    deviceLabel: entry.deviceLabel || null,
    clientId: entry.clientId || null,
    nodeId: entry.nodeId || entry.clientId || null,
    nodeLabel: entry.nodeLabel || null
  }));

  res.json({
    logs,
    total,
    limit,
    filterOptions
  });
});

function parseLookupNumbers(rawNumbers) {
  if (rawNumbers == null) return [];
  const source = Array.isArray(rawNumbers) ? rawNumbers.join('\n') : String(rawNumbers);
  const seen = new Set();
  const rows = [];

  const addDigits = (value) => {
    const digits = normalizeRecipientDigits(value);
    if (!digits || digits.length < 6 || digits.length > 15) return;
    if (seen.has(digits)) return;
    seen.add(digits);
    rows.push(digits);
  };

  // First, extract phone-like chunks so labels like "no: +994..." are handled.
  const phoneLikeMatches = source.match(/\+?\d[\d\s().-]{4,}\d/g) || [];
  if (phoneLikeMatches.length) {
    phoneLikeMatches.forEach(addDigits);
    return rows;
  }

  // Fallback for simple newline/comma-separated raw inputs.
  source
    .split(/\r?\n|,|;|\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach(addDigits);
  return rows;
}

app.get('/admin/recipient-registry', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
  const sessionOwner = sessionUser && sessionUser.username ? sessionUser.username : 'admin';
  const ownerFilterRaw = (req.query.owner || '').toString().trim();
  const ownerFilter = isAdmin ? ownerFilterRaw : sessionOwner;
  const search = (req.query.q || '').toString().trim().toLowerCase();
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitRaw) ? 500 : Math.max(1, Math.min(limitRaw, 5000));

  const rows = Object.values(recipientRegistryStore || {})
    .filter((row) => {
      if (!row) return false;
      if (ownerFilter && (row.owner || 'admin') !== ownerFilter) return false;
      if (!search) return true;
      const haystack = [
        row.owner,
        row.recipient,
        row.recipientDigits,
        row.displayName,
        row.profileName,
        row.businessName,
        row.statusText,
        row.lastError
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => {
      const aTs = safeParseTimeMs(a.lastSentAt || a.lastLookupAt || a.firstSeenAt);
      const bTs = safeParseTimeMs(b.lastSentAt || b.lastLookupAt || b.firstSeenAt);
      return bTs - aTs;
    })
    .slice(0, limit);

  return res.json({
    total: rows.length,
    limit,
    rows,
    ownerOptions: isAdmin
      ? Object.values(usersStore)
        .map((u) => (u && u.username ? u.username : null))
        .filter(Boolean)
        .sort()
      : [sessionOwner]
  });
});

const handleWhatsappLookup = async (req, res) => {
  try {
    const sessionUser = getSessionUserMeta(req);
    const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
    const sessionOwner = sessionUser && sessionUser.username ? sessionUser.username : 'admin';
    const ownerInput = (req.body.owner || '').toString().trim() || null;
    const owner = isAdmin ? ownerInput : sessionOwner;
    const deviceId = (req.body.deviceId || '').toString().trim() || null;
    const numbers = parseLookupNumbers(
      req.body.numbers ||
      req.body.recipients ||
      req.body.recipient ||
      req.body.no ||
      req.body.phone ||
      req.body.phoneNumber ||
      ''
    );

    if (!numbers.length) {
      return res.status(400).json({ error: 'Yoxlama üçün ən az bir nömrə daxil edin.' });
    }
    if (numbers.length > 300) {
      return res.status(400).json({ error: 'Bir sorğuda maksimum 300 nömrə yoxlana bilər.' });
    }

    const { meta, device } = getLookupClientMeta({ owner, deviceId, allowGlobalFallback: isAdmin });
    if (!meta || !meta.client) {
      return res.status(409).json({ error: 'Lookup üçün hazır WhatsApp sessiyası tapılmadı.' });
    }

    const results = [];
    for (let i = 0; i < numbers.length; i += 1) {
      const digits = numbers[i];
      const jid = normalizeRecipientId(digits);

      try {
        const lookup = await fetchRecipientLookupProfile(meta, jid, digits);
        const row = upsertRecipientRegistry({
          owner: owner || (device && device.owner) || meta.owner || 'admin',
          recipient: `+${digits}`,
          jid,
          lookupAttempted: true,
          ...lookup
        });
        results.push(row);
      } catch (rowErr) {
        const fallback = upsertRecipientRegistry({
          owner: owner || (device && device.owner) || meta.owner || 'admin',
          recipient: `+${digits}`,
          jid,
          lookupAttempted: true,
          exists: null,
          source: 'lookup',
          lookupError: rowErr && rowErr.message ? rowErr.message : String(rowErr)
        });
        results.push(fallback);
      }
    }

    return res.json({
      ok: true,
      checked: numbers.length,
      owner: owner || (device && device.owner) || meta.owner || 'admin',
      deviceId: device ? device.id : null,
      rows: results
    });
  } catch (error) {
    console.error('[lookup] route error:', error);
    return res.status(500).json({
      error: 'Lookup sorğusu emal edilərkən daxili xəta baş verdi.',
      details: error && error.message ? error.message : String(error)
    });
  }
};

app.post('/admin/whatsapp-lookup', ensureAuthenticated, handleWhatsappLookup);
app.post('/api/admin/whatsapp-lookup', ensureAuthenticated, handleWhatsappLookup);
app.post('/whatsapp-lookup', ensureAuthenticated, handleWhatsappLookup);

app.post('/admin/queue/clear', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  clearQueue();
  rebuildQueueStatusTotals();
  dashboardState.lastScanned = new Date().toISOString();
  res.json({ ok: true });
});

function ensureAuthenticated(req, res, next) {
  const mobileAuthPath = req.originalUrl && req.originalUrl.startsWith('/mobile');
  const loginRedirect = mobileAuthPath ? '/mobile/login' : '/login';
  if (!isSessionAuthenticated(req)) {
    return res.redirect(loginRedirect);
  }

  // Check if device is still trusted if 2FA is active
  const username = getSessionUsername(req);
  const user = usersStore[username];

  if (user && user.phoneNumber && user.phoneNumber.length > 5) {
    if (!checkTrustedDevice(req, user)) {
      console.log(`[security] Device revoked for user ${username}, logging out.`);
      req.session.authenticated = false;
      req.session.user = null;
      return res.redirect(loginRedirect);
    }
  }

  const nextPath = sanitizeNextPath(
    req.originalUrl,
    mobileAuthPath ? '/mobile' : '/admin'
  );
  if (!isAgreementBypassPath(req.originalUrl || req.url || '') && !isAgreementAccepted(user)) {
    if (requestPrefersJson(req)) {
      return res.status(403).json({
        error: 'Kullanım sözleşmesini imzalamanız zorunludur.',
        code: 'AGREEMENT_REQUIRED',
        redirect: `/legal/agreement?next=${encodeURIComponent(nextPath)}`
      });
    }
    return res.redirect(`/legal/agreement?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAgreementBypassPath(req.originalUrl || req.url || '') && billingSuspendedResponse(req, res, user)) {
    return;
  }

  return next();
}

function ensureSessionAdmin(req, res, next) {
  const sessionUser = getSessionUserMeta(req);
  if (sessionUser && sessionUser.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Yetkisiz' });
}

function clearQueue() {
  dashboardState.queuedMessages = [];
  persistQueue();
  resetQueueStatusTotals();
}

// Helper to keep context consistent across renders
function buildDashboardContext(req, overrides = {}) {
  refreshDashboardSessions();
  const clientSummaries = dashboardState.sessions;

  const sessionUser = getStoredSessionUser(req);
  const sessionUsername = sessionUser ? sessionUser.username : null;
  const sessionUserRecord = sessionUsername ? usersStore[sessionUsername] : null;
  const profile = sessionUser
    ? {
      username: sessionUser.username,
      apiKey: sessionUser.apiKey,
      agreementSigned: isAgreementAccepted(sessionUserRecord),
      billing: getUserBillingState(sessionUserRecord || sessionUser)
    }
    : adminProfile;
  const isAdmin = !!(sessionUser && sessionUser.role === 'admin');
  const visibleSessions = isAdmin
    ? clientSummaries
    : clientSummaries.filter((session) => session && session.owner === sessionUsername);
  const readyCount = visibleSessions.filter((session) => session.ready).length;
  const waitingQr = visibleSessions.some((session) => session.status === 'qr');
  const queueTotalsForView = isAdmin
    ? queueStatusTotals
    : getQueueTotalsForOwner(sessionUsername || 'admin');
  const queuedMessageCount = Object.values(queueTotalsForView).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
  const queuePool = isAdmin
    ? dashboardState.queuedMessages
    : dashboardState.queuedMessages.filter((entry) => entry.owner === sessionUsername);
  const queuePreview = queuePool
    .slice(-QUEUE_PREVIEW_LIMIT)
    .reverse()
    .map((entry) => ({
      recipient: entry.recipient,
      label: entry.label,
      status: entry.status || 'queued',
      createdAt: entry.createdAt,
      lastAttempt: entry.lastAttempt || entry.sentAt,
      deviceId: entry.deviceId,
      owner: entry.owner,
      refCode: entry.refCode
    }));
  const tickets = ticketsStore.slice().reverse();
  const ownedDevices = isAdmin
    ? connectedDevices
    : connectedDevices.filter((device) => device.owner === sessionUsername);
  const dealers = listDealers();
  const ownerOptions = isAdmin
    ? [
      {
        username: 'admin',
        label: `Admin · ${getUserDeviceCount('admin')}/${getUserDeviceLimit('admin') ?? '∞'}`,
        deviceCount: getUserDeviceCount('admin'),
        deviceLimit: getUserDeviceLimit('admin')
      },
      ...dealers.map((dealer) => ({
        username: dealer.username,
        label: `${dealer.username} · ${dealer.deviceCount || 0}/${dealer.deviceLimit ?? '∞'}`,
        deviceCount: dealer.deviceCount || 0,
        deviceLimit: dealer.deviceLimit ?? null
      }))
    ]
    : [];
  const ownerSummaries = {};
  if (isAdmin) {
    ownerOptions.forEach((option) => {
      const limit = option.deviceLimit;
      const count = option.deviceCount || 0;
      ownerSummaries[option.username] = {
        username: option.username,
        deviceLimit: limit,
        deviceCount: count,
        remaining: limit === null ? null : Math.max(limit - count, 0)
      };
    });
  } else if (sessionUsername) {
    const limit = getUserDeviceLimit(sessionUsername);
    const count = getUserDeviceCount(sessionUsername);
    ownerSummaries[sessionUsername] = {
      username: sessionUsername,
      deviceLimit: limit,
      deviceCount: count,
      remaining: limit === null ? null : Math.max(limit - count, 0)
    };
  }

  const allowedTabs = new Set([
    'devices-section',
    'bulk-section',
    'statistics-section',
    'issues-section',
    'message-logs-section',
    'lookup-section',
    ...(isAdmin ? ['dealers-section', 'legal-agreements-section', 'system-monitor-section'] : [])
  ]);
  const requestedTab = overrides.selectedTab || (req.query && req.query.tab) || 'devices-section';
  const selectedTab = allowedTabs.has(requestedTab) ? requestedTab : 'devices-section';
  const toastMessage = overrides.toastMessage || (req.query && req.query.toast) || '';

  const stats = {
    connectionStatus: readyCount > 0 ? 'Bağlı' : waitingQr ? 'QR gözlənilir' : 'Hazırlanır',
    sessions: visibleSessions,
    queuedMessageCount,
    lastScanned: dashboardState.lastScanned,
    totalMessagesSent: Number(queueTotalsForView.iletildi) || 0,
    averageQueuePerSession: visibleSessions.length
      ? Math.round(queuedMessageCount / visibleSessions.length)
      : 0,
    queueLoadPercent: Math.round((queuedMessageCount / dashboardState.maxQueueLength) * 100)
      || 0,
    pendingMessages: Number(queueTotalsForView.queued) || 0,
    sendingMessages: Number(queueTotalsForView.iletiliyor) || 0,
    deliveredMessages: Number(queueTotalsForView.iletildi) || 0,
    failedMessages: Number(queueTotalsForView.hata) || 0
  };

  const sessionCountsByOwner = {};
  Array.from(clientSessions.values()).forEach((session) => {
    const owner = (session && session.owner) || 'admin';
    if (!sessionCountsByOwner[owner]) {
      sessionCountsByOwner[owner] = { total: 0, ready: 0 };
    }
    sessionCountsByOwner[owner].total += 1;
    if (session.ready) {
      sessionCountsByOwner[owner].ready += 1;
    }
  });

  const ownerBreakdown = isAdmin
    ? [
      {
        username: 'admin',
        deviceCount: getUserDeviceCount('admin'),
        deviceLimit: getUserDeviceLimit('admin'),
        sessionsTotal: sessionCountsByOwner.admin ? sessionCountsByOwner.admin.total : 0,
        sessionsReady: sessionCountsByOwner.admin ? sessionCountsByOwner.admin.ready : 0,
        queue: getQueueTotalsForOwner('admin')
      },
      ...dealers.map((dealer) => ({
        username: dealer.username,
        deviceCount: dealer.deviceCount || 0,
        deviceLimit: dealer.deviceLimit ?? null,
        sessionsTotal: sessionCountsByOwner[dealer.username]
          ? sessionCountsByOwner[dealer.username].total
          : 0,
        sessionsReady: sessionCountsByOwner[dealer.username]
          ? sessionCountsByOwner[dealer.username].ready
          : 0,
        queue: getQueueTotalsForOwner(dealer.username)
      }))
    ]
    : sessionUsername
      ? [
        {
          username: sessionUsername,
          deviceCount: getUserDeviceCount(sessionUsername),
          deviceLimit: getUserDeviceLimit(sessionUsername),
          sessionsTotal: sessionCountsByOwner[sessionUsername]
            ? sessionCountsByOwner[sessionUsername].total
            : 0,
          sessionsReady: sessionCountsByOwner[sessionUsername]
            ? sessionCountsByOwner[sessionUsername].ready
            : 0,
          queue: getQueueTotalsForOwner(sessionUsername)
        }
      ]
      : [];

  const recentActivity = (isAdmin
    ? activityLog
    : activityLog.filter((entry) => entry && entry.owner === sessionUsername)
  )
    .slice(-80)
    .reverse();

  return {
    stats,
    queuedMessages: queuePool,
    connectedDevices: ownedDevices.slice(0, 10),
    queuePreview,
    queueLimit: dashboardState.maxQueueLength,
    tickets,
    profile,
    isAdmin,
    dealers,
    ownerOptions,
    ownerSummaries,
    ownerBreakdown,
    recentActivity,
    selectedTab,
    toastMessage,
    audit: auditStore,
    success: null,
    error: null,
    clients: visibleSessions,
    showWelcome: (req.session.user && req.session.user.showWelcome) ? (req.session.user.showWelcome = false, true) : false,
    ...overrides
  };
}

app.get('/admin/config', ensureAuthenticated, (req, res) => {
  const context = buildDashboardContext(req);
  res.json(context);
});

app.get('/', (req, res) => {
  if (isSessionAuthenticated(req)) {
    return res.redirect('/admin');
  }
  return res.redirect('/login');
});

app.get('/admin', ensureAuthenticated, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const refineIndexPath = path.join(refineAdminDistDir, 'index.html');
  if (fs.existsSync(refineIndexPath)) {
    return res.sendFile(refineIndexPath);
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/legacy', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-legacy.html'));
});

app.get('/legal/agreement', ensureAuthenticated, (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  if (!sessionUser) {
    return res.redirect('/login');
  }
  const user = usersStore[sessionUser.username];
  const fallback = (req.query && req.query.next && String(req.query.next).startsWith('/mobile'))
    ? '/mobile'
    : '/admin';
  const nextPath = sanitizeNextPath(req.query && req.query.next, fallback);
  if (isAgreementAccepted(user) && req.query.force !== '1') {
    return res.redirect(nextPath);
  }

  return res.render('agreement', {
    agreementTitle: AGREEMENT_TITLE,
    agreementVersion: AGREEMENT_VERSION,
    agreementText: AGREEMENT_TEXT,
    username: sessionUser.username,
    role: sessionUser.role || 'user',
    nextPath,
    existing: user && user.agreement ? user.agreement : null
  });
});

app.post('/legal/agreement/sign', ensureAuthenticated, async (req, res) => {
  const sessionUser = getSessionUserMeta(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Oturum bulunamadı' });
  }

  const user = usersStore[sessionUser.username];
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }

  const fullName = (req.body.fullName || '').toString().trim();
  const accepted = req.body.accepted === true;
  const nextPath = sanitizeNextPath(
    req.body.nextPath || (req.query && req.query.next),
    '/admin'
  );

  if (!accepted) {
    return res.status(400).json({ error: 'Sözleşmeyi onaylamanız zorunludur.' });
  }
  if (fullName.length < 5) {
    return res.status(400).json({ error: 'Ad soyad en az 5 karakter olmalıdır.' });
  }

  try {
    const ip = getRequestIp(req);
    const userAgent = (req.headers['user-agent'] || '').toString();
    const signResult = await signAgreementForUser({
      user,
      fullName,
      ip,
      userAgent
    });

    logActivity({
      type: 'legal.agreement.signed',
      owner: user.username,
      message: `Kullanım sözleşmesi imzalandı (${AGREEMENT_VERSION})`,
      meta: { ip, pdfFile: signResult.pdfInfo.fileName }
    });

    return res.json({
      ok: true,
      redirect: nextPath
    });
  } catch (error) {
    console.error('Agreement sign error:', error);
    return res.status(500).json({ error: 'Sözleşme PDF oluşturulamadı.' });
  }
});

app.get('/admin/legal-agreements', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const rows = Object.values(usersStore)
    .map((user) => {
      const agreement = user.agreement || null;
      const pdfFile = agreement && agreement.pdfFile ? path.basename(agreement.pdfFile) : null;
      const pdfPath = pdfFile ? path.join(agreementsPdfDir, pdfFile) : null;
      const pdfAvailable = !!(pdfPath && fs.existsSync(pdfPath));
      const signed = isAgreementAccepted(user);
      return {
        username: user.username,
        role: user.role || 'user',
        signed,
        fullName: agreement && agreement.fullName ? agreement.fullName : null,
        idNumberMasked: agreement && agreement.idNumber ? maskIdentity(agreement.idNumber) : null,
        signedAt: agreement && agreement.signedAt ? agreement.signedAt : null,
        ip: agreement && agreement.ip ? agreement.ip : null,
        version: agreement && agreement.version ? agreement.version : null,
        pdfAvailable,
        pdfUrl: pdfAvailable ? `/admin/legal-agreements/${encodeURIComponent(user.username)}/pdf` : null
      };
    })
    .sort((a, b) => new Date(b.signedAt || 0).getTime() - new Date(a.signedAt || 0).getTime());

  const signedCount = rows.filter((item) => item.signed).length;
  return res.json({
    version: AGREEMENT_VERSION,
    title: AGREEMENT_TITLE,
    total: rows.length,
    signedCount,
    rows
  });
});

app.get('/admin/legal-agreements/:username/pdf', ensureAuthenticated, ensureSessionAdmin, (req, res) => {
  const username = resolveUsername(req.params.username) || req.params.username;
  const user = usersStore[username];
  if (!user || !user.agreement || !user.agreement.pdfFile) {
    return res.status(404).json({ error: 'İmzalı PDF bulunamadı' });
  }
  const pdfFile = path.basename(user.agreement.pdfFile);
  const pdfPath = path.join(agreementsPdfDir, pdfFile);
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: 'PDF dosyası diskte bulunamadı' });
  }
  return res.download(pdfPath, `kullanim_sozlesmesi_${username}.pdf`);
});

async function renderMobileAuthPage(res, options = {}) {
  const payload = {
    mode: 'login',
    error: null,
    success: null,
    username: '',
    otp: false,
    registeredApiKey: null,
    ...options
  };
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'mobile', 'auth.ejs'), payload);
    return res.send(html);
  } catch (error) {
    console.error('[mobile] Auth render xətası:', error.message);
    return res.status(500).send('Mobile auth render xətası');
  }
}

function normalizePhoneInput(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  return raw.replace(/[^\d]/g, '');
}

app.get('/mobile/login', async (req, res) => {
  if (isSessionAuthenticated(req)) {
    return res.redirect('/mobile');
  }
  if (req.session && req.session.preAuthUser) {
    return renderMobileAuthPage(res, {
      mode: 'login',
      username: req.session.preAuthUser.username || '',
      otp: true
    });
  }
  return renderMobileAuthPage(res, {
    mode: 'login',
    success: req.query && req.query.success ? req.query.success.toString() : null,
    username: req.query && req.query.username ? req.query.username.toString() : ''
  });
});

app.get('/mobile/register', async (req, res) => {
  if (isSessionAuthenticated(req)) {
    return res.redirect('/mobile');
  }
  return renderMobileAuthPage(res, { mode: 'register' });
});

app.post('/mobile/register', async (req, res) => {
  if (isSessionAuthenticated(req)) {
    return res.redirect('/mobile');
  }

  const usernameRaw = (req.body.username || '').toString().trim();
  const password = (req.body.password || '').toString();
  const confirmPassword = (req.body.passwordConfirm || '').toString();
  const phoneNumber = normalizePhoneInput(req.body.phoneNumber);

  if (!usernameRaw || !/^[a-zA-Z0-9._-]{3,32}$/.test(usernameRaw)) {
    return renderMobileAuthPage(res, {
      mode: 'register',
      error: 'İstifadəçi adı yalnız hərf, rəqəm və . _ - simvolları ilə 3-32 uzunluqda olmalıdır.',
      username: usernameRaw
    });
  }

  if (resolveUsername(usernameRaw)) {
    return renderMobileAuthPage(res, {
      mode: 'register',
      error: 'Bu istifadəçi adı artıq mövcuddur.',
      username: usernameRaw
    });
  }

  if (password.length < 6) {
    return renderMobileAuthPage(res, {
      mode: 'register',
      error: 'Parol minimum 6 simvol olmalıdır.',
      username: usernameRaw
    });
  }

  if (password !== confirmPassword) {
    return renderMobileAuthPage(res, {
      mode: 'register',
      error: 'Parol təkrarı uyğun deyil.',
      username: usernameRaw
    });
  }

  const limitRaw = parseInt(process.env.MOBILE_REGISTER_DEVICE_LIMIT, 10);
  const defaultDeviceLimit = Number.isNaN(limitRaw) ? 3 : Math.max(1, limitRaw);

  let apiKey = generateApiKey();
  while (apiKeysStore[apiKey]) {
    apiKey = generateApiKey();
  }

  usersStore[usernameRaw] = {
    username: usernameRaw,
    role: 'dealer',
    apiKey,
    devices: [],
    deviceLimit: defaultDeviceLimit,
    billing: {
      lastPaidPeriod: getBillingPeriod(new Date()),
      lastPaidAt: new Date().toISOString()
    },
    passwordHash: hashPassword(password),
    isFirstLogin: false,
    phoneNumber,
    trustedDevices: [],
    agreement: null,
    agreementHistory: []
  };
  apiKeysStore[apiKey] = usernameRaw;
  persistUsers();
  persistApiKeys();

  return renderMobileAuthPage(res, {
    mode: 'login',
    success: 'Qeydiyyat tamamlandı. Daxil ola bilərsiniz.',
    username: usernameRaw,
    registeredApiKey: apiKey
  });
});

app.post('/mobile/login', async (req, res) => {
  const { username, secret } = req.body;
  const resolvedUsername = resolveUsername(username);
  const user = resolvedUsername ? usersStore[resolvedUsername] : null;

  if (!user) {
    await logLoginAttempt(req, username, false);
    return renderMobileAuthPage(res, {
      mode: 'login',
      error: 'Geçersiz kullanıcı adı',
      username: username || ''
    });
  }

  if (user.role === 'dealer') {
    const isPasswordValid = verifyDealerPassword(user, secret);
    const isApiKeyValid = user.apiKey === secret;
    if (!isPasswordValid && !isApiKeyValid) {
      await logLoginAttempt(req, resolvedUsername, false);
      return renderMobileAuthPage(res, {
        mode: 'login',
        error: 'Şifrə və ya API açarı yanlışdır',
        username: resolvedUsername || ''
      });
    }
  } else if (user.apiKey !== secret) {
    await logLoginAttempt(req, resolvedUsername, false);
    return renderMobileAuthPage(res, {
      mode: 'login',
      error: 'API açarı yanlışdır',
      username: resolvedUsername || ''
    });
  }

  await logLoginAttempt(req, resolvedUsername, true);

  const isTrusted = checkTrustedDevice(req, user);
  if (user.phoneNumber && user.phoneNumber.length > 5 && !isTrusted) {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.preAuthUser = {
      username: user.username,
      role: user.role,
      otp: otpCode,
      otpExpires: Date.now() + 5 * 60 * 1000
    };

    let senderSession = Array.from(clientSessions.values()).find((s) => s.owner === 'admin' && s.ready && s.client);
    if (!senderSession) {
      senderSession = Array.from(clientSessions.values()).find((s) => s.ready && s.client);
    }

    if (senderSession) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir';
      const now = new Date().toLocaleString('az-AZ');
      const otpMessage = `HubMSG doğrulama kodu: *${otpCode}*\nTarix: ${now}\nIP: ${ip}`;
      const jid = deriveJidFromPhone(user.phoneNumber);
      senderSession.client.sendMessage(jid, { text: otpMessage }).catch((err) => {
        console.error('OTP send error (mobile):', err);
      });
    } else {
      console.warn('OTP göndərilə bilmədi: Aktiv WhatsApp sessiyası yoxdur.');
    }

    return renderMobileAuthPage(res, {
      mode: 'login',
      username: user.username,
      otp: true
    });
  }

  if (isTrusted && user.phoneNumber) {
    const deviceId = req.cookies.hubmsg_device_id;
    const device = user.trustedDevices.find((d) => d.id === deviceId);
    if (device) {
      device.lastActive = new Date();
      device.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir';
      persistUsers();
    }
  }

  req.session.authenticated = true;
  req.session.user = {
    username: user.username,
    role: user.role,
    showWelcome: false
  };
  res.cookie('hubmsg_tenant', user.username, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
  return res.redirect('/mobile');
});

app.post('/mobile/verify-otp', async (req, res) => {
  if (!req.session.preAuthUser) {
    return res.redirect('/mobile/login');
  }

  const { otp } = req.body;
  const { otp: correctOtp, otpExpires, username, role } = req.session.preAuthUser;

  if (Date.now() > otpExpires) {
    req.session.preAuthUser = null;
    return renderMobileAuthPage(res, {
      mode: 'login',
      error: 'Kodun vaxtı bitib. Yenidən giriş edin.',
      username: username || '',
      otp: false
    });
  }

  if (otp !== correctOtp) {
    return renderMobileAuthPage(res, {
      mode: 'login',
      error: 'Yanlış kod.',
      username: username || '',
      otp: true
    });
  }

  const user = usersStore[username];
  const deviceId = require('crypto').randomUUID();
  if (!user.trustedDevices) user.trustedDevices = [];

  user.trustedDevices.push({
    id: deviceId,
    ua: req.headers['user-agent'] || 'Bilinmir',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir',
    lastActive: new Date()
  });
  persistUsers();

  req.session.authenticated = true;
  req.session.user = {
    username,
    role,
    showWelcome: false
  };
  req.session.preAuthUser = null;
  res.cookie('hubmsg_device_id', deviceId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
  res.cookie('hubmsg_tenant', username, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
  return res.redirect('/mobile');
});

app.get('/mobile/logout', (req, res) => {
  if (req.sessionID) {
    activeWebSessions.delete(req.sessionID);
  }
  req.session.destroy(() => {
    res.clearCookie('hubmsg_tenant');
    res.redirect('/mobile/login');
  });
});

app.get('/mobile', ensureAuthenticated, async (req, res) => {
  const sessionUser = getSessionUserMeta(req) || { username: 'admin', role: 'admin' };
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'mobile', 'index.ejs'), {
      username: sessionUser.username,
      role: sessionUser.role,
      isAdmin: sessionUser.role === 'admin'
    });
    return res.send(html);
  } catch (error) {
    console.error('[mobile] EJS render xətası:', error.message);
    return res.status(500).send('Mobile app render xətası');
  }
});

function enqueuePanelMessages(payload = {}, owner = 'admin') {
  const { recipient, recipients = '', message, label } = payload;
  const trimmedMessage = (message || '').trim();
  const parsedEntries = parseRecipientsInput(recipient, recipients);

  const fail = (messageText, statusCode = 400) => {
    const error = new Error(messageText);
    error.statusCode = statusCode;
    throw error;
  };

  if (!trimmedMessage || parsedEntries.length === 0) {
    fail('Hər bir mesaj üçün mətn və ən azı bir alıcı tələb olunur.');
  }

  if (parsedEntries.length > PER_REQUEST_LIMIT) {
    fail(`Bir sorğuda maksimum ${PER_REQUEST_LIMIT.toLocaleString()} nömrə qəbulu mümkündür.`);
  }

  const availableSlots = dashboardState.maxQueueLength - dashboardState.queuedMessages.length;
  if (availableSlots <= 0) {
    fail('Kuyruk tam doludur, lütfən sonra yenidən cəhd edin.', 429);
  }

  if (parsedEntries.length > availableSlots) {
    fail(`Kuyrukda yalnız ${availableSlots} boş yer qaldı. Daha az nömrə ilə yenidən çəkin.`, 429);
  }

  if (isOwnerQueuePaused(owner)) {
    fail('Göndəriş müvəqqəti risk kontroluna alınıb. Bir qədər sonra yenidən yoxlayın.', 429);
  }

  if (!hasActiveDeviceForOwner(owner)) {
    fail('Bu hesaba bağlı aktiv və göndərişə uyğun nömrə yoxdur.', 409);
  }

  const now = new Date().toISOString();
  const labelValue = (label || 'Xüsusi').trim() || 'Xüsusi';
  const newEntries = parsedEntries.map((entry) => ({
    recipient: entry.recipient,
    label: labelValue,
    snippet: entry.message || trimmedMessage,
    owner,
    deviceId: 'automatic',
    createdAt: now
  }));

  newEntries.forEach((entry) => enqueueMessage(entry));
  dashboardState.lastScanned = new Date().toISOString();

  console.log(`Yeni ${newEntries.length} mesaj kuyruğa alındı.`);
  logActivity({
    type: 'queue.enqueued',
    owner,
    message: `Paneldən ${newEntries.length} mesaj queue-ya əlavə edildi`,
    meta: { count: newEntries.length, label: labelValue }
  });

  return {
    count: newEntries.length,
    message: `${newEntries.length} mesaj sıraya əlavə edildi və aktiv nömrələr arasında balanslı şəkildə göndəriləcək.`
  };
}

app.post('/admin/message', ensureAuthenticated, (req, res) => {
  const owner = getSessionUsername(req) || 'admin';
  try {
    const result = enqueuePanelMessages(req.body, owner);
    const successText = result.message;
    const redirectUrl = `/admin?tab=bulk-section&success=${encodeURIComponent(successText)}&toast=${encodeURIComponent(
      successText
    )}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    const errorText = error && error.message ? error.message : 'Mesaj kuyruğa eklenemedi.';
    return res.redirect(`/admin?tab=bulk-section&error=${encodeURIComponent(errorText)}`);
  }
});

app.post('/api/admin/message', ensureAuthenticated, (req, res) => {
  const owner = getSessionUsername(req) || 'admin';
  try {
    const result = enqueuePanelMessages(req.body, owner);
    return res.json({
      ok: true,
      count: result.count,
      message: result.message
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error && error.message ? error.message : 'Mesaj kuyruğa eklenemedi.'
    });
  }
});

app.get('/admin/recipients/2fa', ensureAuthenticated, (req, res) => {
  const sessionUser = getStoredSessionUser(req);
  if (!sessionUser || sessionUser.role !== 'admin') {
    return res.status(403).json({ error: 'Bu funksiya yalnız admin üçün nəzərdə tutulub.' });
  }

  const numbers = Object.values(usersStore)
    .map(u => u.phoneNumber)
    .filter(phone => phone && phone.length > 5);

  res.json({ numbers });
});

app.post('/admin/tickets', ensureAuthenticated, (req, res) => {
  const { subject, message } = req.body;
  const reporter = getSessionUsername(req) || 'admin';
  const trimmedSubject = (subject || '').trim();
  const trimmedMessage = (message || '').trim();

  // JSON response support for chat widget
  const isJson = req.headers['content-type'] === 'application/json';

  if (!trimmedSubject || !trimmedMessage) {
    const errorText = 'Mövzu və mesaj tələb olunur.';
    if (isJson) return res.status(400).json({ error: errorText });
    return res.redirect(
      `/admin?tab=issues-section&error=${encodeURIComponent(errorText)}`
    );
  }

  const now = new Date().toISOString();
  // Get existing tickets or init
  if (!global.ticketsStore) global.ticketsStore = []; // ensure store exists if not global
  // Actually ticketsStore is likely in scope

  const ticket = {
    id: crypto.randomBytes(4).toString('hex'),
    subject: trimmedSubject,
    reporter,
    status: 'open',
    createdAt: now,
    messages: [
      {
        author: reporter,
        body: trimmedMessage,
        createdAt: now
      }
    ]
  };

  ticketsStore.push(ticket);
  persistTickets();

  const successText = 'Sorun bildirildi, admin cavab verəcək.';
  if (isJson) return res.json({ ok: true, message: successText });

  const redirectUrl = `/admin?tab=issues-section&success=${encodeURIComponent(
    successText
  )}&toast=${encodeURIComponent(successText)}`;
  return res.redirect(redirectUrl);
});

// Profile Management Routes
app.get('/admin/profile', ensureAuthenticated, (req, res) => {
  const username = getSessionUsername(req);
  const user = usersStore[username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    username: user.username,
    apiKey: user.apiKey,
    phoneNumber: user.phoneNumber,
    trustedDevices: user.trustedDevices || []
  });
});

app.post('/admin/profile', ensureAuthenticated, (req, res) => {
  const user = getStoredSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Səlahiyyətsiz' });

  const { phoneNumber } = req.body;
  if (usersStore[user.username]) {
    usersStore[user.username].phoneNumber = (phoneNumber || '').trim();
    persistUsers();
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }
});

app.post('/admin/tickets/:id/reply', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  const adminName = getSessionUsername(req) || 'admin';
  const trimmedReply = (reply || '').trim();
  if (!trimmedReply) {
    const errorText = 'Cavab üçün mətn daxil edin.';
    return res.redirect(
      `/admin?tab=issues-section&error=${encodeURIComponent(errorText)}`
    );
  }

  const ticket = ticketsStore.find((item) => item.id === id);
  if (!ticket) {
    const errorText = 'Sorun tapılmadı.';
    return res.redirect(
      `/admin?tab=issues-section&error=${encodeURIComponent(errorText)}`
    );
  }

  const now = new Date().toISOString();
  ticket.status = 'answered';
  ticket.messages.push({
    author: adminName,
    body: trimmedReply,
    createdAt: now
  });
  persistTickets();

  const successText = 'Cavab əlavə edildi.';
  const redirectUrl = `/admin?tab=issues-section&success=${encodeURIComponent(
    successText
  )}&toast=${encodeURIComponent(successText)}`;
  return res.redirect(redirectUrl);
});

// -- Anti Brute-Force & Rate Limiting System --
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 dəqiqə

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir';
}

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockUntil && now < record.lockUntil) {
    return { allowed: false, remaining: Math.ceil((record.lockUntil - now) / 60000) };
  }
  if (record.lockUntil && now >= record.lockUntil) {
    // Kilid müddəti bitib
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record) {
    record = { count: 0 };
    loginAttempts.set(ip, record);
  }
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_DURATION_MS;
  }
}

function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}
// ----------------------------------------------

app.get('/login', (req, res) => {
  if (isSessionAuthenticated(req)) {
    return res.redirect('/admin');
  }
  res.render('login', { error: null, username: '' });
});

app.post('/login', async (req, res) => {
  const { username, secret } = req.body;
  const ip = getClientIp(req);
  const genericErrorMsg = 'İstifadəçi adı və ya şifrə yanlışdır'; // Ən güvənli xəta tipi (istifadəçinin olub olmadığını bildirmir)

  // 1. Rate Limit Check
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    // Hack ehtimalı: Kilidlənib
    await logLoginAttempt(req, username || 'Təyin olunmayıb', false);
    return res.render('login', {
      error: `Çox sayda uğursuz cəhd etdiniz. Təhlükəsizlik səbəbilə hesabınız ${rateCheck.remaining} dəqiqə bloklanmışdır.`,
      username: username || ''
    });
  }

  // 2. Süni gözləmə (Artificial Delay - Throttle) - Bot hücumlarına qarşı
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500)); // Hər cəhdddə 0.5-1 san. səssiz gözləmə

  const resolvedUsername = resolveUsername(username);
  const user = resolvedUsername ? usersStore[resolvedUsername] : null;

  if (!user) {
    recordFailedLogin(ip);
    await logLoginAttempt(req, username, false);
    return res.render('login', {
      error: genericErrorMsg,
      username: username || ''
    });
  }

  let isValid = false;
  if (user.role === 'dealer') {
    const isPasswordValid = verifyDealerPassword(user, secret);
    const isApiKeyValid = user.apiKey === secret;
    isValid = isPasswordValid || isApiKeyValid;
  } else {
    isValid = (user.apiKey === secret);
  }

  if (!isValid) {
    recordFailedLogin(ip);
    await logLoginAttempt(req, resolvedUsername, false);
    return res.render('login', {
      error: genericErrorMsg,
      username: resolvedUsername || ''
    });
  }

  // Doğru giriş olduğu halda IP-in sayğacını sıfırlayırıq
  resetLoginAttempts(ip);
  await logLoginAttempt(req, resolvedUsername, true);

  // OTP Logic with TRUSTED DEVICES
  const isTrusted = checkTrustedDevice(req, user);

  if (user.phoneNumber && user.phoneNumber.length > 5 && !isTrusted) {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.preAuthUser = {
      username: user.username,
      role: user.role,
      otp: otpCode,
      otpExpires: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    // Find admin session to send OTP
    let senderSession = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);
    if (!senderSession) {
      // Fallback to any ready session
      senderSession = Array.from(clientSessions.values()).find(s => s.ready && s.client);
    }

    if (senderSession) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir';
      const ua = req.headers['user-agent'] || 'Bilinmir';
      const now = new Date().toLocaleString('az-AZ');

      const msgCaption =
        `HubMSG: Yeni Giriş Tələbi
Hörmətli *${user.username}*, hesabınıza giriş edilmək istənilir.

Doğrulama Kodu: *${otpCode}*

Tarix: ${now}
IP Adresi: ${ip}
Cihaz: ${ua}

Bu əməliyyat sizə aid deyilsə, xahiş edirik parolunuzu dərhal dəyişin.`;

      const jid = deriveJidFromPhone(user.phoneNumber);

      // Try to send with image if logo exists, otherwise text
      const fs = require('fs');
      const path = require('path');
      const logoPath = path.join(__dirname, 'public', 'img', 'logo.png');

      if (fs.existsSync(logoPath)) {
        const imageBuffer = fs.readFileSync(logoPath);
        senderSession.client.sendMessage(jid, {
          image: imageBuffer,
          caption: msgCaption
        }).catch(err => console.error('OTP send error (image):', err));
      } else {
        senderSession.client.sendMessage(jid, { text: msgCaption }).catch(err => console.error('OTP send error (text):', err));
      }

    } else {
      console.warn('OTP göndərilə bilmədi: Aktiv WhatsApp sessiyası yoxdur.');
    }

    return res.render('login', {
      error: null,
      username: user.username,
      otp: true
    });
  }

  // If phone number is set but device is trusted, update lastActive
  if (isTrusted && user.phoneNumber) {
    const deviceId = req.cookies.hubmsg_device_id;
    const device = user.trustedDevices.find(d => d.id === deviceId);
    if (device) {
      device.lastActive = new Date();
      device.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir';
      persistUsers();
    }
  }

  // First login logic
  let showWelcome = false;
  if (user.isFirstLogin !== false) {
    if (resolvedUsername === 'FlyexKargo' || resolvedUsername === 'flyex') {
      user.deviceLimit = 5;
      showWelcome = true;
      user.isFirstLogin = false;
      persistUsers();
    } else if (resolvedUsername === 'admin' || user.role === 'admin') {
      showWelcome = true;
      user.isFirstLogin = false;
      persistUsers();
    }
  }

  req.session.authenticated = true;
  req.session.user = {
    username: user.username,
    role: user.role,
    showWelcome: showWelcome
  };
  res.cookie('hubmsg_tenant', user.username, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
  res.redirect('/admin');
});

app.get('/otp', (req, res) => {
  if (req.session.authenticated) return res.redirect('/admin');
  if (!req.session.preAuthUser) return res.redirect('/login');
  res.render('otp', { error: null });
});

app.post('/verify-otp', (req, res) => {
  if (!req.session.preAuthUser) return res.redirect('/login');

  const { otp } = req.body;
  const { otp: correctOtp, otpExpires, username, role } = req.session.preAuthUser;

  if (Date.now() > otpExpires) {
    req.session.preAuthUser = null;
    return res.render('login', { error: 'Kodun vaxtı bitib. Yenidən giriş edin.', username: username || '', otp: false });
  }

  if (otp !== correctOtp) {
    return res.render('login', { error: 'Yanlış kod.', username: username, otp: true });
  }

  // Success
  const user = usersStore[username];
  let showWelcome = false;

  // Register Trusted Device
  const deviceId = require('crypto').randomUUID();
  if (!user.trustedDevices) user.trustedDevices = [];

  user.trustedDevices.push({
    id: deviceId,
    ua: req.headers['user-agent'] || 'Bilinmir',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmir',
    lastActive: new Date()
  });

  if (user && user.isFirstLogin !== false) {
    user.isFirstLogin = false;
    showWelcome = true;
  }
  persistUsers();

  req.session.authenticated = true;
  req.session.user = {
    username: username,
    role: role,
    showWelcome: showWelcome
  };
  req.session.preAuthUser = null; // Clear OTP session

  // Set Trusted Device Cookie (1 year)
  res.cookie('hubmsg_device_id', deviceId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });

  // Send Success Notification
  if (user.phoneNumber) {
    const successMsg = `HubMSG: Giriş uğurludur. Yaxşı işlər. ✅`;
    // Find admin session or any ready session
    let senderSession = Array.from(clientSessions.values()).find(s => s.owner === 'admin' && s.ready && s.client);
    if (!senderSession) senderSession = Array.from(clientSessions.values()).find(s => s.ready && s.client);

    if (senderSession) {
      const jid = deriveJidFromPhone(user.phoneNumber);
      // Small delay to ensure it arrives after OTP/login
      setTimeout(() => {
        senderSession.client.sendMessage(jid, { text: successMsg }).catch(err => console.error('Success msg error:', err));
      }, 1000);
    }
  }

  res.cookie('hubmsg_tenant', username, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
  res.redirect('/admin');
});

app.get('/logout', (req, res) => {
  if (req.sessionID) {
    activeWebSessions.delete(req.sessionID);
  }
  req.session.destroy(() => {
    res.clearCookie('hubmsg_tenant');
    res.redirect('/login');
  });
});

app.post('/admin/users', ensureAdmin, (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'username tələb olunur' });
  }

  if (usersStore[username]) {
    return res.status(409).json({ error: 'İstifadəçi artıq mövcuddur' });
  }

  const apiKey = generateApiKey();
  usersStore[username] = {
    username,
    role: 'user',
    apiKey,
    devices: [],
    deviceLimit: null,
    billing: {
      lastPaidPeriod: getBillingPeriod(new Date()),
      lastPaidAt: new Date().toISOString()
    },
    agreement: null,
    agreementHistory: []
  };
  apiKeysStore[apiKey] = username;
  persistUsers();
  persistApiKeys();

  res.json({ username, apiKey });
});

app.get('/admin/dealers', ensureAdmin, (req, res) => {
  const dealers = listDealers();
  res.json({ dealers });
});

app.post('/admin/dealers', ensureAdmin, (req, res) => {
  const { username, deviceLimit, password: requestedPassword } = req.body;
  const normalizedUsername = (username || '').toString().trim();
  if (!normalizedUsername) {
    return res.status(400).json({ error: 'Bayi adı tələb olunur' });
  }
  if (usersStore[normalizedUsername]) {
    return res.status(409).json({ error: 'Bu adı istifadə edən artıq var' });
  }
  const normalizedLimit = normalizeDeviceLimit(deviceLimit);
  const apiKey = generateApiKey();
  const password = requestedPassword || generateDealerPassword();
  const passwordHash = hashPassword(password);
  usersStore[normalizedUsername] = {
    username: normalizedUsername,
    role: 'dealer',
    apiKey,
    devices: [],
    deviceLimit: normalizedLimit,
    billing: {
      lastPaidPeriod: getBillingPeriod(new Date()),
      lastPaidAt: new Date().toISOString()
    },
    passwordHash,
    agreement: null,
    agreementHistory: []
  };
  apiKeysStore[apiKey] = normalizedUsername;
  persistUsers();
  persistApiKeys();
  res.json({
    username: normalizedUsername,
    apiKey,
    deviceLimit: normalizedLimit,
    password
  });
});

app.put('/admin/dealers/:username', ensureAdmin, (req, res) => {
  const { username } = req.params;
  if (!username || !usersStore[username] || usersStore[username].role !== 'dealer') {
    return res.status(404).json({ error: 'Bayi tapılmadı' });
  }
  const { deviceLimit, password, paymentReceived, lastPaidPeriod } = req.body;
  const targetUser = usersStore[username];
  ensureUserBillingShape(targetUser);
  const previousLimit = usersStore[username].deviceLimit;
  const normalizedLimit = normalizeDeviceLimit(deviceLimit);
  if (Object.prototype.hasOwnProperty.call(req.body, 'deviceLimit')) {
    usersStore[username].deviceLimit = normalizedLimit;
  }
  if (typeof password === 'string' && password.trim()) {
    usersStore[username].passwordHash = hashPassword(password);
  }
  if (paymentReceived === true || paymentReceived === 'true' || paymentReceived === 1 || paymentReceived === '1') {
    markUserPaymentReceived(targetUser, new Date());
  } else if (typeof lastPaidPeriod === 'string' && /^\d{4}-\d{2}$/.test(lastPaidPeriod.trim())) {
    targetUser.billing.lastPaidPeriod = lastPaidPeriod.trim();
    targetUser.billing.lastPaidAt = new Date().toISOString();
  }
  persistUsers();
  const response = {
    ok: true,
    deviceLimit: usersStore[username].deviceLimit,
    deviceCount: getUserDeviceCount(username),
    billing: getUserBillingState(targetUser)
  };
  if (password) {
    response.password = password;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'deviceLimit') && previousLimit !== usersStore[username].deviceLimit) {
    const newLimitText = usersStore[username].deviceLimit === null ? 'limitsiz' : `${usersStore[username].deviceLimit}`;
    const oldLimitText = previousLimit === null ? 'limitsiz' : `${previousLimit}`;
    const message = `Cihaz limiti yeniləndi: ${oldLimitText} → ${newLimitText}`;
    logActivity({
      type: 'dealer.limit_updated',
      owner: username,
      message,
      meta: {
        username,
        oldLimit: previousLimit,
        newLimit: usersStore[username].deviceLimit
      }
    });
    addMobileAnnouncement({
      type: 'limit_update',
      title: 'Limit yeniləndi',
      body: message,
      owner: username,
      createdBy: 'admin',
      meta: {
        username,
        oldLimit: previousLimit,
        newLimit: usersStore[username].deviceLimit
      }
    });
  }
  res.json(response);
});

app.post('/admin/devices/:id/assign', ensureAdmin, (req, res) => {
  const { id } = req.params;
  const { owner } = req.body;
  const normalizedOwner = resolveUsername(owner);

  if (!normalizedOwner || !usersStore[normalizedOwner]) {
    return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }

  const deviceIndex = connectedDevices.findIndex((device) => device.id === id);
  if (deviceIndex === -1) {
    return res.status(404).json({ error: 'Cihaz tapılmadı' });
  }

  const previousOwner = connectedDevices[deviceIndex].owner;
  if (previousOwner !== normalizedOwner && !canAssignDeviceToUser(normalizedOwner)) {
    return res.status(429).json({ error: 'Bu istifadəçi üçün cihaz limiti doludur' });
  }

  connectedDevices[deviceIndex].owner = normalizedOwner;
  if (previousOwner && usersStore[previousOwner]) {
    usersStore[previousOwner].devices = usersStore[previousOwner].devices.filter((deviceId) => deviceId !== id);
  }
  if (!usersStore[owner].devices.includes(id)) {
    usersStore[owner].devices.push(id);
  }
  persistUsers();

  res.json({ ok: true });
});

app.post('/api/message', (req, res) => {
  const user = resolveApiUserOrReject(req, res);
  if (!user) return;

  const { recipient, recipients = null, message, label, deviceId } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message gərəkdir' });
  }

  const parsedEntries = parseRecipientsInput(recipient, recipients);
  if (!parsedEntries.length) {
    return res.status(400).json({ error: 'recipient və ya recipients tələb olunur' });
  }

  if (parsedEntries.length > PER_REQUEST_LIMIT) {
    return res.status(400).json({ error: `Bir sorğuda maksimum ${PER_REQUEST_LIMIT.toLocaleString()} nömrə qəbulu mümkündür.` });
  }

  if (dashboardState.queuedMessages.length + parsedEntries.length > dashboardState.maxQueueLength) {
    return res.status(429).json({ error: 'Kuyruk doludur' });
  }

  const userDevices = connectedDevices.filter((device) => device.owner === user.username);
  if (!userDevices.length) {
    return res.status(400).json({ error: 'Cihaz tapılmadı' });
  }
  if (isOwnerQueuePaused(user.username)) {
    return res.status(429).json({ error: 'Göndəriş müvəqqəti risk kontroluna alınıb' });
  }
  if (!hasActiveDeviceForOwner(user.username)) {
    return res.status(409).json({ error: 'Hesaba bağlı aktiv və göndərişə uyğun nömrə yoxdur' });
  }

  let assignedDeviceId = 'automatic';
  if (deviceId) {
    const found = userDevices.find((device) => device.id === deviceId);
    if (!found) {
      return res.status(400).json({ error: 'Cihaz bu hesaba aid deyil' });
    }
    if (isDeviceSuspended(found.id, user.username)) {
      return res.status(409).json({ error: 'Seçilən cihaz müvəqqəti passiv vəziyyətdədir' });
    }
    assignedDeviceId = found.id;
  }

  const now = new Date().toISOString();
  const entries = parsedEntries.map((p) => ({
    recipient: p.recipient,
    label: label || 'Xüsusi',
    snippet: p.message || message,
    owner: user.username,
    deviceId: assignedDeviceId,
    createdAt: now
  }));

  entries.forEach(enqueueMessage);
  dashboardState.lastScanned = new Date().toISOString();
  logActivity({
    type: 'queue.enqueued',
    owner: user.username,
    message: `API ilə ${entries.length} mesaj queue-ya əlavə edildi`,
    meta: { count: entries.length, label: label || 'Xüsusi' }
  });

  res.json({
    ok: true,
    queued: dashboardState.queuedMessages.length,
    added: entries.length
  });
});

// Backup Helper Functions
function getDirSize(dirPath) {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      totalSize += getDirSize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  return totalSize;
}

// Routes
app.get('/admin/backups', ensureAdmin, (req, res) => {
  if (isMysqlStorageEnabled) {
    return res.json({ backups: [], mode: 'mysql', message: 'Structured data is stored in MySQL.' });
  }
  try {
    const backups = [];
    if (fs.existsSync(backupsGlobalDir)) {
      const dates = fs.readdirSync(backupsGlobalDir).filter(f => fs.statSync(path.join(backupsGlobalDir, f)).isDirectory());

      dates.forEach(date => {
        const datePath = path.join(backupsGlobalDir, date);
        const times = fs.readdirSync(datePath).filter(f => fs.statSync(path.join(datePath, f)).isDirectory());

        times.forEach(time => {
          const fullPath = path.join(datePath, time);
          const files = fs.readdirSync(fullPath);
          const size = getDirSize(fullPath);

          backups.push({
            id: `${date}/${time}`,
            date,
            time: time.replace(/-/g, ':'),
            path: fullPath,
            files: files,
            size: (size / 1024).toFixed(2) + ' KB'
          });
        });
      });
    }
    // Sort by date desc
    backups.sort((a, b) => b.id.localeCompare(a.id));
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/backups', ensureAdmin, async (req, res) => {
  try {
    await runBackup();
    res.json({ ok: true, message: 'Yedekleme başarıyla tamamlandı.' });
  } catch (error) {
    res.status(500).json({ error: 'Yedekleme sırasında hata oluştu: ' + error.message });
  }
});

app.delete('/admin/backups/:date/:time', ensureAdmin, (req, res) => {
  const { date, time } = req.params;
  const backupPath = path.join(backupsGlobalDir, date, time);

  try {
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });

      // Clean up empty date folder if exists
      const datePath = path.join(backupsGlobalDir, date);
      if (fs.existsSync(datePath) && fs.readdirSync(datePath).length === 0) {
        fs.rmdirSync(datePath);
      }

      res.json({ ok: true });
    } else {
      res.status(404).json({ error: 'Yedek bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/backups/:date/:time/file/:filename', ensureAdmin, (req, res) => {
  if (isMysqlStorageEnabled) {
    return res.status(501).json({ error: 'MySQL storage mode does not expose JSON backup files.' });
  }
  const { date, time, filename } = req.params;

  // Security: prevent path traversal and restrict to .json files (sessions.tar.gz is too big for this)
  if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Yalnızca .json fayllarına baxıla bilər.' });
  }

  const filePath = path.join(backupsGlobalDir, date, time, filename);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ content: JSON.parse(content) });
    } else {
      res.status(404).json({ error: 'Fayl tapılmadı.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Fayl oxunarkən xəta: ' + error.message });
  }
});

app.post('/admin/backups/restore', ensureAdmin, (req, res) => {
  if (isMysqlStorageEnabled) {
    return res.status(501).json({ error: 'MySQL storage mode requires database-level backup/restore.' });
  }
  const { id } = req.body; // format: "YYYY-MM-DD/HH-MM-SS"
  if (!id) return res.status(400).json({ error: 'Yedek ID gerekli' });

  const backupPath = path.join(backupsGlobalDir, id);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Yedək faylı tapılmadı' });
  }

  console.log(`[restore] Starting restore from ${backupPath}...`);

  try {
    // 1. Restore JSON files
    const files = fs.readdirSync(backupPath);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const src = path.join(backupPath, file);
        const dest = path.join(dataDir, file);
        fs.copyFileSync(src, dest);
        console.log(`[restore] ${file} restored.`);
      }
    });

    // 2. Restore Sessions (if exists)
    const tarFile = path.join(backupPath, 'sessions.tar.gz');
    if (fs.existsSync(tarFile)) {
      // First, remove current sessions to avoid conflict/stale data
      const currentSessionsDir = path.join(dataDir, 'sessions');
      if (fs.existsSync(currentSessionsDir)) {
        fs.rmSync(currentSessionsDir, { recursive: true, force: true });
      }
      fs.mkdirSync(currentSessionsDir, { recursive: true });

      // Untar
      // tar -xzf source.tar.gz -C /destination/path --strip-components=1 (since we tarred 'sessions' folder)
      // Actually we tarred with -C dataDir sessions, so inside tar is "sessions/..."
      // So extracting to dataDir should reconstruct "sessions/"
      const tarCmd = `tar -xzf "${tarFile}" -C "${dataDir}"`;

      exec(tarCmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[restore] Tar extract failed:', error);
          // Return error but partial restore might have happened
          // return res.status(500).json({ error: 'Oturumlar açılamadı: ' + error.message });
          // Still restart to be safe
        }

        console.log('[restore] Sessions restored.');
        // 3. Restart Server
        res.json({ ok: true, message: 'Yedək yükləndi. Server yenidən başladılır...' });

        setTimeout(() => {
          console.log('[restore] Triggering restart...');
          process.exit(0); // Runner will restart us
        }, 1000);
      });
    } else {
      console.log('[restore] No sessions.tar.gz found, skipping session restore.');
      res.json({ ok: true, message: 'Veriler yüklendi (Oturum yedeği yok). Sunucu yeniden başlatılıyor...' });

      setTimeout(() => {
        console.log('[restore] Triggering restart...');
        process.exit(0);
      }, 1000);
    }

  } catch (error) {
    console.error('[restore] Critical error:', error);
    res.status(500).json({ error: 'Məlumatların bərpası xətası: ' + error.message });
  }
});

// Security: Revoke functionality
app.post('/admin/security/revoke-device', ensureAuthenticated, (req, res) => {
  const { deviceId } = req.body;
  const user = usersStore[getSessionUsername(req)];
  if (!user || !user.trustedDevices) return res.status(404).json({ error: 'Device not found' });

  user.trustedDevices = user.trustedDevices.filter(d => d.id !== deviceId);
  persistUsers();

  res.json({ ok: true });
});

// Helper for Trusted Device Check
function checkTrustedDevice(req, user) {
  const cookieId = req.cookies.hubmsg_device_id;
  if (!cookieId) return false;
  if (!user.trustedDevices) return false;

  const device = user.trustedDevices.find(d => d.id === cookieId);
  if (device) return true;

  return false;
}

const server = app.listen(port, () => {
  console.log(`Admin paneli http://localhost:${port}/admin üzərində çalışır`);
});

server.on('error', (err) => {
  console.error('[server] Fatal start error:', err);
  process.exit(1);
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeDevices: getActiveBrowserCount()
  });
});

// Resource Monitoring Watchdog
setInterval(() => {
  const memory = process.memoryUsage();
  const rssMB = Math.round(memory.rss / 1024 / 1024);
  if (rssMB > 600) {
    console.warn(`[resource-guard] High memory usage detected: ${rssMB}MB RSS`);
    logActivity({
      level: 'warn',
      type: 'system.resource_warning',
      message: `Yüksək yaddaş istifadəsi: ${rssMB}MB RSS`
    });
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Global Error Catchers
process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught Exception:', err);
  logActivity({
    level: 'error',
    type: 'system.crash.uncaught_exception',
    message: `Kritik xəta (Exception): ${err.message}`,
    meta: { stack: err.stack }
  });
  // Graceful shutdown after logging
  handleShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[fatal] Unhandled Rejection at:', promise, 'reason:', reason);
  logActivity({
    level: 'error',
    type: 'system.crash.unhandled_rejection',
    message: `Kritik xəta (Rejection): ${reason}`
  });
});
