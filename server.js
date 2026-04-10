const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const MODES = {
    STATELESS: 'STATELESS',
    MOD_N: 'MOD_N',
    CONSISTENT: 'CONSISTENT'
};

const STATELESS_POLICIES = {
    L4: 'L4',
    L7: 'L7'
};

const RING_COLORS = ['#60a5fa', '#10b981', '#a78bfa', '#f59e0b', '#22d3ee', '#fbbf24'];
const MIN_VIRTUAL_NODES = 1;
const MAX_VIRTUAL_NODES = 256;
let virtualNodesPerServer = 10;

let currentMode = MODES.STATELESS;
let statelessPolicy = STATELESS_POLICIES.L4;
let l4Index = 0;
let requestSequence = 1;

function createServerState(input, previousState) {
    const capacity = Number(input.capacity);
    return {
        id: input.id,
        name: input.name,
        path: input.path,
        count: previousState ? previousState.count : Number(input.count) || 0,
        capacity: Number.isFinite(capacity) && capacity > 0
            ? capacity
            : previousState
                ? previousState.capacity
                : 12,
        currentLoad: previousState ? previousState.currentLoad : 0,
        activeConnections: previousState ? previousState.activeConnections : 0,
        recentRequestTimes: previousState ? previousState.recentRequestTimes : []
    };
}

let servers = [
    createServerState({ id: 'srv_1', name: 'Server A', path: '/api', capacity: 12 }),
    createServerState({ id: 'srv_2', name: 'Server B', path: '/images', capacity: 12 }),
    createServerState({ id: 'srv_3', name: 'Server C', path: '/admin', capacity: 12 })
];

const requestToServer = new Map();
const clientRequestCounters = new Map();
const recentRequestKeys = [];
const RECENT_REQUEST_LIMIT = 320;

const metrics = {
    totalRequests: 0,
    rehashHistory: {
        [MODES.MOD_N]: [],
        [MODES.CONSISTENT]: []
    },
    lastRehash: {
        mode: MODES.MOD_N,
        reason: 'init',
        affectedPercent: 0,
        movedKeys: 0,
        totalKeys: 0,
        affectedRanges: [],
        changedSamples: [],
        timestamp: Date.now()
    }
};

// Cooldown tracker (socket.id -> timestamp)
const messageCooldowns = new Map();
const COOLDOWN_MS = 5000;

const crypto = require('crypto');

function hash32(value) {
    const hash = crypto
        .createHash('sha256')
        .update(String(value))
        .digest();

    // take first 4 bytes (32 bits)
    return hash.readUInt32BE(0) >>> 0;
}

function hashToRing(value) {
    return (hash32(value) / Math.pow(2, 32)) * 360;
}

function isStatefulMode(mode) {
    return mode === MODES.MOD_N || mode === MODES.CONSISTENT;
}

function normalizeVirtualNodeCount(value) {
    return Math.max(MIN_VIRTUAL_NODES, Math.min(MAX_VIRTUAL_NODES, Number(value) || 10));
}

function buildRing(serverList, vnodeCount = virtualNodesPerServer) {
    const safeVNodeCount = normalizeVirtualNodeCount(vnodeCount);
    const ring = [];
    serverList.forEach((srv, serverIndex) => {
        const color = RING_COLORS[serverIndex % RING_COLORS.length];
        for (let vnodeIndex = 0; vnodeIndex < safeVNodeCount; vnodeIndex++) {
            const vnodeKey = `${srv.id}::${vnodeIndex}`;
            ring.push({
                serverId: srv.id,
                name: srv.name,
                hash: hashToRing(vnodeKey),
                color,
                vnodeIndex,
                vnodeKey
            });
        }
    });
    return ring.sort((a, b) => {
        if (a.hash !== b.hash) return a.hash - b.hash;
        return a.vnodeKey.localeCompare(b.vnodeKey);
    });
}

function locateRingServer(ring, requestHash) {
    if (!ring.length) return null;
    for (const node of ring) {
        if (requestHash <= node.hash) {
            return node.serverId;
        }
    }
    return ring[0].serverId;
}

