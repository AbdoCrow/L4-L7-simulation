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

// Load Balancer State
let currentMode = 'L4';
let l4Index = 0;

// Dynamic servers setup
let servers = [
    { id: 'srv_1', name: 'Server A', path: '/api', count: 0 },
    { id: 'srv_2', name: 'Server B', path: '/images', count: 0 },
    { id: 'srv_3', name: 'Server C', path: '/admin', count: 0 }
];

// Cooldown tracker (socket.id -> timestamp)
const messageCooldowns = new Map();
const COOLDOWN_MS = 5000;

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

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send initial state to the client
    socket.emit('initial_state', {
        mode: currentMode,
        servers: servers,
        qrCode: qrCodeDataUrl,
        mobileUrl: mobileUrl
    });

    // Dashboard config
    socket.on('switch_mode', (mode) => {
        currentMode = mode;
        console.log(`Load Balancer switched to ${currentMode} mode.`);
        io.emit('mode_changed', currentMode);
    });

    socket.on('update_servers', (newServers) => {
        servers = newServers;
        console.log('Servers updated:', servers.length);
        io.emit('servers_updated', servers);
    });

    socket.on('reset_counters', () => {
        servers.forEach(s => s.count = 0);
        console.log('Server counters reset.');
        io.emit('servers_updated', servers);
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

        let targetServer = null;

        if (servers.length === 0) {
            io.emit('route_update', {
                path: data.path,
                target: null,
                targetName: 'Dropped',
                mode: currentMode,
                clientId: socket.id,
                message: userMessage
            });
            return;
        }

        if (currentMode === 'L4') {
            targetServer = servers[l4Index % servers.length];
            l4Index = (l4Index + 1) % servers.length;
        } 
        else if (currentMode === 'L7') {
            let matchedServers = servers.filter(s => s.path === data.path);
            if (matchedServers.length > 0) {
                targetServer = matchedServers[Math.floor(Math.random() * matchedServers.length)];
            } else {
                targetServer = servers[Math.floor(Math.random() * servers.length)];
            }
        }

        // Increment count
        if (targetServer) {
            targetServer.count = (targetServer.count || 0) + 1;
        }

        // Send to presenter dashboard
        io.emit('route_update', {
            path: data.path,
            target: targetServer ? targetServer.id : null,
            targetName: targetServer ? targetServer.name : 'Unknown',
            mode: currentMode,
            clientId: socket.id,
            message: userMessage,
            servers: servers // Send dynamic snapshot of counts
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        io.emit('client_disconnected', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Simulation running on http://${localIP}:${PORT}`);
});
