# L4-L7 Stateful Load Balancer Simulation

## Demo Description
This project is a real-time, interactive network simulation designed for live demonstrations of modern load-balancing behavior. It combines a presenter dashboard with animated topology visuals and a mobile traffic generator used by participants. The demo goes beyond basic L4/L7 routing by implementing stateful hashing modes, dynamic backend scaling, and measurable rehash impact, so viewers can observe both routing correctness and disruption cost when the cluster changes.

The presenter view acts as a control plane and observability panel. You can switch routing strategies during runtime, add or remove backend servers, tune the virtual node count for consistent hashing, and watch key migration effects immediately. The mobile page acts as a distributed client emulator, allowing users to generate request bursts across multiple URL paths and see per-request routing outcomes in real time.

## Implemented Simulation Mechanisms

### 1. Multi-Mode Routing Engine
- Stateless mode with two policies:
- L4 policy: round-robin request distribution across all active servers.
- L7 policy: path-aware routing where requests are first matched to servers advertising that path, with fallback to all servers if no path-specific match exists.
- Stateful mode with two hashing strategies:
- Mod-N hashing: request key hash modulo active server count.
- Consistent hashing: request key mapped to a ring, routed to the first clockwise virtual node.
- Live mode switching through Socket.IO events without restarting the process.
- Automatic state reset on mode changes so counters and comparisons remain meaningful between strategies.

### 2. Consistent Hashing with Configurable Virtual Nodes
- Each physical server is expanded into k virtual nodes (default 10, configurable from 1 to 256).
- Virtual node identities use deterministic keys in the form serverId::vnodeIndex.
- Ring positions are computed from a 32-bit hash derived from SHA-256.
- Ring is sorted to support clockwise successor lookup.
- Runtime k updates trigger immediate ring rebuild and rehash recalculation.

### 3. Rehash Impact and Migration Analytics
- Rehash is calculated for all stateful transitions:
- Server added.
- Server removed.
- General topology updates.
- Virtual node count changes.
- Stateful mode-to-mode switches.
- Impact model compares old and new assignment results over a sample key set built from recent real request IDs plus synthetic keys for statistical stability.
- Emits detailed event payloads including:
- affectedPercent (share of moved keys).
- movedKeys and totalKeys.
- affectedRanges on the hash ring.
- changedSamples (up to 40 key-level migration examples with from/to server mapping).
- Maintains rolling rehash history per mode (Mod-N and Consistent) and reports average migration cost for side-by-side comparison.

### 4. Server State and Load Model
- Each backend server tracks:
- Total routed request count.
- Capacity.
- Current instantaneous load (sliding 1-second request window).
- Active connections field for extensibility.
- Server load is refreshed every second by pruning old request timestamps.
- Full server snapshots are emitted to all clients after relevant events.

### 5. Request Identity, Affinity, and Migration Detection
- Request IDs can be supplied by clients or generated deterministically from socket identity, path token, and locality bucket.
- Previous request-to-server mappings are stored, enabling migration detection when the same request ID is reassigned after topology or policy shifts.
- Route payloads include migration flags and previous server IDs for visual emphasis.

### 6. Real-Time Visual Simulation Layer
- High-DPI canvas renderer with responsive geometry.
- Animated packet flow lifecycle:
- Client edge to load balancer.
- Load balancer to target backend.
- Drop path when no servers are available.
- Color encoding:
- Blue for normal routing.
- Red for migrated/rehash-affected routing.
- Hash-ring rendering behavior:
- Consistent mode: virtual node markers around ring.
- Mod-N mode: sectorized ring to illustrate partitioning.
- Rehash flash overlays that highlight affected ring segments for a fixed visibility window.
- Migration burst animations that draw key movement trajectories between old and new target servers.

### 7. Live Metrics and Comparative Cost Dashboard
- Total request counter.
- Active server count.
- Rehash impact label with current affected percentage.
- Comparative migration-cost bars:
- Average Mod-N disruption.
- Average Consistent-hashing disruption.
- Continuous updates streamed via metrics events.

### 8. Interactive Topology Management
- Add backend servers dynamically from the presenter UI.
- Remove servers instantly from the live list.
- Reset counters on demand.
- All topology operations broadcast updates to every connected client in real time.

### 9. Mobile Traffic Generator
- Path-specific request buttons for /api, /images, /admin, /video, and /other.
- Auto-load mode that sends recurring mixed-path bursts to simulate heavy traffic.
- Client-local activity log with per-request route result feedback.
- Optional user message channel:
- First token extraction.
- Length cap.
- Server-enforced cooldown (5 seconds per client) to avoid message spam.

### 10. Session Discovery and Public Access Support
- Automatic local-network URL generation.
- QR code generation for quick mobile onboarding.
- Runtime tunnel/public URL update endpoint that regenerates the QR code and updates all clients.

### 11. Event-Driven Architecture
- Express serves static presenter/mobile interfaces.
- Socket.IO powers bidirectional synchronization for:
- initial_state.
- mode_changed.
- route_update.
- hash_map_update.
- rehash_event.
- metrics_update.
- servers_updated.
- virtual_nodes_changed.
- url_updated.
- This event model keeps control plane actions, data plane simulation, and visual telemetry tightly synchronized.

### 12. Edge-Case Handling and Input Normalization
- Safe path sanitization with /other fallback.
- Robust server-input normalization for IDs, names, and paths.
- No-server scenario handling with explicit dropped-route visualization.
- Cooldown and truncation logic for user-submitted message overlays.

## Setup Instructions

Since this repository does not include node_modules, install dependencies before running.

### 1. Clone the project
```bash
git clone <your-repo-url>
cd L4-L7-simulation
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the server
```bash
node server.js
```

### 4. Enable public access (optional)
Use a tunnel so external mobile devices can join:
```bash
npx localtunnel --port 3000
```

## Suggested Demo Narrative
1. Start in Stateless L4 and generate traffic to show even round-robin behavior.
2. Switch to Stateless L7 and send mixed paths to show application-aware routing.
3. Switch to Mod-N and add a server to show high rehash disruption.
4. Switch to Consistent Hashing, repeat the same topology change, and compare migration impact bars.
5. Increase virtual node count k and observe smoother key distribution and changed migration profile.