function getServerIdForStatefulMode(mode, requestId, serverList, vnodeCount = virtualNodesPerServer) {
    if (!serverList.length) return null;
    if (mode === MODES.MOD_N) {
        const index = hash32(requestId) % serverList.length;
        return serverList[index].id;
    }
    if (mode === MODES.CONSISTENT) {
        const ring = buildRing(serverList, vnodeCount);
        return locateRingServer(ring, hashToRing(requestId));
    }
    return null;
}

function sanitizePath(value) {
    const fallback = '/other';
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
}

function normalizeServerInput(input, index) {
    const id = typeof input.id === 'string' && input.id.trim().length
        ? input.id.trim()
        : `srv_${Date.now()}_${index}`;
    const name = typeof input.name === 'string' && input.name.trim().length
        ? input.name.trim().substring(0, 32)
        : `Server ${index + 1}`;
    return {
        id,
        name,
        path: sanitizePath(input.path),
        capacity: Number(input.capacity) || undefined,
        count: Number(input.count) || 0
    };
}

function cloneTopology(serverList) {
    return serverList.map((srv) => ({
        id: srv.id,
        name: srv.name,
        path: srv.path,
        capacity: srv.capacity
    }));
}

function pushRecentRequestKey(requestId) {
    recentRequestKeys.push(requestId);
    if (recentRequestKeys.length > RECENT_REQUEST_LIMIT) {
        recentRequestKeys.shift();
    }
}

function getRehashSampleKeys() {
    const unique = new Set();
    for (let i = recentRequestKeys.length - 1; i >= 0 && unique.size < 200; i--) {
        unique.add(recentRequestKeys[i]);
    }
    while (unique.size < 140) {
        unique.add(`synthetic-key-${unique.size}`);
    }
    return Array.from(unique);
}

function toServerSnapshot(serverState) {
    const loadPct = serverState.capacity
        ? Math.min(100, (serverState.currentLoad / serverState.capacity) * 100)
        : 0;
    return {
        id: serverState.id,
        name: serverState.name,
        path: serverState.path,
        count: serverState.count,
        capacity: serverState.capacity,
        currentLoad: serverState.currentLoad,
        activeConnections: serverState.activeConnections,
        loadPct: Number(loadPct.toFixed(1))
    };
}

function getServerSnapshots() {
    return servers.map(toServerSnapshot);
}

function formatModeLabel() {
    if (currentMode === MODES.STATELESS) {
        return `Stateless (${statelessPolicy})`;
    }
    if (currentMode === MODES.MOD_N) {
        return 'Mod-N Hashing';
    }
    return 'Consistent Hashing';
}

function getModePayload() {
    return {
        mode: currentMode,
        statelessPolicy,
        label: formatModeLabel()
    };
}

function getRecentUniqueKeys(limit = 40) {
    const unique = new Set();
    const out = [];
    for (let i = recentRequestKeys.length - 1; i >= 0 && out.length < limit; i--) {
        const key = recentRequestKeys[i];
        if (!unique.has(key)) {
            unique.add(key);
            out.push(key);
        }
    }
    while (out.length < Math.min(limit, 20)) {
        out.push(`synthetic-key-${out.length}`);
    }
    return out.reverse();
}

function getActiveRehashOverlay(mode) {
    if (metrics.lastRehash.mode !== mode) {
        return {
            affectedPercent: 0,
            affectedRanges: []
        };
    }
    return {
        affectedPercent: metrics.lastRehash.affectedPercent,
        affectedRanges: metrics.lastRehash.affectedRanges
    };
}

function getHashMapSnapshot() {
    const ring = buildRing(servers);
    const keys = getRecentUniqueKeys();
    const keyMappings = [];

    if (isStatefulMode(currentMode) && servers.length) {
        for (const key of keys) {
            keyMappings.push({
                requestId: key,
                hash: hashToRing(key),
                target: getServerIdForStatefulMode(currentMode, key, servers)
            });
        }
    }

    const overlay = getActiveRehashOverlay(currentMode);
    return {
        mode: currentMode,
        statelessPolicy,
        virtualNodesPerServer,
        ring,
        keyMappings,
        affectedRanges: overlay.affectedRanges,
        rehashImpact: overlay.affectedPercent
    };
}

function avg(values) {
    if (!values.length) return 0;
    const total = values.reduce((sum, item) => sum + item, 0);
    return total / values.length;
}

