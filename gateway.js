const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const MASTER_PORT = 2005;
const PROXY_PORT = process.env.PORT || 2004;
const PROXY_MAP_FILE = path.join(__dirname, 'datalar', 'proxy_map.json');

const proxy = httpProxy.createProxyServer({});

// Handle errors
proxy.on('error', (err, req, res) => {
    console.error('[Gateway Error]:', err.message);
    if (!res.headersSent) {
        res.writeHead(502);
        res.end('Gateway Error');
    }
});

function getTargetPort(req) {
    // Logic:
    // 1. Check for 'x-tenant-id' header
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
        const map = loadProxyMap();
        if (map[tenantId]) return map[tenantId];
    }

    // 2. Check for cookie
    const cookie = req.headers.cookie;
    if (cookie) {
        const match = cookie.match(/hubmsg_tenant=([^;]+)/);
        if (match) {
            const tenantId = match[1];
            const map = loadProxyMap();
            if (map[tenantId]) return map[tenantId];
        }
    }

    // Default to Master
    return MASTER_PORT;
}

function loadProxyMap() {
    try {
        if (fs.existsSync(PROXY_MAP_FILE)) {
            return JSON.parse(fs.readFileSync(PROXY_MAP_FILE, 'utf8'));
        }
    } catch (e) { }
    return {};
}

const server = http.createServer((req, res) => {
    const port = getTargetPort(req);
    proxy.web(req, res, { target: `http://localhost:${port}` });
});

console.log(`[Gateway] Routing active on port ${PROXY_PORT}`);
server.listen(PROXY_PORT);
