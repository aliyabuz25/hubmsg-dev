const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MASTER_PORT = 2005;
const GATEWAY_PORT = parseInt(process.env.PORT, 10) || 2004;
const DATA_DIR = path.join(__dirname, 'datalar');
const TENANT_DATA_BASE = path.join(__dirname, 'tenant_data');
const PROXY_MAP_FILE = path.join(DATA_DIR, 'proxy_map.json');

const instances = new Map();

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(TENANT_DATA_BASE);
ensureDir(DATA_DIR);

function updateProxyMap() {
    const map = {};
    instances.forEach((data, name) => {
        if (name !== 'master') map[name] = data.port;
    });
    fs.writeFileSync(PROXY_MAP_FILE, JSON.stringify(map, null, 2));
}

function spawnInstance(name, port, isIsolated = false) {
    console.log(`[Orchestrator] Starting ${name} on port ${port}...`);

    const env = {
        ...process.env,
        PORT: port,
        DATA_DIR: isIsolated ? path.join(TENANT_DATA_BASE, name) : DATA_DIR
    };
    if (isIsolated) env.ISOLATED_TENANT = name;

    const child = spawn('node', ['server.js'], {
        env,
        stdio: 'inherit'
    });

    child.on('exit', (code) => {
        console.log(`[Orchestrator] ${name} exited with code ${code}. Restarting in 3s...`);
        setTimeout(() => spawnInstance(name, port, isIsolated), 3000);
    });

    instances.set(name, { child, port });
    updateProxyMap();
}

// Health monitoring logic
async function checkHealth() {
    for (const [name, data] of instances.entries()) {
        const url = `http://localhost:${data.port}/health`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) throw new Error(`Status ${res.status}`);
        } catch (e) {
            console.warn(`[Orchestrator] Health check failed for ${name} on port ${data.port}: ${e.message}`);
            // If it's the master and unresponsive, we might want to restart, 
            // but spawnInstance already has a 'exit' listener. 
            // This is for cases where the process is "hung" but still running.
            if (e.name === 'AbortError' || e.message.includes('ECONNREFUSED')) {
                console.log(`[Orchestrator] ${name} appears hung or dead. Force restarting...`);
                if (data.child) data.child.kill('SIGKILL');
            }
        }
    }
}

function spawnGateway() {
    console.log('[Orchestrator] Starting Gateway...');
    const gateway = spawn('node', ['gateway.js'], { stdio: 'inherit' });
    gateway.on('exit', (code) => {
        console.log(`[Orchestrator] Gateway exited with code ${code}. Restarting in 2s...`);
        setTimeout(spawnGateway, 2000);
    });
}

function logAccessInfo() {
    console.log(`[Orchestrator] Admin (direct): http://localhost:${MASTER_PORT}/admin`);
    console.log(`[Orchestrator] Mobile (direct): http://localhost:${MASTER_PORT}/mobile`);
    console.log(`[Orchestrator] Admin (gateway): http://localhost:${GATEWAY_PORT}/admin`);
    console.log(`[Orchestrator] Mobile (gateway): http://localhost:${GATEWAY_PORT}/mobile`);
    console.log('[Orchestrator] Mobile panel starts automatically with server.js for each started instance.');
}

// Start Master
spawnInstance('master', MASTER_PORT);

// Start Gateway
setTimeout(spawnGateway, 2000);

// Monitor for new isolated tenants
setInterval(() => {
    try {
        const usersFile = path.join(DATA_DIR, 'users.json');
        if (!fs.existsSync(usersFile)) return;

        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        let changed = false;

        Object.entries(users).forEach(([id, u]) => {
            if (u.isIsolated && !instances.has(id)) {
                // Find a free port
                const usedPorts = Array.from(instances.values()).map(v => v.port);
                let nextPort = 2010;
                while (usedPorts.includes(nextPort)) nextPort++;

                spawnInstance(id, nextPort, true);
                changed = true;
            }
        });

        if (changed) updateProxyMap();
    } catch (e) {
        console.error('[Orchestrator] Error monitoring users:', e.message);
    }
}, 10000);

// Start health checks every 1 minute
setInterval(checkHealth, 60000);

console.log('[Orchestrator] HubMSG Multi-Tenant Orchestrator Initialized.');
logAccessInfo();