function getMetricsSnapshot() {
    return {
        totalRequests: metrics.totalRequests,
        lastRehash: {
            mode: metrics.lastRehash.mode,
            reason: metrics.lastRehash.reason,
            affectedPercent: Number(metrics.lastRehash.affectedPercent.toFixed(2)),
            movedKeys: metrics.lastRehash.movedKeys,
            totalKeys: metrics.lastRehash.totalKeys
        },
        migrationCostComparison: {
            modN: Number(avg(metrics.rehashHistory[MODES.MOD_N]).toFixed(2)),
            consistent: Number(avg(metrics.rehashHistory[MODES.CONSISTENT]).toFixed(2))
        },
        servers: getServerSnapshots()
    };
}

function emitStateSnapshots() {
    io.emit('servers_updated', getServerSnapshots());
    io.emit('hash_map_update', getHashMapSnapshot());
    io.emit('metrics_update', getMetricsSnapshot());
}

function computeAffectedRanges(mode, oldServers, newServers, oldVNodeCount = virtualNodesPerServer, newVNodeCount = virtualNodesPerServer) {
    if (mode === MODES.MOD_N) {
        return [{ start: 0, end: 359.999 }];
    }
    if (mode !== MODES.CONSISTENT) {
        return [];
    }

    const oldRing = buildRing(oldServers, oldVNodeCount);
    const newRing = buildRing(newServers, newVNodeCount);
    if (!oldRing.length || !newRing.length) {
        return [{ start: 0, end: 359.999 }];
    }

    const oldVNodeKeys = new Set(oldRing.map((node) => node.vnodeKey));
    const newVNodeKeys = new Set(newRing.map((node) => node.vnodeKey));

    const addedVNodes = newRing.filter((node) => !oldVNodeKeys.has(node.vnodeKey));
    const removedVNodes = oldRing.filter((node) => !newVNodeKeys.has(node.vnodeKey));
    const ranges = [];

    for (const vnode of addedVNodes) {
        const idx = newRing.findIndex((node) => node.vnodeKey === vnode.vnodeKey);
        if (idx !== -1) {
            const prev = newRing[(idx - 1 + newRing.length) % newRing.length];
            const curr = vnode;
            ranges.push({
                start: (prev.hash + 0.01) % 360,
                end: curr.hash,
                serverId: curr.serverId,
                vnodeIndex: curr.vnodeIndex
            });
        }
    }

    for (const vnode of removedVNodes) {
        const idx = oldRing.findIndex((node) => node.vnodeKey === vnode.vnodeKey);
        if (idx !== -1) {
            const prev = oldRing[(idx - 1 + oldRing.length) % oldRing.length];
            const curr = vnode;
            ranges.push({
                start: (prev.hash + 0.01) % 360,
                end: curr.hash,
                serverId: curr.serverId,
                vnodeIndex: curr.vnodeIndex
            });
        }
    }

    return ranges;
}

function computeRehashImpact(mode, oldServers, newServers, reason, oldVNodeCount = virtualNodesPerServer, newVNodeCount = virtualNodesPerServer) {
    if (!isStatefulMode(mode)) {
        return {
            mode,
            reason,
            affectedPercent: 0,
            movedKeys: 0,
            totalKeys: 0,
            affectedRanges: [],
            changedSamples: [],
            timestamp: Date.now()
        };
    }

    const keys = getRehashSampleKeys();
    const oldNames = new Map(oldServers.map((srv) => [srv.id, srv.name]));
    const newNames = new Map(newServers.map((srv) => [srv.id, srv.name]));
    const changedSamples = [];
    let moved = 0;

    for (const key of keys) {
        const oldServer = getServerIdForStatefulMode(mode, key, oldServers, oldVNodeCount);
        const newServer = getServerIdForStatefulMode(mode, key, newServers, newVNodeCount);
        if (oldServer !== newServer) {
            moved += 1;
            if (changedSamples.length < 40) {
                changedSamples.push({
                    requestId: key,
                    from: oldServer,
                    to: newServer,
                    fromName: oldServer ? oldNames.get(oldServer) : null,
                    toName: newServer ? newNames.get(newServer) : null,
                    hash: hashToRing(key)
                });
            }
        }
    }

    const affectedPercent = keys.length
        ? (moved / keys.length) * 100
        : 0;

    return {
        mode,
        reason,
        affectedPercent,
        movedKeys: moved,
        totalKeys: keys.length,
        affectedRanges: computeAffectedRanges(mode, oldServers, newServers, oldVNodeCount, newVNodeCount),
        changedSamples,
        timestamp: Date.now()
    };
}

