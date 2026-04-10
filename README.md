# L4 / L7 Load Balancer Simulation

A real-time, interactive simulation of Layer 4 and Layer 7 load balancing. This tool provides a visual dashboard for presenters and a mobile interface for attendees to generate traffic.

## Setup Instructions

Since this repository does not include the `node_modules` folder, you must install the dependencies yourself before running.

### 1. Clone the project
```bash
git clone <your-repo-url>
cd "L4 L7 simulation"
```

### 2. Install Dependencies
Run this command in your terminal. It reads the `package.json` file and downloads everything needed (Express, Socket.io, etc.):
```bash
npm install
```

### 3. Run the Server
```bash
node server.js
```

### 4. Public Access (Tunneling)
If you want others to join from mobile devices outside your network, use **ngrok** or **localtunnel**:
```bash
npx localtunnel --port 3000
```

## Features
- **Round Robin (L4)**: Traffic is distributed based on connections, ignoring application paths.
- **Path-based Routing (L7)**: Requests are routed based on URL paths (`/api`, `/images`, etc.).
- **Live Visualization**: See packets move across the network in real-time.
- **Mobile Controller**: Scan the on-screen QR code to turn your phone into a traffic generator.