function computeModeSwitchImpact(fromMode, toMode, topology) {
    if (!isStatefulMode(fromMode) || !isStatefulMode(toMode) || !topology.length) {
        return null;
    }
    const keys = getRehashSampleKeys();
    const names = new Map(topology.map((srv) => [srv.id, srv.name]));
    const changedSamples = [];
    let moved = 0;

    for (const key of keys) {
        const fromServer = getServerIdForStatefulMode(fromMode, key, topology);
        const toServer = getServerIdForStatefulMode(toMode, key, topology);
        if (fromServer !== toServer) {
            moved += 1;
            if (changedSamples.length < 40) {
                changedSamples.push({
                    requestId: key,
                    from: fromServer,
                    to: toServer,
                    fromName: fromServer ? names.get(fromServer) : null,
                    toName: toServer ? names.get(toServer) : null,
                    hash: hashToRing(key)
                });
            }
        }
    }

    const affectedPercent = keys.length ? (moved / keys.length) * 100 : 0;
    return {
        mode: toMode,
        reason: 'mode_switch',
        affectedPercent,
        movedKeys: moved,
        totalKeys: keys.length,
        affectedRanges: [{ start: 0, end: 359.999 }],
        changedSamples,
        timestamp: Date.now()
    };
}

function applyRehashEvent(rehashEvent) {
    if (!rehashEvent) return;
    metrics.lastRehash = rehashEvent;
    if (rehashEvent.mode === MODES.MOD_N || rehashEvent.mode === MODES.CONSISTENT) {
        const history = metrics.rehashHistory[rehashEvent.mode];
        history.push(rehashEvent.affectedPercent);
        if (history.length > 30) {
            history.shift();
        }
    }
    io.emit('rehash_event', {
        ...rehashEvent,
        affectedPercent: Number(rehashEvent.affectedPercent.toFixed(2))
    });
}

function refreshServerLoad(serverState, now) {
    serverState.recentRequestTimes = serverState.recentRequestTimes.filter(
        (timestamp) => now - timestamp <= 1000
    );
    serverState.currentLoad = serverState.recentRequestTimes.length;
}

function resetServerStatistics() {
    servers.forEach((srv) => {
        srv.count = 0;
        srv.currentLoad = 0;
        srv.activeConnections = 0;
        srv.recentRequestTimes = [];
    });
    l4Index = 0;
    requestToServer.clear();
    recentRequestKeys.length = 0;
}

function generateRequestId(socketId, pathValue, providedId) {
    if (typeof providedId === 'string' && providedId.trim().length) {
        return providedId.trim().substring(0, 32);
    }
    const count = (clientRequestCounters.get(socketId) || 0) + 1;
    clientRequestCounters.set(socketId, count);
    const pathToken = pathValue.replace(/\//g, '') || 'root';
    const localityBucket = count % 14;
    return `${socketId.slice(0, 4)}-${pathToken}-${localityBucket}`;
}

function selectTargetServer(request) {
    if (!servers.length) {
        return {
            targetServer: null,
            requestHash: hashToRing(request.requestId)
        };
    }

    if (currentMode === MODES.STATELESS) {
        if (statelessPolicy === STATELESS_POLICIES.L7) {
            const matchedServers = servers.filter((srv) => srv.path === request.path);
            const pool = matchedServers.length ? matchedServers : servers;
            const randomIndex = Math.floor(Math.random() * pool.length);
            return {
                targetServer: pool[randomIndex],
                requestHash: hashToRing(request.requestId)
            };
        }

        const targetServer = servers[l4Index % servers.length];
        l4Index = (l4Index + 1) % servers.length;
        return {
            targetServer,
            requestHash: hashToRing(request.requestId)
        };
    }

    if (currentMode === MODES.MOD_N) {
        const index = hash32(request.requestId) % servers.length;
        return {
            targetServer: servers[index],
            requestHash: hashToRing(request.requestId)
        };
    }

    const requestHash = hashToRing(request.requestId);
    const ring = buildRing(servers);
    const serverId = locateRingServer(ring, requestHash);
    return {
        targetServer: servers.find((srv) => srv.id === serverId) || null,
        requestHash
    };
}

// Helper to get Local IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
const PORT = process.env.PORT || 3000;

// Priority: Environmental variable (for Tunnels) > Local IP
const mobileUrl = process.env.PUBLIC_URL || `http://${localIP}:${PORT}`;

console.log(`Setting up QR code for: ${mobileUrl}`);

let qrCodeDataUrl = '';
QRCode.toDataURL(mobileUrl).then(url => {
    qrCodeDataUrl = url;
}).catch(err => console.error(err));

setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const srv of servers) {
        const before = srv.currentLoad;
        refreshServerLoad(srv, now);
        if (before !== srv.currentLoad) {
            changed = true;
        }
    }
    if (changed) {
        io.emit('servers_updated', getServerSnapshots());
        io.emit('metrics_update', getMetricsSnapshot());
    }
}, 1000);

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send initial state to the client
    socket.emit('initial_state', {
        mode: currentMode,
        statelessPolicy,
        virtualNodesPerServer,
        modeLabel: formatModeLabel(),
        servers: getServerSnapshots(),
        qrCode: qrCodeDataUrl,
        mobileUrl: mobileUrl,
        hashMap: getHashMapSnapshot(),
        metrics: getMetricsSnapshot(),
        lastRehash: {
            ...metrics.lastRehash,
            affectedPercent: Number(metrics.lastRehash.affectedPercent.toFixed(2))
        }
    });

    // Dashboard config
    socket.on('switch_mode', (payload) => {
        const oldMode = currentMode;
        const oldPolicy = statelessPolicy;
        const oldTopology = cloneTopology(servers);

        const requestedMode = typeof payload === 'string'
            ? payload
            : payload && typeof payload.mode === 'string'
                ? payload.mode
                : currentMode;

        if (requestedMode === MODES.STATELESS || requestedMode === MODES.MOD_N || requestedMode === MODES.CONSISTENT) {
            currentMode = requestedMode;
        }

        if (payload && typeof payload.statelessPolicy === 'string') {
            if (payload.statelessPolicy === STATELESS_POLICIES.L4 || payload.statelessPolicy === STATELESS_POLICIES.L7) {
                statelessPolicy = payload.statelessPolicy;
            }
        }

        console.log(`Load Balancer switched to ${formatModeLabel()}.`);
        io.emit('mode_changed', getModePayload());

        const switchedMode = oldMode !== currentMode || oldPolicy !== statelessPolicy;
        if (switchedMode) {
            resetServerStatistics();
            const modeSwitchRehash = computeModeSwitchImpact(oldMode, currentMode, oldTopology);
            applyRehashEvent(modeSwitchRehash);
        }

        emitStateSnapshots();
    });

    socket.on('set_virtual_nodes', (payload) => {
        const rawValue = typeof payload === 'number'
            ? payload
            : payload && Object.prototype.hasOwnProperty.call(payload, 'k')
                ? payload.k
                : NaN;

        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) return;

        const nextValue = normalizeVirtualNodeCount(Math.round(parsed));
        if (nextValue === virtualNodesPerServer) {
            socket.emit('virtual_nodes_changed', { k: virtualNodesPerServer });
            return;
        }

        const oldTopology = cloneTopology(servers);
        const previousK = virtualNodesPerServer;
        virtualNodesPerServer = nextValue;

        console.log(`Virtual nodes per server set to ${virtualNodesPerServer}.`);

        const rehashEvent = computeRehashImpact(
            currentMode,
            oldTopology,
            oldTopology,
            'vnode_count_changed',
            previousK,
            virtualNodesPerServer
        );
        applyRehashEvent(rehashEvent);
        io.emit('virtual_nodes_changed', { k: virtualNodesPerServer, previousK });
        emitStateSnapshots();
    });

    socket.on('update_servers', (newServers) => {
        const normalizedInput = Array.isArray(newServers)
            ? newServers.map(normalizeServerInput)
            : [];

        const oldServers = servers;
        const oldTopology = cloneTopology(oldServers);
        const previousById = new Map(oldServers.map((srv) => [srv.id, srv]));

        servers = normalizedInput.map((srvInput) => {
            const previous = previousById.get(srvInput.id);
            return createServerState(srvInput, previous);
        });

        const oldIds = new Set(oldServers.map((srv) => srv.id));
        const newIds = new Set(servers.map((srv) => srv.id));
        const addedServers = servers.filter((srv) => !oldIds.has(srv.id));
        const removedServers = oldServers.filter((srv) => !newIds.has(srv.id));

        for (const added of addedServers) {
            io.emit('server_added', toServerSnapshot(added));
        }
        for (const removed of removedServers) {
            io.emit('server_removed', { id: removed.id, name: removed.name });
        }

        const reason = addedServers.length && !removedServers.length
            ? 'server_added'
            : removedServers.length && !addedServers.length
                ? 'server_removed'
                : 'topology_changed';

        const rehashEvent = computeRehashImpact(currentMode, oldTopology, cloneTopology(servers), reason);
        applyRehashEvent(rehashEvent);

        console.log('Servers updated:', servers.length);
        emitStateSnapshots();
    });

    socket.on('reset_counters', () => {
        resetServerStatistics();
        console.log('Server counters reset.');
        emitStateSnapshots();
    });

    socket.on('set_public_url', (url) => {
        QRCode.toDataURL(url).then(dataUrl => {
            io.emit('url_updated', { url: url, qrCode: dataUrl });
        }).catch(err => console.error(err));
    });

    // Mobile phones send traffic
    socket.on('send_request', (data) => {
        const now = Date.now();
        let userMessage = null;
        const pathValue = sanitizePath(data.path);

        // Check cooldown if message provided
        if (data.message && data.message.trim().length > 0) {
            const lastTime = messageCooldowns.get(socket.id) || 0;
            if (now - lastTime < COOLDOWN_MS) {
                // Cooldown active - silent reject of message or you could notify client
                userMessage = null;
            } else {
                // Take only the first word, max 12 chars
                userMessage = data.message.trim().split(/\s+/)[0].substring(0, 12);
                messageCooldowns.set(socket.id, now);
            }
        }

        const requestId = generateRequestId(socket.id, pathValue, data.requestId);
        const request = {
            sequence: requestSequence,
            requestId,
            clientId: socket.id,
            path: pathValue,
            timestamp: now
        };
        requestSequence += 1;
        pushRecentRequestKey(requestId);

        io.emit('request_generated', {
            mode: currentMode,
            statelessPolicy,
            request
        });

        const { targetServer, requestHash } = selectTargetServer(request);

        if (servers.length === 0) {
            io.emit('route_update', {
                request,
                requestId,
                requestHash,
                path: pathValue,
                target: null,
                targetName: 'Dropped',
                mode: currentMode,
                statelessPolicy,
                clientId: socket.id,
                message: userMessage,
                latencySeconds: 0,
                cacheHit: false,
                migrated: false,
                previousServerId: null,
                servers: getServerSnapshots()
            });
            return;
        }

        const previousServerId = requestToServer.get(requestId) || null;
        const cacheHit = false;
        const latencySeconds = 0;
        const migrated = Boolean(previousServerId && previousServerId !== targetServer.id);

        if (targetServer) {
            requestToServer.set(requestId, targetServer.id);
            targetServer.count = (targetServer.count || 0) + 1;
            targetServer.recentRequestTimes.push(now);
            refreshServerLoad(targetServer, now);
        }

        metrics.totalRequests += 1;

        io.emit('latency_update', {
            requestId,
            sequence: request.sequence,
            mode: currentMode,
            target: targetServer ? targetServer.id : null,
            latencySeconds,
            cacheHit,
            migrated,
            previousServerId
        });

        // Send to presenter dashboard
        io.emit('route_update', {
            request,
            requestId,
            requestHash,
            path: pathValue,
            target: targetServer ? targetServer.id : null,
            targetName: targetServer ? targetServer.name : 'Unknown',
            mode: currentMode,
            statelessPolicy,
            clientId: socket.id,
            message: userMessage,
            latencySeconds,
            cacheHit,
            migrated,
            previousServerId,
            servers: getServerSnapshots()
        });

        io.emit('hash_map_update', getHashMapSnapshot());
        io.emit('metrics_update', getMetricsSnapshot());
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        messageCooldowns.delete(socket.id);
        clientRequestCounters.delete(socket.id);
        io.emit('client_disconnected', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Simulation running on http://${localIP}:${PORT}`);
});
